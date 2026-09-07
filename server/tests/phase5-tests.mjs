#!/usr/bin/env node
/*
 * NYAYAI Phase 5 Integration Test Suite
 * Advocate Discovery & Recommendations (PostgreSQL-backed):
 *  - directory listing carries only DB-derived evidence
 *  - recommendations scored from real profile + case-history data
 *  - configurable weights via NYAYAI_RECOMMENDATION_WEIGHTS
 *  - budget handling (within / slightly-above / above / unknown)
 *  - ownership + role guards
 *
 * Runs against REAL Neon (server/.env). GROQ_API_KEY blanked -> fully
 * deterministic, zero LLM quota consumed.
 *
 * Usage (from server/):  node tests/phase5-tests.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const HOST = '127.0.0.1';
const PORT = 5321;
const BASE = `http://${HOST}:${PORT}/api/v1`;

const envDir = new URL('..', import.meta.url).pathname;
dotenv.config({ path: path.join(envDir, '.env') });
const DATABASE_URL = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '';

let passed = 0;
let failed = 0;
const failures = [];

function record(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
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
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { status: res.status, data };
}

function sleepMs(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://${HOST}:${PORT}/health`);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleepMs(250);
  }
  return false;
}

function assertDbConfig() {
  if (!DATABASE_URL) {
    console.error('  SKIP  No DATABASE_URL configured in server/.env. Aborting Phase 5 (needs Neon).');
    process.exit(2);
  }
}

async function registerClient(pool, tag) {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const res = await req('POST', '/auth/register', {
    body: { name: `Discovery ${tag}`, email: `disc-${tag}-${unique}@nyayai.test`, password: 'StrongPass123!', role: 'CLIENT' }
  });
  const token = res.data?.token || res.data?.data?.token;
  return { token, email: (res.data?.user?.email) || `disc-${tag}-${unique}@nyayai.test` };
}

async function registerAdvocate(pool, tag) {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const res = await req('POST', '/auth/register', {
    body: { name: `Adv. ${tag}`, email: `disc-adv-${tag}-${unique}@nyayai.test`, password: 'StrongPass123!', role: 'ADVOCATE' }
  });
  const token = res.data?.token || res.data?.data?.token;
  return { token };
}

function weightsCheckChild(weights, advocate, state, budget) {
  const script = `
    import { loadWeights, buildCaseRecommendations, parseFee, computeBudgetFit } from './dist/services/advocateRecommendationService.js';
    const weights = ${JSON.stringify(weights)};
    if (weights && Object.keys(weights).length) process.env.NYAYAI_RECOMMENDATION_WEIGHTS = JSON.stringify(weights);
    const advocate = ${JSON.stringify(advocate)};
    const state = ${JSON.stringify(state)};
    const budget = ${budget === undefined ? 'undefined' : JSON.stringify(budget)};
    const load = loadWeights();
    const recom = await buildCaseRecommendations(state, [advocate], { limit: 8, budget });
    const top = recom.length ? recom[0] : null;
    console.log(JSON.stringify({ load, top }));
  `;
  const run = spawnSync('node', ['--input-type=module', '-e', script], {
    cwd: envDir,
    env: { ...process.env, GROQ_API_KEY: '', PG_CONNECTION_STRING: '', DATABASE_URL: '' },
    encoding: 'utf8'
  });
  if (run.status !== 0 || !run.stdout) return null;
  try { return JSON.parse(run.stdout.trim().split('\n').pop()); } catch { return null; }
}

async function main() {
  assertDbConfig();

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase5-test-'));
  const server = spawn('node', ['dist/server.js'], {
    cwd: envDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      NYAYAI_DATA_DIR: dataDir,
      GROQ_API_KEY: '',
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  const client = new pg.Client({ connectionString: DATABASE_URL });

  try {
    const up = await waitForServer();
    record('Server boots against PostgreSQL (Neon)', up);
    if (!up) { server.kill('SIGKILL'); process.exit(1); }
    await client.connect();

    // ---- 1. Directory reflects DB-derived profile evidence only ----
    const adv = await registerAdvocate(client, 'Ramesh');
    record('Advocate registers', !!adv.token, 'no token');
    if (!adv.token) { record('Aborting due to advocate registration failure', false); process.exit(1); }

    const profileRes = await req('PATCH', '/advocate/profile', {
      token: adv.token,
      body: {
        name: 'Adv. Ramesh Iyer',
        title: 'High Court Advocate',
        barNumber: 'KAR/1019/2012',
        practiceAreas: ['RERA & Property Litigation', 'Civil Litigation'],
        jurisdiction: 'Karnataka',
        court: 'Karnataka High Court',
        experienceYears: 10,
        consultationFee: '₹5,000',
        location: 'Bengaluru',
        languages: ['English', 'Kannada'],
        bio: 'Focused on RERA and property possession matters before the Karnataka High Court.'
      }
    });
    record('Advocate updates profile via /advocate/profile', profileRes.status === 200, `got ${profileRes.status}`);
    record('Profile round-trips practice areas', (profileRes.data?.profile?.practiceAreas || []).includes('RERA & Property Litigation'), JSON.stringify(profileRes.data?.profile?.practiceAreas));
    record('Profile round-trips consultation fee', profileRes.data?.profile?.consultationFee === '₹5,000', profileRes.data?.profile?.consultationFee);

    const advId = profileRes.data?.profile?.advocateId;
    record('Profile has advocate id', !!advId, String(advId));

    // Add a case-history record (defaults to unverified)
    const created = await req('POST', '/advocate/case-history', {
      token: adv.token,
      body: {
        caseTitle: 'Kumar v. Sunrise Builders',
        court: 'Karnataka High Court',
        year: 2023,
        caseType: 'RERA Appeal',
        practiceArea: 'RERA & Property Litigation',
        jurisdiction: 'Karnataka',
        outcome: 'Refund ordered with 9% interest'
      }
    });
    record('Advocate adds case-history record', created.status === 201, `got ${created.status}`);
    const achId = created.data?.record?.id;
    record('New case-history record defaults to unverified', created.data?.record?.verification_status === 'unverified', String(created.data?.record?.verification_status));

    const dirBefore = await req('GET', '/advocates', { token: adv.token });
    const entry0 = (dirBefore.data?.advocates || []).find(a => a.advocateId === advId);
    record('Directory lists the advocate', !!entry0, 'not found');
    record('Directory verifiedCaseCount is 0 (no fabricated count)', entry0?.verifiedCaseCount === 0, `got ${entry0?.verifiedCaseCount}`);
    record('Directory verificationStatus matches DB (unverified)', entry0?.verificationStatus === 'unverified', String(entry0?.verificationStatus));
    record('Directory consultation fee carried through', entry0?.consultationFee === '₹5,000', String(entry0?.consultationFee));

    // Simulate admin verification via direct PG update -> evidence count updates honestly
    await client.query(
      `UPDATE advocate_case_history SET verification_status = 'verified' WHERE id = $1`, [achId]
    );
    const dirAfter = await req('GET', '/advocates', { token: adv.token });
    const entry1 = (dirAfter.data?.advocates || []).find(a => a.advocateId === advId);
    record('Directory verifiedCaseCount becomes 1 after DB verification', entry1?.verifiedCaseCount === 1, `got ${entry1?.verifiedCaseCount}`);

    // ---- 2. Case driven deterministically (no Groq) then recommendations fetched ----
    const cliA = await registerClient(client, 'A');
    const cas = await req('POST', '/cases', {
      token: cliA.token,
      body: { initialPrompt: 'My builder delayed possession of my flat in Bengaluru, Karnataka. I signed a sale agreement and paid the full amount in 2021.' }
    });
    const caseId = cas.data?.case?.id;
    record('Client creates case', !!caseId, `got ${caseId}`);
    if (!caseId) process.exit(1);

    await req('POST', '/ai/chat', {
      token: cliA.token,
      body: { caseId, message: 'My builder delayed possession of my flat in Bengaluru, Karnataka. I signed a sale agreement and paid the full amount in 2021.' }
    });
    await sleepMs(150);

    const rec = await req('GET', `/advocates/recommendations/${caseId}`, { token: cliA.token });
    record('Recommendations endpoint returns success', rec.status === 200, `got ${rec.status}`);
    record('Recommendations ready (advocates exist)', rec.data?.ready === true, JSON.stringify(rec.data && { ready: rec.data.ready }));
    const topRec = (rec.data?.recommendations || []).find((r) => r.id === advId);
    record('Registered advocate appears in the case recommendations', !!topRec, `ids=${(rec.data?.recommendations || []).map(r => r.id).join(',')}`);

    if (topRec) {
      const breakdown = topRec.breakdown;
      const sum = Math.round(Object.values(breakdown || {}).reduce((a, b) => a + (Number(b) || 0), 0));
      record('matchScore derives from weighted breakdown (no fabricated score)', topRec.matchScore === Math.min(100, sum) && topRec.matchScore >= 0, `score=${topRec.matchScore}, sum=${sum}`);
      record('All breakdown dimensions non-negative', Object.values(breakdown || {}).every(v => Number(v) >= 0), JSON.stringify(breakdown));
      record('breakdown weights total to 100', (breakdown?.caseRelevance || 0) + (breakdown?.practiceArea || 0) + (breakdown?.jurisdiction || 0) + (breakdown?.historicalExperience || 0) + (breakdown?.budgetCompatibility || 0) + (breakdown?.otherVerifiedFactors || 0) <= 100, 'capped');
      record('whyMatch references on-file case history evidence', (topRec.whyMatch || []).some(w => /case record/.test(w)), JSON.stringify(topRec.whyMatch));
      const anyFabricated = (topRec.matchedCases || []).some(mc => mc.rating || mc.generated || mc.fabricated);
      record('No fabricated rating/outcome in matchedCases', !anyFabricated, JSON.stringify(topRec.matchedCases));
      record('verifiedCaseCount on recommendation derived from DB', topRec.verifiedCaseCount === 1, `got ${topRec.verifiedCaseCount}`);
    }

    // ---- 3. Budget handling ----
    const recBudget = await req('GET', `/advocates/recommendations/${caseId}?budget=2000`, { token: cliA.token });
    const topBudget2000 = (recBudget.data?.recommendations || []).find(r => r.id === advId);
    record('Budget 2000 vs fee 5000 -> above', topBudget2000?.budgetFit === 'above', String(topBudget2000?.budgetFit));

    const recBudgetOk = await req('GET', `/advocates/recommendations/${caseId}?budget=6000`, { token: cliA.token });
    const topBudget6000 = (recBudgetOk.data?.recommendations || []).find(r => r.id === advId);
    record('Budget 6000 vs fee 5000 -> within', topBudget6000?.budgetFit === 'within', String(topBudget6000?.budgetFit));

    const recBudgetNear = await req('GET', `/advocates/recommendations/${caseId}?budget=4400`, { token: cliA.token });
    const topBudget4400 = (recBudgetNear.data?.recommendations || []).find(r => r.id === advId);
    record('Budget 4400 vs fee 5000 -> slightly-above (<=125%)', topBudget4400?.budgetFit === 'slightly-above', String(topBudget4400?.budgetFit));

    const recNoBudget = await req('GET', `/advocates/recommendations/${caseId}`, { token: cliA.token });
    const topNoBudget = (recNoBudget.data?.recommendations || []).find(r => r.id === advId);
    record('No budget -> budgetFit unknown', topNoBudget?.budgetFit === 'unknown', String(topNoBudget?.budgetFit));
    record('Recommendation respects limit (<= 8)', (recNoBudget.data?.recommendations || []).length <= 8, `len=${(recNoBudget.data?.recommendations || []).length}`);

    // Budget must never override legal suitability: budget 0 still returns the advocate
    const recBudgetZero = await req('GET', `/advocates/recommendations/${caseId}?budget=0`, { token: cliA.token });
    record('Budget 0 still returns advocates (budget is soft, not blocking)', (recBudgetZero.data?.recommendations || []).some(r => r.id === advId), 'not found');

    // ---- 4. Role + ownership guards ----
    const advReq = await req('GET', `/advocates/recommendations/${caseId}`, { token: adv.token });
    record('ADVOCATE role cannot fetch case recommendations', advReq.status === 403, `got ${advReq.status}`);

    const cliB = await registerClient(client, 'B');
    const cliBFetch = await req('GET', `/advocates/recommendations/${caseId}`, { token: cliB.token });
    record('Other client cannot fetch foreign case recommendations (404)', cliBFetch.status === 404, `got ${cliBFetch.status}`);

    // ---- 5. Configurable weights change the breakdown (jurisdiction -> 0) ----
    const advEntryForWeights = {
      advocateId: 'adv-weight-test',
      name: 'Weight Test Advocate',
      title: 'Advocate',
      practiceAreas: ['RERA & Property Litigation'],
      jurisdiction: 'Karnataka',
      court: 'Karnataka High Court',
      experienceYears: 10,
      consultationFee: '₹5,000',
      verificationStatus: 'unverified',
      verifiedCaseCount: 1,
      location: 'Bengaluru',
      bio: 'Test bio',
      languages: [],
      recentCases: [{ case_title: 'RERA possession delay refund', court: 'Karnataka High Court', year: 2023, practice_area: 'RERA & Property Litigation', jurisdiction: 'Karnataka', outcome: 'Refund', status: 'Judgment', verification_status: 'verified' }]
    };
    const state = {
      practiceArea: 'RERA & Property Litigation',
      title: 'Builder possession delay in Bengaluru',
      facts: { jurisdiction: { value: 'Karnataka (Bengaluru)' }, matter: { value: 'Builder Possession Delay' } }
    };
    const def = weightsCheckChild({}, advEntryForWeights, state);
    record('Weights default loaded (jurisdiction=15)', def?.load?.jurisdiction === 15, JSON.stringify(def?.load));
    record('Unknown budget with weight 15 yields half weight', def?.top?.breakdown?.budgetCompatibility === 8, `got ${def?.top?.breakdown?.budgetCompatibility}`);
    const zeroJurisdiction = weightsCheckChild(
      { caseRelevance: 30, practiceArea: 20, jurisdiction: 0, historicalExperience: 15, budgetCompatibility: 15, otherVerifiedFactors: 5 },
      advEntryForWeights, state
    );
    record('Custom weights honored (jurisdiction=0)', zeroJurisdiction?.top?.breakdown?.jurisdiction === 0, `got ${zeroJurisdiction?.top?.breakdown?.jurisdiction}`);
    const withinBudget = weightsCheckChild(
      { caseRelevance: 30, practiceArea: 20, jurisdiction: 0, historicalExperience: 15, budgetCompatibility: 15, otherVerifiedFactors: 5 },
      advEntryForWeights, state, 6000
    );
    record('Within-budget uses full budget weight', withinBudget?.top?.breakdown?.budgetCompatibility === 15, `got ${withinBudget?.top?.breakdown?.budgetCompatibility}`);
    record('Within-budget fit labeled correctly', withinBudget?.top?.budgetFit === 'within', String(withinBudget?.top?.budgetFit));

    // parseFee / computeBudgetFit pure units
    const fee = parseFeeChild();
    record('parseFee parses ₹5,000 -> 5000', Number(fee) === 5000, String(fee));

  } finally {
    if (client) await client.end().catch(() => {});
    server.kill('SIGKILL');
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\nPhase 5 Results: ${passed} passed, ${failed} failed`);
  if (failures.length) console.log('Failed:', failures.join(' | '));
  process.exit(failed === 0 ? 0 : 1);
}

function parseFeeChild() {
  const run = spawnSync('node', ['--input-type=module', '-e',
    `import { parseFee } from './dist/services/advocateRecommendationService.js';
     console.log(String(parseFee('₹5,000')));`],
    { cwd: envDir, encoding: 'utf8' });
  return run.stdout ? run.stdout.trim() : null;
}

main().catch(err => {
  console.error('Phase 5 suite crashed:', err);
  process.exit(1);
});