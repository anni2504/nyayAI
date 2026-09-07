#!/usr/bin/env node
/*
 * NYAYAI Phase 3 Integration Test Suite
 * Production PostgreSQL data layer: Neon driver, case_state + case_messages
 * persistence, seeded advocate profiles/case history, seeded dev accounts,
 * and documents.analysis column. Runs against REAL Neon via server/.env.
 *
 * Usage (from server/):  node tests/phase3-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const HOST = '127.0.0.1';
const PORT = 5311;
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
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function sleepMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://${HOST}:${PORT}/health`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleepMs(250);
  }
  return false;
}

function assertDbConfig() {
  if (!DATABASE_URL) {
    console.error('  SKIP  No DATABASE_URL configured in server/.env. Aborting Phase 3 (needs Neon).');
    process.exit(2);
  }
}

async function waitForPostgresDriver() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        if (data.databaseDriver === 'postgres') return data.databaseDriver;
      }
    } catch {
      // not up yet
    }
    await sleepMs(250);
  }
  return 'unknown';
}

async function main() {
  assertDbConfig();

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase3-test-'));
  const server = spawn('node', ['dist/server.js'], {
    cwd: envDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      NYAYAI_DATA_DIR: dataDir,
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  const client = new pg.Client({ connectionString: DATABASE_URL });

  try {
    const up = await waitForServer();
    record('Server boots against PostgreSQL (Neon)', up);
    if (!up) {
      server.kill('SIGKILL');
      process.exit(1);
    }
    await client.connect();

    const health = await waitForPostgresDriver();
    record('Health reports database driver "postgres"', health === 'postgres', `got ${health}`);

    // ---- Dev accounts seeded ----
    const clientLogin = await req('POST', '/auth/login', {
      body: { email: 'client@nyayai.demo', password: 'Client123!' }
    });
    record('Seeded client@nyayai.demo can log in', clientLogin.status === 200, `got ${clientLogin.status}`);
    const advocateLogin = await req('POST', '/auth/login', {
      body: { email: 'advocate@nyayai.demo', password: 'Advocate123!' }
    });
    record('Seeded advocate@nyayai.demo can log in', advocateLogin.status === 200, `got ${advocateLogin.status}`);
    const clientToken = clientLogin.data?.token || clientLogin.data?.data?.token;
    const advocateToken = advocateLogin.data?.token || advocateLogin.data?.data?.token;

    // ---- Advocate profile + case history persisted in PG ----
    const { rows: profiles } = await client.query(
      'SELECT advocate_id, practice_areas, jurisdiction, verification_status FROM advocate_profiles WHERE advocate_id = $1',
      ['usr-advocate-1']
    );
    record('advocate_profiles row seeded for usr-advocate-1', profiles.length === 1 && profiles[0].verification_status === 'verified', JSON.stringify(profiles));

    const { rows: history } = await client.query(
      'SELECT id, advocate_id, case_title, status FROM advocate_case_history WHERE advocate_id = $1 ORDER BY created_at',
      ['usr-advocate-1']
    );
    record('advocate_case_history seeded (>=3 real rows)', history.length >= 3, `got ${history.length}`);

    // ---- Case + chat -> case_state & case_messages persisted ----
    const unique = Date.now();
    const email = `pg-client-${unique}@nyayai.test`;
    const signup = await req('POST', '/auth/register', {
      body: { name: 'PG Test Client', email, password: 'StrongPass123!', role: 'CLIENT' }
    });
    record('New client registers on PG backend', signup.status === 201, `got ${signup.status}`);
    const signupToken = signup.data?.token || signup.data?.data?.token;

    const createdCase = await req('POST', '/cases', {
      token: signupToken,
      body: { initialPrompt: 'A builder promised delivery by December 2024 but refused to refund my deposit after delays.' }
    });
    record('Client creates a case', createdCase.status === 200 || createdCase.status === 201, `got ${createdCase.status}`);
    const caseId = createdCase.data?.case?.id || createdCase.data?.id;
    record('Case has an id', !!caseId, `got ${caseId}`);

    if (caseId) {
      await req('POST', '/ai/chat', {
        token: signupToken,
        body: { caseId, message: 'The builder is in Bengaluru, Karnataka and I paid a deposit of 4.5 lakh.' }
      });
      await sleepMs(300);

      const { rows: snapshots } = await client.query('SELECT case_id, state FROM case_state WHERE case_id = $1', [caseId]);
      record('case_state snapshot row persisted in PG', snapshots.length >= 1, `got ${snapshots.length}`);
      const parsedState = snapshots.length ? JSON.parse(snapshots[0].state) : null;
      record('Snapshot holds case state JSON with readiness score', parsedState && typeof parsedState.readinessScore === 'number', JSON.stringify(parsedState && parsedState.readinessScore));

      const { rows: messages } = await client.query('SELECT id, role FROM case_messages WHERE case_id = $1 ORDER BY created_at', [caseId]);
      record('case_messages rows persisted in PG', messages.length >= 2, `got ${messages.length}`);

      const caseRows = await req('GET', `/cases/${caseId}`, { token: signupToken });
      record('Case retrievable via API after persistence', caseRows.status === 200, `got ${caseRows.status}`);
    }

    // ---- Users table has all roles ----
    const { rows: userRows } = await client.query('SELECT count(*)::int AS n FROM users');
    record('users table populated on Neon', userRows[0]?.n >= 2, `got ${userRows[0]?.n}`);

    // ---- consultations + consultations_log seeded ----
    const { rows: bookingRows } = await client.query('SELECT count(*)::int AS n FROM bookings');
    record('bookings table has seeded rows', bookingRows[0]?.n >= 1, `got ${bookingRows[0]?.n}`);

    const { rows: consultationNotesTables } = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consultation_notes') AS exists_cte"
    );
    record('consultation_notes table exists in schema', consultationNotesTables[0]?.exists_cte === true);

    // ---- Verification codes table exists and is queryable ----
    const { rows: vcTable } = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'verification_codes') AS exists_cte"
    );
    record('verification_codes table exists in schema', vcTable[0]?.exists_cte === true);

    // ---- documents has analysis column ----
    const { rows: analysisCol } = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'analysis') AS exists_col"
    );
    record('documents.analysis column exists (Phase 4 ready)', analysisCol[0]?.exists_col === true);

  } finally {
    if (client) await client.end().catch(() => {});
    server.kill('SIGKILL');
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\nPhase 3 Results: ${passed} passed, ${failed} failed`);
  if (failures.length) console.log('Failed:', failures.join(' | '));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Phase 3 suite crashed:', err);
  process.exit(1);
});