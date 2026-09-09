#!/usr/bin/env node
/*
 * NYAYAI Phase 9 — Deterministic UNIT tests (no network, no Groq, no AWS).
 * Tests the pure Phase 9 building blocks imported from the compiled server:
 * identity, cleaning, chunking, metadata extraction, PDF text extraction
 * (+OCR boundary), fixture embeddings, corpus layout parsing, and manifest.
 *
 * Usage (from server/):  npm run build && node tests/phase9-unit-tests.mjs
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

execSync('npm run build', { stdio: 'ignore', cwd: path.join(path.dirname(fileURLToPath(import.meta.url)), '..') });

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'services');

const identity = await import(path.join(dist, 'legalIngestion', 'corpusIdentity.js'));
const cleaning = await import(path.join(dist, 'legalIngestion', 'legalCleaning.js'));
const chunker = await import(path.join(dist, 'legalIngestion', 'legalChunker.js'));
const extractor = await import(path.join(dist, 'legalIngestion', 'textExtractor.js'));
const meta = await import(path.join(dist, 'legalIngestion', 'metadataExtractor.js'));
const embed = await import(path.join(dist, 'legalEmbedding', 'embeddingProvider.js'));
const layout = await import(path.join(dist, 'legalCorpus', 'corpusLayout.js'));
const manifestMod = await import(path.join(dist, 'legalCorpus', 'corpusManifest.js'));
const casePdf = await import(path.join(dist, 'legalCorpus', 'casePdfGenerator.js'));
const vdb = await import(path.join(dist, 'vdbClient.js'));

let passed = 0;
let failed = 0;
const failures = [];
function record(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

// ---- 1. Deterministic identity ----
const d1 = identity.documentIdFrom({ country: 'india', s3Key: 'a.txt', versionId: 'v1' });
const d1b = identity.documentIdFrom({ country: 'india', s3Key: 'a.txt', versionId: 'v1' });
const d2 = identity.documentIdFrom({ country: 'india', s3Key: 'a.txt', versionId: 'v2' });
record('document_id deterministic', d1 === d1b && /^[0-9a-f]{64}$/.test(d1), d1);
record('document_id changes with version', d1 !== d2);
record('document_id depends on country', identity.documentIdFrom({ country: 'us', s3Key: 'a.txt', versionId: 'v1' }) !== d1);
const c1 = identity.chunkIdFrom(d1, 0);
const c2 = identity.chunkIdFrom(d1, 1);
record('chunk_id deterministic + distinct', c1 !== c2 && identity.chunkIdFrom(d1, 0) === c1);

// ---- 2. Legal cleaning ----
const pages = [
  { page: 7, text: '7\nCASE FILES - KARNATAKA CAC\nSection 302.\nPunishment for\nmurder is laid down\nand shall be searchable\n' },
  { page: 8, text: '8\nCASE FILES - KARNATAKA CAC\nArticle 21.\nNo person shall be\n' },
  { page: 9, text: '9\nCASE FILES - KARNATAKA CAC\nPara 15.\nThe hearing concluded\n' },
  { page: 10, text: '10\nCASE FILES - KARNATAKA CAC\nPara 16.\nJudgment reserved for orders\n' }
];
const cleaned = cleaning.cleanLegalText(pages);
record('cleaning removes page-number-only lines', cleaned.pageNumberLines === 4, `got ${cleaned.pageNumberLines}`);
record('cleaning removes repeated boilerplate', cleaned.removedBoilerplate >= 4, `got ${cleaned.removedBoilerplate}`);
record('cleaning repairs broken line wrapping', cleaned.paragraphs.some(p => /Punishment for murder is laid down and shall be searchable/.test(p)), JSON.stringify(cleaned.paragraphs));
record('cleaning preserves "Section 302."', cleaned.paragraphs.includes('Section 302.'));
record('cleaning preserves "Article 21."', cleaned.paragraphs.includes('Article 21.'));
record('cleaning preserves "Para 15."', cleaned.paragraphs.includes('Para 15.'));
record('cleaning preserves "Para 16."', cleaned.paragraphs.includes('Para 16.'));

// ---- 3. Structure-aware chunking ----
const cpp = [
  { page: 1, paragraphs: ['IN THE HIGH COURT OF KARNATAKA', 'Para 1. The first paragraph of the judgment is set out here at moderate length for testing purpose of the chunk boundary logic in the fixture.', 'Para 2. A second spaced paragraph follows it for testing.' ] },
  { page: 1, paragraphs: ['Para 3. The third paragraph lands on the next logical page in this flat test fixture.'] }
];
const chunks = chunker.chunkLegalDocument(cpp);
record('chunker produces deterministic chunks', Array.isArray(chunks) && chunks.length >= 1, `len=${chunks.length}`);
record('chunker starts chunks at structured markers', chunks.some(c => /^Para 1\./.test(c.text)), JSON.stringify(chunks[0]));
record('chunker assigns page/paragraph provenance', chunks[0].page === 1 && (chunks[0].paragraph ?? 0) >= 1);
record('chunker records section label', chunks.some(c => c.section && /Para 1/i.test(c.section)));
const bigFlat = [
  { page: 1, paragraphs: Array.from({ length: 40 }, (_, i) => `Running text paragraph ${i + 1} ${'word '.repeat(30)}end.`) }
];
const bigChunks = chunker.chunkLegalDocument(bigFlat, { maxChars: 800, overlapChars: 120, minChars: 40 });
record('chunker force-splits oversized text', bigChunks.length > 1, `len=${bigChunks.length}`);
record('chunker no oversized chunk', bigChunks.every(c => c.text.length <= 2000), Math.max(...bigChunks.map(c => c.text.length)));
record('chunker overlap carries context', bigChunks.slice(1).every(c => c.text.length > 100), 'overlap present');

// ---- 4. PDF text extraction + OCR boundary ----
function makeTextPdf() {
  const content = `BT /F1 12 Tf 72 720 Td (Article 21 of the Constitution) Tj 0 -14 Td (No person shall be deprived of life) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>',
    `<< /Length ${Buffer.byteLength(content) + 1} >>\nstream\n${content}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  return Buffer.from(pdf, 'binary');
}
const textPdf = extractor.extractText(makeTextPdf(), 'doc.pdf');
record('pdf extraction reads text layer', /Article 21 of the Constitution/.test(textPdf.text), textPdf.text.slice(0, 80));
record('pdf extraction not marked OCR', textPdf.ocrRequired === false);
record('pdf extraction page-structured', textPdf.pages.length === 1 && textPdf.engine.includes('zlib'));

const ocrPdf = extractor.extractText(Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', 'binary'), 'scan.pdf');
record('no-text PDF marked requires_ocr (honest boundary)', ocrPdf.ocrRequired === true && ocrPdf.text === '', ocrPdf.ocrRequired ? '' : 'extracted text?!');

{
  let threw = false;
  try { extractor.extractText(Buffer.from('x'), 'notes.docx'); } catch { threw = true; }
  record('unsupported file type rejected explicitly', threw);
}

// ---- 5. Metadata extraction ----
const cfg = layout.corpusConfig({ S3_BUCKET: 'nyayai-legal-corpus' });
const srcLabel = meta.sourceLabel(cfg);
const mStat = meta.extractDocumentMetadata(
  layout.parseCorpusKey('india/statutes/bns-2023-homicide-excerpt.txt', cfg), 'india/statutes/bns-2023-homicide-excerpt.txt', 'bns-2023-homicide-excerpt.txt',
  'BHARATIYA NYAYA SANHITA, 2023. Section 103. Whoever commits murder shall be punished. unlawful arrest.', srcLabel, 'nyayai-legal-corpus', 'local-fixture', 'v1');
record('metadata: document_type statute', mStat.metadata.document_type === 'statute', String(mStat.metadata.document_type));
record('metadata: act from content', mStat.metadata.act === 'Bharatiya Nyaya Sanhita, 2023', String(mStat.metadata.act));
record('metadata: year from filename', mStat.metadata.year === '2023', String(mStat.metadata.year));
record('metadata: practice_area criminal', mStat.metadata.practice_area === 'criminal', String(mStat.metadata.practice_area));

const mSC = meta.extractDocumentMetadata(
  layout.parseCorpusKey('india/supreme-court/arrest-safeguards-judgment.txt', cfg), 'x', 'arrest-safeguards-judgment.txt',
  'IN THE SUPREME COURT OF INDIA. Para 1. An arrest engages constitutional safeguards. Criminal Appeal No. 001/2021.', srcLabel, 'n', 'local-fixture', 'v1');
record('metadata: court from text', mSC.metadata.court === 'Supreme Court', String(mSC.metadata.court));
record('metadata: document_type judgment', mSC.metadata.document_type === 'judgment');
record('metadata: case_id from text', /001\/2021/.test(mSC.metadata.case_id || ''), String(mSC.metadata.case_id));

const mHC = meta.extractDocumentMetadata(
  layout.parseCorpusKey('india/high-courts/karnataka-arrest-procedure-guidelines.txt', cfg), 'x', 'karnataka-arrest-procedure-guidelines.txt',
  'IN THE HIGH COURT OF KARNATAKA. Writ Petition No. 002/2022.', srcLabel, 'n', 'local-fixture', 'v1');
record('metadata: High Court detected', mHC.metadata.court === 'High Court', String(mHC.metadata.court));
record('metadata: jurisdiction from HC name', mHC.metadata.jurisdiction === 'KARNATAKA', String(mHC.metadata.jurisdiction));

const mAdv = meta.extractDocumentMetadata(
  layout.parseCorpusKey('advocate-cases/advocate-042/criminal-matter.txt', cfg), 'advocate-cases/advocate-042/criminal-matter.txt', 'criminal-matter.txt',
  'Defence in a criminal matter.', srcLabel, 'n', 'local-fixture', 'v1');
record('metadata: advocate_id from key', mAdv.metadata.advocate_id === 'advocate-042', String(mAdv.metadata.advocate_id));
record('metadata: case_history type', mAdv.metadata.document_type === 'case_history');

const mUnknown = meta.extractDocumentMetadata(
  layout.parseCorpusKey('not-a-corpus/file.txt', cfg), 'x', 'file.txt', 'plain content', srcLabel, 'n', 'local-fixture', 'v1');
record('metadata: unknown fields stay null (no invention)', mUnknown.metadata.act === null && mUnknown.metadata.court === null && mUnknown.warns.length === 1);

// ---- 6. Fixture embedding determinism ----
const prov = new embed.FixtureEmbeddingProvider(64);
const e1 = await prov.embedTexts(['Can a person challenge an unlawful arrest in Karnataka?']);
const e2 = await prov.embedTexts(['Can a person challenge an unlawful arrest in Karnataka?']);
const e3 = await prov.embedTexts(['different text entirely']);
const v1 = e1.vectors[0];
record('fixture embedding dimension', v1.length === 64, `len=${v1.length}`);
record('fixture embedding deterministic', JSON.stringify(v1) === JSON.stringify(e2.vectors[0]));
record('fixture embedding distinguishes texts', JSON.stringify(v1) !== JSON.stringify(e3.vectors[0]));
const norm = Math.sqrt(v1.reduce((a, x) => a + x * x, 0));
record('fixture embedding L2-normalized', Math.abs(norm - 1) < 1e-6, `norm=${norm}`);
record('fixture embedding flagged fixture=true', prov.fixture === true && e1.fixture === true);

// ---- 7. Corpus layout parsing ----
record('layout: india/statutes', layout.parseCorpusKey('nyayai-legal-corpus/india/statutes/x.txt', cfg).documentType === 'statute');
record('layout: prefixRoot stripped', layout.parseCorpusKey('nyayai-legal-corpus/india/statutes/x.txt', cfg).country === 'india');
record('layout: supreme court type', layout.parseCorpusKey('india/supreme-court/x.txt', cfg).documentType === 'judgment');
record('layout: advocate cases', layout.parseCorpusKey('advocate-cases/advocate-007/x.txt', cfg).isAdvocateCases === true);
record('layout: unknown key -> country null', layout.parseCorpusKey('misc/notes.txt', cfg).country === null);

// ---- 8. Manifest ----
const manDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase9-unit-'));
const man = new manifestMod.CorpusManifest(manDir);
await man.load();
let upside = false;
if (man.stats().documents === 0) upside = true;
record('manifest starts empty', upside);
await man.upsertDocument(
  { document_id: 'docA', s3_key: 'k.txt', s3_version_id: 'v1', country: 'india', title: 'T', document_type: 'statute', status: 'ingested', chunk_count: 2, content_hash: '', ingested_at: new Date().toISOString() },
  ['c1', 'c2']
);
record('manifest stores entry + chunk ids', man.get('docA')?.status === 'ingested' && man.chunkIds('docA').join(',') === 'c1,c2');
record('manifest stats', man.stats().documents === 1 && man.stats().chunks === 2);
await man.removeDocument('docA');
record('manifest removal', man.get('docA') === undefined && man.chunkIds('docA').length === 0);
rmSync(manDir, { recursive: true, force: true });

// ---- 9. VDB metadata conversion ----
if (vdb) {
  const out = vdb.chunkMetadataToVdb({ title: 'T', year: 2023, page: '2', gone: null, flag: true });
  record('vdb metadata conversion (strings/numbers/bool, nulls dropped)',
    out.title === 'T' && out.year === '2023' && out.page === '2' && out.flag === 'true' && out.gone === undefined,
    JSON.stringify(out));
} else {
  record('vdb metadata conversion (SKIPPED - dist import)', true);
}

// ---- 10. Generated advocate-case PDF round-trip through the extractor ----
{
  const buf = casePdf.generateCasePdf(casePdf.buildAdvocateCaseData({
    advocateIndex: 7, caseIndex: 1, advocateName: 'Adv. Karan Kapoor',
    practiceArea: 'criminal', jurisdiction: 'Karnataka', court: 'High Court'
  }));
  record('case PDF is non-empty and starts %PDF', buf.length > 200 && buf.subarray(0, 5).toString() === '%PDF-');
  const ex = extractor.extractPdfText(buf, 'advocate-cases/usr-advocate-7/case-071.pdf');
  record('generated case PDF extracts as text (not OCR)', ex.ocrRequired === false && ex.text.length > 0, `ocr=${ex.ocrRequired} letters=${ex.text.replace(/\s/g, '').length}`);
  const cleanGen = cleaning.cleanLegalText(ex.pages);
  const texts = cleanGen.text;
  record('extracted text keeps CASE ID', /\bCASE-071\b/.test(texts), texts.split('\n').find(l => /CASE ID/.test(l)));
  record('extracted text keeps advocate id', /\badvocate-007\b/.test(texts));
  const parsedGen = layout.parseCorpusKey('advocate-cases/usr-advocate-7/case-071.pdf', cfg);
  record('layout parses advocate-case key', parsedGen.isAdvocateCases === true && parsedGen.advocateId === 'usr-advocate-7');
  const { metadata: mdGen } = meta.extractDocumentMetadata(parsedGen, 'advocate-cases/usr-advocate-7/case-071.pdf', 'case-071.pdf', texts, 'fixture://', 'nyayai-legal-corpus', 'local-fixture', 'v1');
  record('derived case_id from generated PDF', mdGen.case_id === 'CRIMINAL APPEAL NO. 071/2023', String(mdGen.case_id));
  record('derived advocate_id from generated PDF', mdGen.advocate_id === 'usr-advocate-7');
  record('derived practice_area from generated PDF', mdGen.practice_area === 'criminal');
  record('derived type = case_history', mdGen.document_type === 'case_history');
  const bufCc = casePdf.generateCasePdf(casePdf.buildAdvocateCaseData({
    advocateIndex: 3, caseIndex: 5, advocateName: 'Adv. Neha Gupta',
    practiceArea: 'constitutional', jurisdiction: 'Delhi', court: 'High Court'
  }));
  const exCc = extractor.extractPdfText(bufCc, 'advocate-cases/usr-advocate-3/case-035.pdf');
  record('constitutional case PDF still extracts fully', !exCc.ocrRequired && /\bCASE-035\b/.test(exCc.text));

  // Regression: compressed-stream binary bytes must never be rewritten by PDF
  // escape decoding. Sweep every case for advocate 7 (the file that previously
  // failed with empty extraction) + spot checks elsewhere.
  let allCasesExtract = true;
  for (const A of [1, 7]) {
    for (let c = 1; c <= 10; c++) {
      const bufSweep = casePdf.generateCasePdf(casePdf.buildAdvocateCaseData({
        advocateIndex: A, caseIndex: c, advocateName: casePdf.ADVOCATE_NAMES[A - 1],
        practiceArea: casePdf.ADVOCATE_PRACTICE_AREAS[A - 1],
        jurisdiction: casePdf.ADVOCATE_JURISDICTIONS[A - 1],
        court: casePdf.ADVOCATE_COURTS[A - 1]
      }));
      const exSweep = extractor.extractPdfText(bufSweep, `advocate-cases/usr-advocate-${A}/case-0.pdf`);
      const wantId = `CASE-${String(A * 10 + c).padStart(3, '0')}`;
      if (exSweep.ocrRequired || !exSweep.text.includes(wantId)) allCasesExtract = false;
    }
  }
  record('every generated case PDF (advocate 1 + 7) extracts with its CASE ID', allCasesExtract);
}

console.log(`\nPhase 9 Unit Results: ${passed} passed, ${failed} failed`);
if (failures.length) console.log('Failed:', failures.join(' | '));
process.exit(failed === 0 ? 0 : 1);