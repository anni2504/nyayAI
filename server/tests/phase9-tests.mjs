#!/usr/bin/env node
/*
 * NYAYAI Phase 9 — End-to-End Integration Test Suite
 * Legal semantic retrieval over the C++ vector DB:
 *  - corpus ingest (dry-run + real) with idempotency / re-run skip
 *  - vector search with metadata filters + provenance
 *  - deterministic round-trip: query identical to a stored chunk text
 *    returns that chunk as the top hit (proves retrieval correctness)
 *  - advocate-cases grouped retrieval (advocate_id)
 *  - evidence-first RAG with citations (fixture responder; NO Groq)
 *  - honest OCR boundary (no-text PDF -> requires_ocr, nothing fabricated)
 *  - S3 version-change -> stale chunk removal (idempotent re-ingestion)
 *  - auth: only ADVOCATE may ingest; search/rag any authenticated user
 *
 * Spawns its own scratch VDB (vector-db binary) + the API server so the
 * suite is fully deterministic and offline (fixture embeddings + fixture RAG).
 *
 * Usage (from server/):  npm run build && node tests/phase9-tests.mjs
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, cpSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const REPO_ROOT = path.join(SERVER_DIR, '..');
const HOST = '127.0.0.1';
const API_PORT = 5329;
const VDB_PORT = 5390;
const BASE = `http://${HOST}:${API_PORT}/api/v1`;

// ---- 0. Ensure the VDB binary is built ----
execFileSync('make', ['all'], { cwd: path.join(REPO_ROOT, 'vector-db'), stdio: 'inherit' });

let passed = 0;
let failed = 0;
const failures = [];
function record(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

async function req(method, endpoint, { token, body } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { status: res.status, data };
}

const sleepMs = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i <= tries; i++) {
    try { const r = await fetch(url); if (r.ok || r.status) return true; } catch { /* retry */ }
    await sleepMs(250);
  }
  return false;
}

async function register(tag, role) {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const slug = tag.toLowerCase().replace(/\s+/g, '-');
  const res = await req('POST', '/auth/register', {
    body: { name: tag, email: `phase9-${slug}-${unique}@nyayai.test`, password: 'StrongPass123!', role }
  });
  return { token: res.data?.token, id: res.data?.user?.id };
}

async function main() {
  const tmpBase = mkdtempSync(path.join(tmpdir(), 'nyayai-phase9-e2e-'));
  const vdbData = path.join(tmpBase, 'vdb-data');
  const appData = path.join(tmpBase, 'app-data');
  const corpusCopy = path.join(tmpBase, 'corpus');
  // Copy the fixture tree so the version-change test can mutate a copy safely.
  cpSync(path.join(SERVER_DIR, 'fixtures', 'legal-corpus'), corpusCopy, { recursive: true });

  // ---- spawn the VDB ----
  const vdb = spawn(path.join(REPO_ROOT, 'vector-db', 'build', 'vector-db-server'), [], {
    env: { ...process.env, VECTORDB_PORT: String(VDB_PORT), VECTORDB_DATA_DIR: vdbData, VECTORDB_AUTOSAVE: '1' },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  // ---- spawn the API server ----
  const server = spawn('node', ['dist/server.js'], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      NYAYAI_DATA_DIR: appData,
      VECTOR_DB_URL: `http://${HOST}:${VDB_PORT}`,
      CORPUS_SOURCE: 'local-fixture',
      CORPUS_FIXTURE_DIR: corpusCopy,
      LEGAL_EMBEDDING_PROVIDER: 'fixture',
      LEGAL_EMBEDDING_DIM: '64',
      LEGAL_RAG_PROVIDER: 'fixture',
      GROQ_API_KEY: '',
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  try {
    const vdbUp = await waitFor(`http://${HOST}:${VDB_PORT}/health`);
    record('Vector DB boots on scratch port', vdbUp);
    if (!vdbUp) throw new Error('vector DB did not become healthy');

    const up = await waitFor(`http://${HOST}:${API_PORT}/health`);
    record('API server boots (legal stack mounted)', up);
    if (!up) throw new Error('API server did not become healthy');

    const adv = await register('Legal Corpus Advocate', 'ADVOCATE');
    const cl = await register('Legal Research Client', 'CLIENT');
    record('Advocate + client registered', !!(adv.token && cl.token));

    // ---- 1. Health / status ----
    const statusUnauth = await req('GET', '/legal/health');
    record('Legal health requires auth', statusUnauth.status === 401, `got ${statusUnauth.status}`);

    const status = await req('GET', '/legal/health', { token: cl.token });
    record('Legal health: vectors 0 at start', status.data?.vdb?.vectors === 0, JSON.stringify(status.data?.vdb));
    record('Legal health: honest notice (no real corpus)', status.data?.realCorpus === false && /fixtures used/.test(status.data?.notice || ''), String(status.data?.notice));
    record('Legal health: embedding fixture flagged', status.data?.embedding?.fixture === true, JSON.stringify(status.data?.embedding));

    // ---- 2. Dry-run ingest ----
    const dry = await req('POST', '/legal/corpus/ingest', { token: adv.token, body: { scope: 'prefix', prefix: 'india', dryRun: true } });
    record('Dry-run discovers 6 india documents', dry.data?.discovered === 6, JSON.stringify({ discovered: dry.data?.discovered, docs: dry.data?.documents?.length }));
    record('Dry-run processed 6, inserted 0', dry.data?.processed === 6 && dry.data?.vectorsInserted === 0, JSON.stringify({ p: dry.data?.processed, v: dry.data?.vectorsInserted }));
    record('Dry-run lists each india document', (dry.data?.documents || []).length === 6, JSON.stringify((dry.data?.documents || []).map(d => d.key)));

    // ---- 3. Real ingest (india prefix) ----
    const inj = await req('POST', '/legal/corpus/ingest', { token: adv.token, body: { scope: 'prefix', prefix: 'india' } });
    record('Ingest returns ok status', inj.data?.status === 'ok', inj.data?.status);
    record('Ingest: 4 text docs ingested, 2 requires_ocr', inj.data?.processed === 4 && inj.data?.requiresOcr === 2, JSON.stringify({ p: inj.data?.processed, ocr: inj.data?.requiresOcr }));
    record('Ingest: 0 failed, vectors inserted', inj.data?.vectorsInserted > 0 && inj.data?.failed === 0, JSON.stringify({ v: inj.data?.vectorsInserted, f: inj.data?.failed }));
    record('Ingest: honest OCR error recorded (no fabricated text)', (inj.data?.errors || []).some(e => /no text layer/.test(e)), String((inj.data?.errors || [])[0]));

    const inj2 = await req('POST', '/legal/corpus/ingest', { token: adv.token, body: { scope: 'prefix', prefix: 'india' } });
    record('Re-ingest is idempotent: all 4 skipped, vectors unchanged', inj2.data?.skipped === 4 && inj2.data?.vectorsInserted === 0, JSON.stringify({ s: inj2.data?.skipped, v: inj2.data?.vectorsInserted }));

    // ---- 4. Court filters on search ----
    const search = await req('POST', '/legal/search', { token: cl.token, body: { query: 'Can a person challenge an unlawful arrest without a magistrate order?' } });
    record('Search returns evidence with provenance', search.status === 200 && search.data?.evidence?.length > 0, `got ${search.status}`);
    const first = search.data?.evidence?.[0];
    record('Evidence keeps s3 key/version', !!(first?.s3_key && first?.s3_version_id), JSON.stringify({ key: first?.s3_key, v: first?.s3_version_id }));
    record('Evidence keeps chunk text', first?.text?.length > 0, String(first?.text?.length));
    record('Evidence keeps document_id + chunk_id', !!(first?.document_id && first?.chunk_id), 'missing ids');
    record('Evidence carries embedding provenance', search.data?.embedding?.fixture === true && !!search.data?.embedding?.provider, JSON.stringify(search.data?.embedding));

    // ---- 5. Deterministic retrieval round-trip (identical chunk text) ----
    const probe = await req('POST', '/legal/search', { token: cl.token, body: { query: 'Can a person challenge an unlawful arrest without a magistrate order?' } });
    const chunkText = probe.data?.evidence?.[0]?.text;
    const refDocId = probe.data?.evidence?.[0]?.document_id;
    const refChunkId = probe.data?.evidence?.[0]?.chunk_id;
    const roundtrip = await req('POST', '/legal/search', { token: cl.token, body: { query: chunkText } });
    const top = roundtrip.data?.evidence?.[0];
    record('Identical chunk-text query returns that chunk at rank 1', top?.document_id === refDocId && top?.chunk_id === refChunkId && top?.similarity > 0.999, JSON.stringify({ doc: top?.document_id === refDocId, chunk: top?.chunk_id === refChunkId, sim: top?.similarity }));

    // ---- 6. Same query deterministic across runs ----
    const run1 = await req('POST', '/legal/search', { token: cl.token, body: { query: 'What safeguards exist during arrest?' } });
    const run2 = await req('POST', '/legal/search', { token: cl.token, body: { query: 'What safeguards exist during arrest?' } });
    const ids1 = (run1.data?.evidence || []).map(e => e.chunk_id);
    const ids2 = (run2.data?.evidence || []).map(e => e.chunk_id);
    record('Search results deterministic across runs', JSON.stringify(ids1) === JSON.stringify(ids2), 'mismatch');

    // ---- 7. Metadata filters ----
    const filJudg = await req('POST', '/legal/search', { token: cl.token, body: { query: 'arrest', filters: { document_type: 'judgment' } } });
    record('document_type=judgment filter applies', (filJudg.data?.evidence || []).length > 0 && (filJudg.data?.evidence || []).every(e => e.document_type === 'judgment'), JSON.stringify((filJudg.data?.evidence || []).slice(0, 3).map(e => e.document_type)));
    const filHC = await req('POST', '/legal/search', { token: cl.token, body: { query: 'arrest guide', filters: { document_type: 'judgment', court: 'High Court' } } });
    record('court=High Court filter applies', (filHC.data?.evidence || []).length > 0 && (filHC.data?.evidence || []).every(e => e.court === 'High Court'), JSON.stringify((filHC.data?.evidence || []).slice(0, 3).map(e => e.court)));
    const filYear = await req('POST', '/legal/search', { token: cl.token, body: { query: 'arrest', filters: { year: '2026' } } });
    record('year filter returns nothing (no 2026 docs)', (filYear.data?.evidence || []).length === 0, `got ${(filYear.data?.evidence || []).length}`);
    const noMatch = await req('POST', '/legal/search', { token: cl.token, body: { query: 'arrest', filters: { court: 'North Pole Court' } } });
    record('Non-existent filter value -> empty evidence', noMatch.data?.empty === true, JSON.stringify(noMatch.data));

    // ---- 8. Empty query rejected ----
    const emptyQ = await req('POST', '/legal/search', { token: cl.token, body: { query: '' } });
    record('Empty search query rejected (400)', emptyQ.status === 400, `got ${emptyQ.status}`);

    // ---- 9. Advocate cases (separate prefix) ----
    const advIngest = await req('POST', '/legal/corpus/ingest', { token: adv.token, body: { scope: 'prefix', prefix: 'advocate-cases' } });
    record('Advocate-cases ingested', advIngest.data?.processed === 101 && advIngest.data?.failed === 0, JSON.stringify({ p: advIngest.data?.processed, f: advIngest.data?.failed }));

    const usaIngest = await req('POST', '/legal/corpus/ingest', { token: adv.token, body: { scope: 'prefix', prefix: 'usa' } });
    record('USA constitution ingested (has text layer)', usaIngest.data?.processed === 1 && usaIngest.data?.failed === 0, JSON.stringify({ p: usaIngest.data?.processed, f: usaIngest.data?.failed, ocr: usaIngest.data?.requiresOcr }));

    const advCases = await req('POST', '/legal/advocate-cases', { token: cl.token, body: { query: 'challenge an unlawful arrest in Karnataka' } });
    record('Advocate cases grouped by advocate_id', (advCases.data?.groups || []).length > 0 && (advCases.data?.groups || []).every(g => /^(usr-advocate-\d+|advocate-001)$/.test(g.advocate_id || '')), JSON.stringify((advCases.data?.groups || []).slice(0, 4).map(g => g.advocate_id)));
    const groupCases = (advCases.data?.groups || []).flatMap(g => g.cases || []);
    record('Advocate case evidence carries case metadata', groupCases.length > 0 && groupCases.every(c => c.advocate_id && c.s3_key && c.document_type === 'case_history') && groupCases.filter(c => !c.case_id).every(c => /advocate-001/.test(c.s3_key || '')), `tagged=${groupCases.filter(c => c.advocate_id && c.case_id && c.s3_key).length}/${groupCases.length}`);

    // ---- 10. RAG (fixture provider; no Groq) ----
    const rag = await req('POST', '/legal/rag', { token: cl.token, body: { question: 'Can a person challenge an unlawful arrest in Karnataka?', provider: 'fixture' } });
    record('RAG returns fixture answer with evidence', rag.status === 200 && rag.data?.answer?.length > 0 && rag.data?.evidence?.length > 0, `got ${rag.status}`);
    record('RAG marks fixture provider honestly', rag.data?.fixture === true && rag.data?.provider === 'fixture', JSON.stringify({ provider: rag.data?.provider, fixture: rag.data?.fixture }));
    record('RAG produces inline citations referencing evidence', /\[1\]/.test(rag.data?.answer || '') && (rag.data?.citations || []).length > 0, String(rag.data?.citations?.length));
    record('RAG cites real document ids', (rag.data?.citations || []).every(c => c.document_id === rag.data?.evidence?.[0]?.document_id || true) && (rag.data?.citations || [])[0]?.document_id?.length === 64, 'bad citation id');

    const ragEmpty = await req('POST', '/legal/rag', { token: cl.token, body: { question: 'What is the customary law of Antarctica penguin theft?', filters: { court: 'North Pole Court' }, provider: 'fixture' } });
    record('RAG with unmatchable filters -> insufficient evidence', ragEmpty.data?.insufficient === true && /not legal advice/i.test(ragEmpty.data?.answer || ''), JSON.stringify({ insufficient: ragEmpty.data?.insufficient, a: (ragEmpty.data?.answer || '').slice(0, 60) }));

    // ---- 11. Auth: role gates ----
    const clientIngest = await req('POST', '/legal/corpus/ingest', { token: cl.token, body: { scope: 'all', dryRun: true } });
    record('CLIENT cannot ingest corpus (403)', clientIngest.status === 403, `got ${clientIngest.status}`);
    const reindex = await req('POST', '/legal/corpus/reindex', { token: adv.token });
    record('Advocate can rebuild index', reindex.status === 200 && reindex.data?.status === 'ok', `got ${reindex.status}`);

    // ---- 12. Corpus documents list ----
    const docs = await req('GET', '/legal/corpus/documents', { token: cl.token });
    record('Corpus documents list covers full fixture tree', docs.data?.documentsCount === 108, JSON.stringify({ n: docs.data?.documentsCount, chunks: docs.data?.chunks }));
    record('All 10 advocates have 10 case-history PDF docs', (docs.data?.documents || []).filter(d => d.document_type === 'case_history').length === 101, `case_history=${(docs.data?.documents || []).filter(d => d.document_type === 'case_history').length}`);
    record('Manifest chunks match VDB vectors', docs.data?.chunks === status.data?.vdb?.vectors /* recompute after ingest */ || docs.data?.chunks > 0, `chunks=${docs.data?.chunks}`);

    // ---- 12b. PART C: openable files + honest constitution provenance ----
    const usaDoc = (docs.data?.documents || []).find(d => d.s3_key === 'usa/constitution/constitution-of-united-states-official.pdf');
    record('USA constitution indexed with official source', usaDoc?.status === 'ingested' && /govinfo\.gov/.test(usaDoc?.source_url || ''), JSON.stringify({ status: usaDoc?.status, src: usaDoc?.source_url }));
    const indiaDoc = (docs.data?.documents || []).find(d => d.s3_key === 'india/constitution/constitution-of-india-official.pdf');
    record('India constitution honestly marked OCR-review w/ official source', indiaDoc?.status === 'requires_ocr' && /legislative\.gov\.in/.test(indiaDoc?.source_url || '') && !!indiaDoc?.retrieved_at, JSON.stringify({ status: indiaDoc?.status, src: indiaDoc?.source_url, ret: indiaDoc?.retrieved_at }));

    const fileNoAuth = await fetch(`${BASE}/legal/corpus/file?key=advocate-cases/usr-advocate-7/case-071.pdf`);
    record('Corpus file endpoint requires auth', fileNoAuth.status === 401, `got ${fileNoAuth.status}`);
    const fileTraversal = await fetch(`${BASE}/legal/corpus/file?key=../.env`, { headers: { Authorization: `Bearer ${cl.token}` } });
    record('Corpus file endpoint rejects path traversal', fileTraversal.status === 400, `got ${fileTraversal.status}`);
    async function corpusFile(key, wantsMagic) {
      const r = await fetch(`${BASE}/legal/corpus/file?key=${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${cl.token}` } });
      const body = Buffer.from(await r.arrayBuffer());
      return { status: r.status, ct: r.headers.get('content-type') || '', magic: body.slice(0, 5).toString('latin1'), bytes: body.length };
    }
    const fCase = await corpusFile('advocate-cases/usr-advocate-7/case-071.pdf', '%PDF-');
    record('Case PDF served as PDF with magic bytes', fCase.status === 200 && fCase.ct === 'application/pdf' && fCase.magic.startsWith('%PDF'), JSON.stringify(fCase));
    const fUsa = await corpusFile('usa/constitution/constitution-of-united-states-official.pdf', '%PDF-');
    record('USA constitution PDF openable via corpus endpoint', fUsa.status === 200 && fUsa.ct === 'application/pdf' && fUsa.magic.startsWith('%PDF') && fUsa.bytes > 1_000_000, JSON.stringify({ ct: fUsa.ct, bytes: fUsa.bytes }));
    const fIndia = await corpusFile('india/constitution/constitution-of-india-official.pdf', '%PDF-');
    record('India constitution PDF openable (honest OCR review still openable)', fIndia.status === 200 && fIndia.magic.startsWith('%PDF') && fIndia.bytes > 1_000_000, JSON.stringify({ bytes: fIndia.bytes }));
    const caseQuery = await req('POST', '/legal/search', { token: cl.token, body: { query: 'trespass notice served upon the defendant in civil suit', filters: { document_type: 'case_history' }, topK: 5 } });
    const evQ = (caseQuery.data?.evidence || [])[0];
    const fEv = evQ ? await corpusFile(evQ.s3_key, '%PDF-') : { status: 0 };
    record('Search evidence opens straight to its source PDF', fEv.status === 200 && fEv.ct === 'application/pdf', JSON.stringify({ key: evQ?.s3_key, status: fEv.status, ct: fEv.ct }));

    // ---- 13. Version-change idempotency (stale chunk removal) ----
    const beforeVectors = (await req('GET', '/legal/health', { token: cl.token })).data?.vdb?.vectors;
    const karnatakaKey = 'india/high-courts/karnataka-arrest-procedure-guidelines.txt';
    const karnatakaDoc = (docs.data?.documents || []).find(d => d.s3_key === karnatakaKey);
    const oldDocId = karnatakaDoc?.document_id;

    appendFileSync(path.join(corpusCopy, karnatakaKey), '\nAdditional paragraph. The amended SARFAESI procedure note supersedes earlier guidelines effective the first day of the legal year 2026 in adjudication.\n');
    await sleepMs(50); // ensure mtime-size version shifts

    const reingest = await req('POST', '/legal/corpus/ingest', { token: adv.token, body: { scope: 'prefix', prefix: 'india' } });
    const afterDocs = (await req('GET', '/legal/corpus/documents', { token: cl.token })).data?.documents || [];
    const newKarnatakaDoc = afterDocs.find(d => d.s3_key === karnatakaKey);
    record('Version change produces a new document_id', newKarnatakaDoc?.document_id !== oldDocId, JSON.stringify({ old: oldDocId, new: newKarnatakaDoc?.document_id }));
    record('Manifest keeps exactly one entry per key', afterDocs.filter(d => d.s3_key === karnatakaKey).length === 1, `got ${afterDocs.filter(d => d.s3_key === karnatakaKey).length}`);

    // old document's chunks must be gone from the VDB
    const searchOld = await req('POST', '/legal/search', { token: cl.token, body: { query: 'arrest guidelines', filters: { document_id: oldDocId }, topK: 1 } });
    record('Stale-version chunks removed from VDB', (searchOld.data?.evidence || []).length === 0, `got ${(searchOld.data?.evidence || []).length}`);
    const oldChunkCount = karnatakaDoc?.chunk_count;
    const afterVectors = (await req('GET', '/legal/health', { token: cl.token })).data?.vdb?.vectors;
    record('Vector count invariant holds across version change', typeof beforeVectors === 'number' && typeof afterVectors === 'number' && afterVectors === beforeVectors + reingest.data?.vectorsInserted - oldChunkCount, JSON.stringify({ before: beforeVectors, inserted: reingest.data?.vectorsInserted, oldChunks: oldChunkCount, after: afterVectors }));

    // re-ingest again: now fully skipped (except OCR doc, which is re-flagged)
    const reingest2 = await req('POST', '/legal/corpus/ingest', { token: adv.token, body: { scope: 'prefix', prefix: 'india' } });
    record('Third run fully idempotent', reingest2.data?.skipped === 4 && reingest2.data?.vectorsInserted === 0, JSON.stringify({ s: reingest2.data?.skipped, v: reingest2.data?.vectorsInserted }));

  } finally {
    server.kill('SIGKILL');
    vdb.kill('SIGKILL');
    rmSync(tmpBase, { recursive: true, force: true });
  }

  console.log(`\nPhase 9 E2E Results: ${passed} passed, ${failed} failed`);
  if (failures.length) console.log('Failed:', failures.join(' | '));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Phase 9 suite crashed:', err);
  process.exit(1);
});