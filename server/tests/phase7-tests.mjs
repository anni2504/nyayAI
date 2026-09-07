#!/usr/bin/env node
/*
 * NYAYAI Phase 7 Integration Test Suite
 * Advocate Workspace (PostgreSQL-backed):
 *  - workspace stats derived from real bookings + case history
 *  - case-history CRUD scoped to the owning advocate (no cross-advocate access)
 *  - profile GET/PATCH reflected in the discoverability directory
 *  - advocate can list a client's matters only within an active engagement
 *
 * Runs against REAL Neon (server/.env). GROQ_API_KEY blanked -> deterministic.
 *
 * Usage (from server/):  node tests/phase7-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const HOST = '127.0.0.1';
const PORT = 5323;
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
    try { await fetch(`http://${HOST}:${PORT}/health`); return true; } catch { }
    await sleepMs(250);
  }
  return false;
}

async function register(tag, role) {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const slug = tag.toLowerCase().replace(/\s+/g, '-');
  const res = await req('POST', '/auth/register', {
    body: { name: `${tag}`, email: `phase7-${slug}-${unique}@nyayai.test`, password: 'StrongPass123!', role }
  });
  return { token: res.data?.token, id: res.data?.user?.id };
}

async function main() {
  if (!DATABASE_URL) {
    console.error('  SKIP  No DATABASE_URL configured in server/.env. Aborting Phase 7 (needs Neon).');
    process.exit(2);
  }

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase7-test-'));
  const server = spawn('node', ['dist/server.js'], {
    cwd: envDir,
    env: { ...process.env, PORT: String(PORT), NYAYAI_DATA_DIR: dataDir, GROQ_API_KEY: '', NODE_ENV: 'test' },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  const client = new pg.Client({ connectionString: DATABASE_URL });

  try {
    const up = await waitForServer();
    record('Server boots against PostgreSQL (Neon)', up);
    if (!up) { server.kill('SIGKILL'); process.exit(1); }
    await client.connect();

    const a1 = await register('Workspace Advocate One', 'ADVOCATE');
    const a2 = await register('Workspace Advocate Two', 'ADVOCATE');
    const cl1 = await register('Workspace Client One', 'CLIENT');
    const cl2 = await register('Workspace Client Two', 'CLIENT');
    const cl3 = await register('Workspace Client Three', 'CLIENT');
    record('Advocates + clients registered', !!(a1.token && a2.token && cl1.token && cl2.token && cl3.token));

    // ---- 1. Profile GET/PATCH and reflection in the directory ----
    const unauth = await req('GET', '/advocate/profile');
    record('Unauthenticated profile request rejected', unauth.status === 401, `got ${unauth.status}`);

    const patch = await req('PATCH', '/advocate/profile', {
      token: a1.token,
      body: { name: 'Adv. Aarav Sharma', title: 'District Court Advocate', barNumber: 'KAR/2026/01', practiceAreas: ['Consumer Protection'], jurisdiction: 'Karnataka', court: 'City Civil Court', experienceYears: 7, consultationFee: '₹6,000', bio: 'Consumer disputes', location: 'Mysuru', languages: ['English', 'Kannada'] }
    });
    record('Advocate updates full profile', patch.status === 200, `got ${patch.status}`);
    record('Profile GET round-trips new fee', patch.data?.profile?.consultationFee === '₹6,000', String(patch.data?.profile?.consultationFee));

    const dir = await req('GET', '/advocates', { token: cl1.token });
    const entry = (dir.data?.advocates || []).find(a => a.advocateId === a1.id);
    record('Directory reflects updated name + fee', entry?.name === 'Adv. Aarav Sharma' && entry?.consultationFee === '₹6,000', JSON.stringify({ name: entry?.name, fee: entry?.consultationFee }));
    record('Directory reflects verifiedCaseCount of 0 (GPU-accurate)', entry?.verifiedCaseCount === 0, `got ${entry?.verifiedCaseCount}`);

    // ---- 2. Case-history CRUD + cross-advocate isolation ----
    const ch = await req('POST', '/advocate/case-history', { token: a1.token, body: { caseTitle: 'Misra v. Retail Mart', court: 'City Civil Court', year: 2024, caseType: 'Consumer', practiceArea: 'Consumer Protection', jurisdiction: 'Karnataka', outcome: 'Compensation granted' } });
    const chId = ch.data?.record?.id;
    record('Case-history record created (unverified)', ch.status === 201 && ch.data?.record?.verification_status === 'unverified', `status=${ch.status}`);

    const list = await req('GET', '/advocate/case-history', { token: a1.token });
    record('Advocate lists own case history', (list.data?.records || []).some(r => r.id === chId), `len=${(list.data?.records || []).length}`);

    const foreignList = await req('GET', '/advocate/case-history', { token: a2.token });
    record('Other advocate cannot see the same records', !(foreignList.data?.records || []).some(r => r.id === chId), `len=${(foreignList.data?.records || []).length}`);

    const chPatch = await req('PATCH', `/advocate/case-history/${chId}`, { token: a1.token, body: { outcome: 'Compensation with 12% interest' } });
    record('Advocate updates own record', chPatch.status === 200 && chPatch.data?.record?.outcome === 'Compensation with 12% interest', `status=${chPatch.status}`);

    const chPatchForeign = await req('PATCH', `/advocate/case-history/${chId}`, { token: a2.token, body: { outcome: 'forged' } });
    record('Foreign advocate cannot update a record', chPatchForeign.status === 404, `got ${chPatchForeign.status}`);
    const chDeleteForeign = await req('DELETE', `/advocate/case-history/${chId}`, { token: a2.token });
    record('Foreign advocate cannot delete a record', chDeleteForeign.status === 404, `got ${chDeleteForeign.status}`);

    // ---- 3. Case + consultation => workspace stats derived end-to-end ----
    const cas = await req('POST', '/cases', { token: cl1.token, body: { initialPrompt: 'I bought a pressure cooker that exploded, causing property damage in Mysuru, Karnataka.' } });
    const caseId1 = cas.data?.case?.id;
    record('Client One created a case', !!caseId1);
    await req('POST', '/ai/chat', { token: cl1.token, body: { caseId: caseId1, message: 'I bought a pressure cooker that exploded, causing property damage in Mysuru, Karnataka.' } });
    await sleepMs(150);

    const book1 = await req('POST', '/consultations/bookings', { token: cl1.token, body: { advocateId: a1.id, matterTitle: 'Consumer product injury claim', date: '2026-09-25', timeSlot: '10:00 AM - 11:00 AM' } });
    const book1Id = book1.data?.booking?.id;
    record('Client One books the advocate', !!book1Id);
    await req('PATCH', `/consultations/bookings/${book1Id}/status`, { token: a1.token, body: { status: 'accepted' } });

    const stats0 = await req('GET', '/advocate/stats', { token: a1.token });
    record('Stats: 1 active client after accepted booking', stats0.data?.stats?.activeClients === 1, JSON.stringify(stats0.data?.stats));
    record('Stats: 1 upcoming consultation', stats0.data?.stats?.upcomingConsultations === 1, JSON.stringify(stats0.data?.stats));
    record('Stats: 0 pending requests before second booking', stats0.data?.stats?.pendingRequests === 0, JSON.stringify(stats0.data?.stats));
    record('Stats: totalMatters = activeClients + completed', stats0.data?.stats?.totalMatters === 1, JSON.stringify(stats0.data?.stats));
    record('Stats: verifiedCaseRecords counts only verified records', stats0.data?.stats?.verifiedCaseRecords === 0, `got ${stats0.data?.stats?.verifiedCaseRecords}`);

    const book2 = await req('POST', '/consultations/bookings', { token: cl2.token, body: { advocateId: a1.id, matterTitle: 'Tenant deposit question', date: '2026-10-01', timeSlot: '5:00 PM - 6:00 PM' } });
    const book2Id = book2.data?.booking?.id;
    record('Client Two books the advocate (stays pending)', !!book2Id);

    const stats1 = await req('GET', '/advocate/stats', { token: a1.token });
    record('Stats: 1 pending request after Client Two books', stats1.data?.stats?.pendingRequests === 1, JSON.stringify(stats1.data?.stats));
    record('Stats: 2 active clients after second booking', stats1.data?.stats?.activeClients === 2, JSON.stringify(stats1.data?.stats));
    record('Stats: 1 upcoming consultation', stats1.data?.stats?.upcomingConsultations === 1, JSON.stringify(stats1.data?.stats));
    record('Stats: totalMatters = activeClients + completed', stats1.data?.stats?.totalMatters === 2, JSON.stringify(stats1.data?.stats));
    record('Stats: recentRequests lists pending booking', (stats1.data?.recentRequests || []).some(b => b.id === book2Id), 'not found');
    record('Stats: upcoming lists accepted booking', (stats1.data?.upcoming || []).some(b => b.id === book1Id), 'not found');

    const statsForeign = await req('GET', '/advocate/stats', { token: a2.token });
    record('Foreign advocate sees own (empty) stats', statsForeign.status === 200 && statsForeign.data?.stats?.pendingRequests === 0, JSON.stringify(statsForeign.data?.stats));

    // ---- 4. Client matters - visible only within an active engagement ----
    const matters = await req('GET', `/advocate/clients/${cl1.id}/cases`, { token: a1.token });
    record('Advocate lists engaged client\'s matters', matters.status === 200, `got ${matters.status}`);
    const m = (matters.data?.matters || [])[0];
    record('Matter carries readiness info from case state', !!m && typeof m.readinessScore === 'number', JSON.stringify(matters.data?.matters));
    record('Matter jurisdiction comes from structured state', m?.jurisdiction && /Karnataka/i.test(m.jurisdiction), String(m?.jurisdiction));
    record('Matter client metadata returned', matters.data?.client?.id === cl1.id, String(matters.data?.client?.id));

    const mattersNoRel = await req('GET', `/advocate/clients/${cl3.id}/cases`, { token: a1.token });
    record('No engagement with cl3 => 403', mattersNoRel.status === 403, `got ${mattersNoRel.status}`);

    // A2 has no engagement with cl1 even though the case exists
    const mattersForeign = await req('GET', `/advocate/clients/${cl1.id}/cases`, { token: a2.token });
    record('Foreign advocate cannot read client matters', mattersForeign.status === 403, `got ${mattersForeign.status}`);

    const mattersAsClient = await req('GET', `/advocate/clients/${cl1.id}/cases`, { token: cl1.token });
    record('Client cannot call advocate workspace endpoint', mattersAsClient.status === 403, `got ${mattersAsClient.status}`);

    // deletions scoped
    const delOwn = await req('DELETE', `/advocate/case-history/${chId}`, { token: a1.token });
    record('Advocate deletes own record', delOwn.status === 200, `got ${delOwn.status}`);

  } finally {
    if (client) await client.end().catch(() => {});
    server.kill('SIGKILL');
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\nPhase 7 Results: ${passed} passed, ${failed} failed`);
  if (failures.length) console.log('Failed:', failures.join(' | '));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Phase 7 suite crashed:', err);
  process.exit(1);
});