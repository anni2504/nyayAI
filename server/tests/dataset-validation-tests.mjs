#!/usr/bin/env node
/*
 * NYAYAI — Dataset validation test.
 *
 * Fast, stateless test for the committed advocate dataset export. Does not
 * boot a server. Asserts the same invariants the standalone validator checks
 * and requires `scripts/validateAdvocatesDataset.mjs` to pass.
 *
 * Run: node tests/dataset-validation-tests.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');
const DATASET_PATH = path.join(serverRoot, 'data', 'advocates', 'advocates-500.json');

let passed = 0;
let failed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
const advocates = dataset.advocates || [];

check('dataset metadata (name/version/synthetic)', dataset.dataset === 'NYAYAI Synthetic Advocate Dataset'
  && dataset.version === '1.0' && dataset.synthetic === true);
check('exactly 500 advocates', advocates.length === 500 && dataset.totalAdvocates === 500,
  `advocates=${advocates.length} meta=${dataset.totalAdvocates}`);
check('exactly 10 cases per advocate', advocates.every((a) => a.caseCount === 10));
check('total historical cases = 5,000', advocates.reduce((s, a) => s + a.caseCount, 0) === 5000);
check('no duplicate advocate IDs', new Set(advocates.map((a) => a.advocateId)).size === 500);
const allCaseIds = advocates.flatMap((a) => a.cases || []);
check('no duplicate case IDs', new Set(allCaseIds).size === allCaseIds.length, `${allCaseIds.length} case ids`);
check('all advocates linked to exactly 10 case ids', advocates.every((a) => Array.isArray(a.cases) && a.cases.length === 10));

const FORBIDDEN_KEYS = ['password', 'passwordHash', 'password_hash', 'token', 'apiKey', 'secret', 'phone', 'privateKey', 'connectToken'];
let forbidden = [];
for (const adv of advocates) forbidden.push(...FORBIDDEN_KEYS.filter((k) => adv[k] !== undefined));
for (const k of FORBIDDEN_KEYS) if (dataset[k] !== undefined) forbidden.push(`meta.${k}`);
check('no secrets/PII keys in dataset', forbidden.length === 0, `found: ${forbidden.join(', ')}`);

const validator = spawnSync('node', [path.join(serverRoot, 'scripts', 'validateAdvocatesDataset.mjs')], {
  cwd: serverRoot,
  encoding: 'utf8'
});
check('standalone validator script passes', validator.status === 0,
  validator.status !== 0 ? (validator.stderr || validator.stdout || '').split('\n').slice(-3).join(' ') : 'ok');

console.log(`\nDataset Tests: ${passed} passed, ${failed} failed`);
if (failures.length) console.log('Failed:', failures.join(' | '));
process.exit(failed === 0 ? 0 : 1);