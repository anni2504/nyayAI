#!/usr/bin/env node
/*
 * Deterministic corpus-fixture generator for the demo corpus.
 *
 * 1. Advocate-case PDFs: 10 advocates x 10 cases each -> 100 openable PDFs under
 *    fixtures/legal-corpus/advocate-cases/usr-advocate-<N>/case-0XX.pdf.
 * 2. Constitution documents: skeleton ".txt" markers for india/constitution and
 *    usa/constitution that the ingestion pipeline fills with real content.
 *
 * Usage (from server/):  npm run build && node scripts/generateCorpusFixtures.mjs
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));
execSync('npm run build', { stdio: 'ignore', cwd: serverDir });

const { generateCasePdf, buildAdvocateCaseData, ADVOCATE_NAMES, ADVOCATE_PRACTICE_AREAS, ADVOCATE_JURISDICTIONS, ADVOCATE_COURTS } = await import(
  join(serverDir, 'dist', 'services', 'legalCorpus', 'casePdfGenerator.js')
);

const fixtureRoot = join(serverDir, 'fixtures', 'legal-corpus');
let written = 0;

for (let advocateIdx = 1; advocateIdx <= 10; advocateIdx++) {
  const advocateId = `usr-advocate-${advocateIdx}`;
  const dir = join(fixtureRoot, 'advocate-cases', advocateId);
  mkdirSync(dir, { recursive: true });
  for (let caseIndex = 1; caseIndex <= 10; caseIndex++) {
    const caseNum = advocateIdx * 10 + caseIndex; // advocate 7, case 1 -> 71
    const fileName = `case-${String(caseNum).padStart(3, '0')}.pdf`;
    const data = buildAdvocateCaseData({
      advocateIndex: advocateIdx,
      caseIndex,
      advocateName: ADVOCATE_NAMES[advocateIdx - 1],
      practiceArea: ADVOCATE_PRACTICE_AREAS[advocateIdx - 1],
      jurisdiction: ADVOCATE_JURISDICTIONS[advocateIdx - 1],
      court: ADVOCATE_COURTS[advocateIdx - 1]
    });
    if (data.caseId !== `CASE-${String(caseNum).padStart(3, '0')}`) throw new Error(`case id mismatch ${data.caseId} vs ${caseNum}`);
    writeFileSync(join(dir, fileName), generateCasePdf(data));
    written++;
  }
}

const constitutionDocs = [
  ['india', 'constitution', 'Constitution of India'],
  ['usa', 'constitution', 'Constitution of the United States']
];
let constitutions = 0;
for (const [country, top, title] of constitutionDocs) {
  const dir = join(fixtureRoot, country, top);
  mkdirSync(dir, { recursive: true });
  const placeholder = `democratic-constitution-template.txt`;
  const path = join(dir, placeholder);
  if (!existsSync(path)) {
    writeFileSync(
      path,
      `${title} — authoritative text will be retrieved during legal-corpus ingestion (LEGAL_AUTO_INGEST=1).\n`
    );
  }
  constitutions++;
}

console.log(`Wrote ${written} advocate-case PDFs + ${constitutions} constitution markers under ${fixtureRoot}`);