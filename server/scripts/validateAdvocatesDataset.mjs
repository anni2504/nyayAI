#!/usr/bin/env node
/*
 * NYAYAI — Validate server/data/advocates/advocates-500.json against the
 * existing corpus source of truth.
 *
 * Read-only: never modifies the dataset, the corpus, or the production
 * sources. Any mismatch is reported with exact counts and a non-zero exit.
 *
 * Checks:
 *   1. exactly 500 advocates
 *   2. required profile fields present on every advocate
 *   3. every advocate has exactly 10 historical cases (caseCount + cases list)
 *   4. total historical cases = 5,000
 *   5. every case is linked to exactly one advocate (no cross-advocate dups)
 *   6. no orphan advocate cases (every manifest case belongs to a dataset advocate)
 *   7. no duplicate advocate IDs
 *   8. no duplicate case IDs
 *   9. practice areas consistent (each case practice_area belongs to advocate)
 *  10. dataset matches existing corpus/database sources (profiles + manifest)
 *  11. no secrets present (passwords, tokens, credentials, private keys)
 *
 * Run: node scripts/validateAdvocatesDataset.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');
const DATASET_PATH = path.join(serverRoot, 'data', 'advocates', 'advocates-500.json');
const PROFILES_PATH = path.join(serverRoot, 'data', 'advocate-profiles.json');
const MANIFEST_PATH = path.join(serverRoot, 'data', 'corpus-generation-manifest.json');

const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
const profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const perFile = manifest.perFile || [];

const failures = [];
let checks = 0;
function check(name, ok, detail = '') {
  checks++;
  const label = ok ? 'PASS' : 'FAIL';
  console.log(`  ${label}  ${name}${detail ? ` -- ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

// ---- 1. exactly 500 advocates ----
check('exactly 500 advocates', dataset.advocates?.length === 500 && Number(dataset.totalAdvocates) === 500,
  `data=${dataset.advocates?.length} meta=${dataset.totalAdvocates}`);

// metadata
check('dataset metadata present', dataset.dataset === 'NYAYAI Synthetic Advocate Dataset'
  && dataset.version && dataset.synthetic === true && dataset.generatedFrom, 'missing metadata');

// ---- 7. no duplicate advocate IDs ----
const ids = dataset.advocates.map((a) => a.advocateId);
check('no duplicate advocate IDs', new Set(ids).size === ids.length, `${ids.length} ids`);

// ---- 2. required fields ----
const REQUIRED = [
  'advocateId', 'name', 'practiceAreas', 'primaryPracticeArea', 'state', 'city',
  'yearsExperience', 'enrolledYear', 'languages', 'caseCount', 'cases', 'statistics'
];
let missingFieldCount = 0;
for (const adv of dataset.advocates) {
  for (const f of REQUIRED) {
    const v = adv[f];
    const ok = f === 'cases' ? Array.isArray(v) : v !== undefined && v !== null && v !== '';
    if (!ok) { missingFieldCount++; break; }
  }
}
check('required profile fields on every advocate', missingFieldCount === 0, `${missingFieldCount} advocates missing required fields`);

// ---- 3 / 4. case counts ----
let totalCases = 0;
let wrongCaseCount = 0;
let caseListCountMismatch = 0;
for (const adv of dataset.advocates) {
  totalCases += adv.caseCount;
  if (adv.caseCount !== 10) wrongCaseCount++;
  if (!Array.isArray(adv.cases) || adv.cases.length !== adv.caseCount) caseListCountMismatch++;
}
check('every advocate has exactly 10 historical cases', wrongCaseCount === 0, `${wrongCaseCount} advocates with caseCount != 10`);
check('caseCount matches cases[] length for every advocate', caseListCountMismatch === 0, `${caseListCountMismatch} advocates`);
check('total historical cases = 5,000', totalCases === 5000, `total=${totalCases}`);

// ---- 5 / 8. no duplicate case IDs; every case linked exactly once ----
const datasetCaseOwner = new Map(); // case_id -> advocateId
let dupCase = 0;
for (const adv of dataset.advocates) {
  for (const cid of adv.cases || []) {
    if (datasetCaseOwner.has(cid)) { dupCase++; }
    else datasetCaseOwner.set(cid, adv.advocateId);
  }
}
check('no duplicate case IDs across dataset', dupCase === 0, `${dupCase} duplicates`);

// ---- 6. no orphan advocate cases (every manifest case owned) ----
const manifestCaseOwner = new Map();
for (const f of perFile) manifestCaseOwner.set(f.case_id, f.advocate_id);
let orphanCases = 0;
for (const cid of datasetCaseOwner.keys()) {
  if (!manifestCaseOwner.has(cid)) orphanCases++;
}
let manifestOrphans = 0;
for (const cid of manifestCaseOwner.keys()) {
  if (!datasetCaseOwner.has(cid)) manifestOrphans++;
}
check('no orphan cases (dataset case not in manifest)', orphanCases === 0, `${orphanCases}`);
check('no orphan cases (manifest case missing from dataset)', manifestOrphans === 0, `${manifestOrphans}`);

// same case never owned by a different advocate between dataset and manifest
let ownershipMismatch = 0;
for (const [cid, owner] of datasetCaseOwner) {
  if (manifestCaseOwner.get(cid) !== owner) ownershipMismatch++;
}
check('every case linked to exactly one advocate (dataset == manifest owner)', ownershipMismatch === 0, `${ownershipMismatch} mismatches`);

// ---- 9 / 10. practice-area + source consistency ----
const profileIds = Object.keys(profiles).sort();
const datasetIds = dataset.advocates.map((a) => a.advocateId).sort();
check('advocate set matches advocate-profiles.json exactly', JSON.stringify(profileIds) === JSON.stringify(datasetIds), `${profileIds.length} vs ${datasetIds.length}`);

let profileMismatch = 0;
for (const adv of dataset.advocates) {
  const p = profiles[adv.advocateId];
  if (!p) { profileMismatch++; continue; }
  if (p.name !== adv.name || JSON.stringify(p.practice_areas) !== JSON.stringify(adv.practiceAreas)
    || p.state !== adv.state || p.city !== adv.city || p.years_experience !== adv.yearsExperience) {
    profileMismatch++;
  }
}
check('dataset records match advocate-profiles.json fields', profileMismatch === 0, `${profileMismatch} mismatched advocates`);

const perAdvocateFromManifest = {};
let areaViolations = 0;
let countMismatch = 0;
for (const f of perFile) {
  (perAdvocateFromManifest[f.advocate_id] ??= 0);
  perAdvocateFromManifest[f.advocate_id]++;
  const profile = profiles[f.advocate_id];
  if (!profile || !profile.practice_areas.includes(f.record.practice_area)) areaViolations++;
}
for (const adv of dataset.advocates) {
  if ((perAdvocateFromManifest[adv.advocateId] || 0) !== adv.caseCount) countMismatch++;
}
check('case counts per advocate match corpus manifest', countMismatch === 0, `${countMismatch} mismatches`);
check('practice areas consistent (no case outside advocate areas)', areaViolations === 0, `${areaViolations} violations`);

// ---- 11. no secrets ----
const SECRET_PATTERNS = [
  /password/i, /passwd/i, /password_hash/i, /token/i, /secret/i,
  /api[_ -]?key/i, /access[_ -]?key/i, /private[_ -]?key/i, /BEGIN [A-Z ]*PRIVATE KEY/,
  /DATABASE_URL/i, /PG_CONNECTION/i, /postgres(ql)?:\/\//i, /mysql:\/\//i,
  /mongodb(\+srv)?:\/\//i, /AKIA[0-9A-Z]{16}/, /sk-[A-Za-z0-9]{20,}/,
  /Authorization/i, /Bearer /, /GROQ/i, /OLLAMA_URL/i, /AWS_/i, /Bucket/i
];
const raw = JSON.stringify(dataset);
const hit = SECRET_PATTERNS.find((re) => re.test(raw));
check('no secrets present', hit === undefined, hit ? `matched: ${hit}` : 'ok');

// email safety: only synthetic .in demo domains
const syntheticDomains = new Set(['law.in', 'juris.in', 'lex.in', 'legal.in']);
let badEmail = 0;
for (const adv of dataset.advocates) {
  const dom = adv.email?.split('@')[1];
  if (!syntheticDomains.has(dom)) badEmail++;
}
check('emails are synthetic demo addresses only', badEmail === 0, `${badEmail} non-synthetic`);

// no phone/telephone data exported
let phoneFields = 0;
for (const adv of dataset.advocates) if ('phone' in adv) phoneFields++;
check('no phone/PII field exported', phoneFields === 0, `${phoneFields}`);

console.log('');
if (failures.length) {
  console.log(`Dataset validation FAILED: ${failures.length}/${checks} checks failed`);
  console.log('Failed:', failures.join(' | '));
  process.exit(1);
} else {
  console.log(`Dataset validation PASSED: ${checks}/${checks} checks`);
}