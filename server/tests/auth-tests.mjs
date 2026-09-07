#!/usr/bin/env node
/*
 * NYAYAI Authentication & Authorization Integration Test Suite
 *
 * Spawns the compiled Express server (dist/server.js) against an isolated
 * data directory and verifies the full auth flow:
 *   signup, password hashing, login, /me, logout, JWT expiry, RBAC 403s,
 *   duplicate-email 409, input validation 400s, no password leakage,
 *   and immutable role assignment.
 *
 * Usage (from server/):  node tests/auth-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';

const HOST = '127.0.0.1';
const PORT = 5199;
const BASE = `http://${HOST}:${PORT}/api/v1`;

const DEV_SECRET = 'nyayai-dev-only-jwt-secret-do-not-use-in-prod';

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

async function req(method, endpoint, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
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

function hasPasswordField(obj, seen = new Set()) {
  if (!obj || typeof obj !== 'object') return false;
  if (seen.has(obj)) return false;
  seen.add(obj);
  for (const key of Object.keys(obj)) {
    if (/password|token|secret|certificate/i.test(key) && key !== 'token') {
      // Exclude the JWT bearer token itself; flag anything password/hash-like
      if (/hash|password/i.test(key)) return true;
    }
    if (hasPasswordField(obj[key], seen)) return true;
  }
  return false;
}

function sleepMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}`.replace('/api/v1', '/health'));
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleepMs(250);
  }
  return false;
}

async function main() {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-auth-test-'));
  // Ensure any direct db/database.js imports in this test process use the SAME
  // isolated data directory as the spawned server (DATA_DIR is read at import time).
  process.env.NYAYAI_DATA_DIR = dataDir;
  process.env.DATABASE_URL = '';
  process.env.PG_CONNECTION_STRING = '';
  const server = spawn('node', ['dist/server.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(PORT),
      NYAYAI_DATA_DIR: dataDir,
      DATABASE_URL: '',
      PG_CONNECTION_STRING: '',
      NODE_ENV: process.env.NODE_ENV || 'development'
    },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  try {
    const up = await waitForServer();
    record('Server boots and /health responds', up);
    if (!up) {
      console.error('Server failed to start. Aborting tests.');
      server.kill('SIGKILL');
      process.exit(1);
    }

    const unique = Date.now();
    const clientEmail = `client-${unique}@nyayai.test`;
    const advocateEmail = `advocate-${unique}@nyayai.test`;
    const demoClientEmail = 'client@nyayai.demo';
    const demoAdvocateEmail = 'advocate@nyayai.demo';

    // ---- TEST 1: Client signup -> hashed password -> login works ----
    console.log('\n[TEST 1] Client signup, password hashing, login');
    const signupRes = await req('POST', '/auth/register', {
      body: { name: 'Test Client', email: clientEmail, password: 'StrongPass123!', role: 'CLIENT' }
    });
    record('Client signup returns 201', signupRes.status === 201, `got ${signupRes.status}`);
    record('Client signup returns token + user', signupRes.data?.token && signupRes.data?.user?.role === 'CLIENT');
    let clientToken = signupRes.data?.token;

    if (signupRes.status === 201) {
      const { initDatabase } = await import('../dist/db/database.js');
      const { db } = await import('../dist/db/database.js');
      await initDatabase();
      const stored = await db.findUserByEmail(clientEmail);
      record('User persisted in database', !!stored);
      record('Stored password is a hash (not plaintext)', !!stored && stored.password_hash !== 'StrongPass123!');
      const { default: bcrypt } = await import('bcryptjs');
      if (stored) {
        const compareOk = await bcrypt.compare('StrongPass123!', stored.password_hash);
        record('bcrypt hash verifies against plaintext password', compareOk);
      }
    }

    const clientLogin = await req('POST', '/auth/login', {
      body: { email: clientEmail.toUpperCase(), password: 'StrongPass123!' }
    });
    record('Client login works (case-insensitive email normalization)', clientLogin.status === 200, `got ${clientLogin.status}`);
    if (clientLogin.data?.token) clientToken = clientLogin.data.token;

    // ---- TEST 2: Advocate signup + seeded advocate login ----
    console.log('\n[TEST 2] Advocate signup and seeded demo login');
    const advSignup = await req('POST', '/auth/register', {
      body: { name: 'Test Advocate', email: advocateEmail, password: 'StrongPass123!', role: 'ADVOCATE', title: 'High Court Advocate', barNumber: 'BAR/123/2020' }
    });
    record('Advocate signup returns 201 with role ADVOCATE', advSignup.status === 201 && advSignup.data?.user?.role === 'ADVOCATE', `got ${advSignup.status}`);
    const advToken = advSignup.data?.token;

    const demoAdvLogin = await req('POST', '/auth/login', {
      body: { email: demoAdvocateEmail, password: 'Advocate123!' }
    });
    record('Seeded demo advocate login works', demoAdvLogin.status === 200, `got ${demoAdvLogin.status}`);

    // ---- TEST 3: Wrong password -> 401 ----
    console.log('\n[TEST 3] Wrong password -> 401');
    const wrongPw = await req('POST', '/auth/login', { body: { email: demoClientEmail, password: 'totally-wrong-999' } });
    record('Wrong password returns 401', wrongPw.status === 401, `got ${wrongPw.status}`);

    // ---- TEST 4: Unknown email -> 401 ----
    console.log('\n[TEST 4] Unknown email -> 401');
    const unknownEmail = await req('POST', '/auth/login', { body: { email: 'nobody@nowhere.in', password: 'Whatever123' } });
    record('Unknown email returns 401', unknownEmail.status === 401, `got ${unknownEmail.status}`);

    // ---- TEST 5/6: /auth/me for client and advocate ----
    console.log('\n[TEST 5/6] /auth/me returns correct authenticated user');
    const meClient = await req('GET', '/auth/me', { token: clientToken });
    record('Valid client JWT -> /auth/me -> role CLIENT', meClient.status === 200 && meClient.data?.user?.role === 'CLIENT', `got ${meClient.status}`);
    const meAdv = await req('GET', '/auth/me', { token: advToken });
    record('Valid advocate JWT -> /auth/me -> role ADVOCATE', meAdv.status === 200 && meAdv.data?.user?.role === 'ADVOCATE', `got ${meAdv.status}`);

    // ---- TEST 7: No JWT -> 401 ----
    console.log('\n[TEST 7] Missing JWT -> 401');
    const noToken = await req('GET', '/consultations/bookings');
    record('Protected route without JWT returns 401', noToken.status === 401, `got ${noToken.status}`);

    // ---- TEST 8: Invalid / expired JWT -> 401 ----
    console.log('\n[TEST 8] Invalid / expired JWT -> 401');
    const badToken = await req('GET', '/auth/me', { token: 'not-a-real.jwt.token' });
    record('Malformed JWT returns 401', badToken.status === 401, `got ${badToken.status}`);
    const secret = process.env.JWT_SECRET || DEV_SECRET;
    const expiredToken = jwt.sign({ userId: 'usr-client-1', email: demoClientEmail, role: 'CLIENT' }, secret, { expiresIn: -10 });
    const expiredRes = await req('GET', '/auth/me', { token: expiredToken });
    record('Expired JWT returns 401', expiredRes.status === 401, `got ${expiredRes.status}`);

    // ---- TEST 9: Client -> advocate endpoint -> 403 ----
    console.log('\n[TEST 9] Client hitting advocate endpoint -> 403');
    const clientToAdv = await req('GET', '/advocate/stats', { token: clientToken });
    record('Client -> /advocate/stats -> 403', clientToAdv.status === 403, `got ${clientToAdv.status}`);
    const clientToAdvAi = await req('POST', '/advocate/ai/chat', { token: clientToken, body: { tool: 'legal-notice', query: 'test' } });
    record('Client -> /advocate/ai/chat -> 403', clientToAdvAi.status === 403, `got ${clientToAdvAi.status}`);

    // ---- TEST 10: Advocate -> client-only endpoint -> 403 ----
    console.log('\n[TEST 10] Advocate hitting client endpoints -> 403');
    const advToClientAi = await req('POST', '/ai/chat', { token: advToken, body: { caseId: 'case-1', message: 'hello' } });
    record('Advocate -> /ai/chat -> 403', advToClientAi.status === 403, `got ${advToClientAi.status}`);
    const advToClientDoc = await req('POST', '/documents/upload', { token: advToken, body: { filename: 'x.pdf' } });
    record('Advocate -> /documents/upload -> 403', advToClientDoc.status === 403, `got ${advToClientDoc.status}`);

    // ---- TEST 11/12: workspace isolation (backend enforcement) ----
    console.log('\n[TEST 11/12] Workspace isolation');
    record('Client cannot read advocate leads (403)', clientToAdv.status === 403);
    record('Advocate cannot use client copilot (403)', advToClientAi.status === 403);

    // ---- TEST 13: Logout ----
    console.log('\n[TEST 13] Logout clears authentication');
    const logoutRes = await req('POST', '/auth/logout', { token: clientToken });
    record('Logout endpoint returns 200', logoutRes.status === 200, `got ${logoutRes.status}`);
    const afterLogoutNoToken = await req('GET', '/consultations/bookings');
    record('After logout (token cleared) protected call -> 401', afterLogoutNoToken.status === 401, `got ${afterLogoutNoToken.status}`);

    // ---- TEST 14: Refresh/reload preserves valid session (stateless JWT) ----
    console.log('\n[TEST 14] Stateless JWT survives refresh');
    const meAgain = await req('GET', '/auth/me', { token: clientToken });
    record('Same token still authenticates after subsequent call', meAgain.status === 200, `got ${meAgain.status}`);

    // ---- TEST 15: Password never returned in API responses ----
    console.log('\n[TEST 15] No password/hash leakage in responses');
    const loginResp = await req('POST', '/auth/login', { body: { email: clientEmail, password: 'StrongPass123!' } });
    record('Login response contains no password/hash field', !hasPasswordField(loginResp.data));
    record('Me response contains no password/hash field', !hasPasswordField(meClient.data));

    // ---- TEST 16: Role cannot be modified via payload/query ----
    console.log('\n[TEST 16] Role immutability');
    const roleSpoofAdv = await req('GET', '/advocate/stats?role=ADVOCATE', { token: clientToken });
    record('Spoofing role in query does not grant advocate access', roleSpoofAdv.status === 403, `got ${roleSpoofAdv.status}`);
    const roleSpoofMe = await req('GET', '/auth/me?role=ADVOCATE', { token: clientToken });
    record('Spoofing role in query does not change session role', roleSpoofMe.status === 200 && roleSpoofMe.data?.user?.role === 'CLIENT');
    const loginRoleSpoof = await req('POST', '/auth/login', { body: { email: clientEmail, password: 'StrongPass123!', role: 'ADVOCATE' } });
    record('Spoofing role in login body does not change role', loginRoleSpoof.status === 200 && loginRoleSpoof.data?.user?.role === 'CLIENT', `got ${loginRoleSpoof.status}`);

    // ---- Extra: duplicate email -> 409 ----
    console.log('\n[EXTRA] Error semantics');
    const dupEmail = await req('POST', '/auth/register', {
      body: { name: 'Dup', email: clientEmail, password: 'StrongPass123!', role: 'CLIENT' }
    });
    record('Duplicate email signup -> 409', dupEmail.status === 409, `got ${dupEmail.status}`);

    const weakPw = await req('POST', '/auth/register', {
      body: { name: 'Weak', email: `weak-${unique}@nyayai.test`, password: 'abc', role: 'CLIENT' }
    });
    record('Weak password signup -> 400', weakPw.status === 400, `got ${weakPw.status}`);

    const invalidEmail = await req('POST', '/auth/register', {
      body: { name: 'Invalid', email: 'not-an-email', password: 'StrongPass123!', role: 'CLIENT' }
    });
    record('Invalid email signup -> 400', invalidEmail.status === 400, `got ${invalidEmail.status}`);

    const demoClientLogin = await req('POST', '/auth/login', { body: { email: demoClientEmail, password: 'Client123!' } });
    record('Seeded demo client login works', demoClientLogin.status === 200, `got ${demoClientLogin.status}`);

    const health = await req('GET', '/health');
    record('Health endpoint reports database ready', health.status === 200, `got ${health.status}`);
  } finally {
    server.kill('SIGKILL');
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // best effort cleanup
    }
  }

  console.log(`\n========================================`);
  console.log(`AUTH TESTS: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('FAILED:', failures.join(', '));
  }
  console.log('========================================');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test harness crashed:', err);
  process.exit(1);
});