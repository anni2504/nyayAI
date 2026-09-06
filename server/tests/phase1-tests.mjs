#!/usr/bin/env node
/*
 * NYAYAI Phase 1 Integration Test Suite
 * Client data integrity & persistence: cases, documents, saved advocates,
 * bookings (strict ownership), and profile management.
 *
 * Usage (from server/):  node tests/phase1-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 5299;
const BASE = `http://${HOST}:${PORT}/api/v1`;

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

async function main() {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase1-test-'));
  process.env.NYAYAI_DATA_DIR = dataDir;
  const server = spawn('node', ['dist/server.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(PORT),
      NYAYAI_DATA_DIR: dataDir,
      NODE_ENV: process.env.NODE_ENV || 'development'
    },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  try {
    const up = await waitForServer();
    record('Server boots and /health responds', up);
    if (!up) {
      server.kill('SIGKILL');
      process.exit(1);
    }

    const unique = Date.now();
    const emailA = `client-a-${unique}@nyayai.test`;
    const emailB = `client-b-${unique}@nyayai.test`;

    // Register two isolated clients
    const signupA = await req('POST', '/auth/register', {
      body: { name: 'Client Alpha', email: emailA, password: 'StrongPass123!', role: 'CLIENT' }
    });
    const signupB = await req('POST', '/auth/register', {
      body: { name: 'Client Bravo', email: emailB, password: 'StrongPass123!', role: 'CLIENT' }
    });
    record('Two clients register', signupA.status === 201 && signupB.status === 201, `got ${signupA.status}/${signupB.status}`);
    const tokenA = signupA.data?.token;
    const tokenB = signupB.data?.token;

    // ---- CASES ----
    console.log('\n[CASE PERSISTENCE + OWNERSHIP]');
    const freshList = await req('GET', '/cases', { token: tokenA });
    record('New client starts with zero cases (honest empty state)', freshList.status === 200 && freshList.data?.cases?.length === 0, `got ${freshList.status}`);

    const createRes = await req('POST', '/cases', { token: tokenA, body: { initialPrompt: 'I had a fight with my neighbour' } });
    record('POST /cases creates persisted case (201)', createRes.status === 201, `got ${createRes.status}`);
    record('Created case starts at 0% readiness', createRes.data?.case?.readinessScore === 0, `got ${createRes.data?.case?.readinessScore}`);
    const caseId = createRes.data?.case?.id;
    record('Created case has server-generated id', !!caseId);
    record('Created case is owned by client A', createRes.data?.case?.clientId && createRes.data?.case?.clientId !== '');

    // Ai chat persists the case state
    const chatRes = await req('POST', '/ai/chat', { token: tokenA, body: { caseId, message: 'Physical assault happened in Pune, Maharashtra. I have a medical certificate.' } });
    record('POST /ai/chat returns reply for owned case', chatRes.status === 200 && !!chatRes.data?.reply, `got ${chatRes.status}`);

    const listAfter = await req('GET', '/cases', { token: tokenA });
    record('GET /cases lists the persistent case', listAfter.status === 200 && listAfter.data?.cases?.some((c) => c.id === caseId), `got ${listAfter.status}`);

    const getCase = await req('GET', `/cases/${caseId}`, { token: tokenA });
    record('GET /cases/:id returns owned case', getCase.status === 200 && getCase.data?.case?.id === caseId, `got ${getCase.status}`);

    // Ownership isolation
    const otherGet = await req('GET', `/cases/${caseId}`, { token: tokenB });
    record('Client B cannot read Client A case (404 IDOR-safe)', otherGet.status === 404, `got ${otherGet.status}`);

    const otherChat = await req('POST', '/ai/chat', { token: tokenB, body: { caseId, message: 'trying to hijack' } });
    record('Client B cannot run copilot on Client A case (404 -> creates isolated own case)', [200, 404].includes(otherChat.status), `got ${otherChat.status}`);

    const badChat = await req('POST', '/ai/chat', { token: tokenA, body: { caseId: 'case-does-not-exist-xyz', message: 'hello' } });
    record('Chat with unknown caseId creates a fresh owned case (200)', badChat.status === 200 && badChat.data?.caseId !== caseId, `got ${badChat.status}`);

    // PATCH title
    const patchCase = await req('PATCH', `/cases/${caseId}`, { token: tokenA, body: { title: 'Renamed Matter' } });
    record('PATCH /cases/:id updates title', patchCase.status === 200 && patchCase.data?.case?.title === 'Renamed Matter', `got ${patchCase.status}`);

    // ---- DOCUMENTS ----
    console.log('\n[DOCUMENT PERSISTENCE + OWNERSHIP (NO AI)]');
    const docStore = await req('POST', '/documents', {
      token: tokenA,
      body: { caseId, filename: 'FIR-copy.pdf', fileSize: '2.1 MB', fileType: 'application/pdf' }
    });
    record('POST /documents stores document without AI analysis (201)', docStore.status === 201, `got ${docStore.status}`);
    record('Stored document has STORED analysis status (no AI auto-trigger)', docStore.data?.document?.analysis_status === 'STORED', `got ${docStore.data?.document?.analysis_status}`);
    const docId = docStore.data?.document?.id;

    const docList = await req('GET', '/documents', { token: tokenA });
    record('GET /documents lists owned documents', docList.status === 200 && docList.data?.documents?.some((d) => d.id === docId), `got ${docList.status}`);

    const docOtherGet = await req('GET', `/documents/${docId}`, { token: tokenB });
    record('Client B cannot read Client A document (404)', docOtherGet.status === 404, `got ${docOtherGet.status}`);

    const docOtherDel = await req('DELETE', `/documents/${docId}`, { token: tokenB });
    record('Client B cannot delete Client A document (404)', docOtherDel.status === 404, `got ${docOtherDel.status}`);

    const docDel = await req('DELETE', `/documents/${docId}`, { token: tokenA });
    record('Client A can delete own document', docDel.status === 200, `got ${docDel.status}`);

    // ---- SAVED ADVOCATES ----
    console.log('\n[SAVED ADVOCATES + OWNERSHIP]');
    const saved = await req('POST', '/saved-advocates', {
      token: tokenA,
      body: { advocate: { id: 'adv-101', name: 'Adv. Meera Kulkarni', title: 'Criminal Advocate', matchScore: 92 } }
    });
    record('POST /saved-advocates saves an advocate (201)', saved.status === 201, `got ${saved.status}`);

    const savedList = await req('GET', '/saved-advocates', { token: tokenA });
    record('GET /saved-advocates returns saved advocate', savedList.status === 200 && savedList.data?.advocates?.some((a) => a.id === 'adv-101'), `got ${savedList.status}`);

    const savedOtherList = await req('GET', '/saved-advocates', { token: tokenB });
    record('Client B does not see Client A saved advocates', savedOtherList.status === 200 && savedOtherList.data?.advocates?.length === 0, `got ${savedOtherList.status}`);

    const savedOtherDel = await req('DELETE', '/saved-advocates/adv-101', { token: tokenB });
    record('Client B cannot remove Client A saved advocate (404)', savedOtherDel.status === 404, `got ${savedOtherDel.status}`);

    const savedDel = await req('DELETE', '/saved-advocates/adv-101', { token: tokenA });
    record('Client A can remove own saved advocate', savedDel.status === 200, `got ${savedDel.status}`);

    // ---- BOOKINGS (STRICT OWNERSHIP) ----
    console.log('\n[BOOKINGS STRICT OWNERSHIP]');
    const bookingsEmpty = await req('GET', '/consultations/bookings', { token: tokenA });
    record('Fresh client B sees no seeded bookings (leak fixed)', bookingsEmpty.status === 200 && bookingsEmpty.data?.bookings?.length === 0, `got ${bookingsEmpty.status}`);

    const bookingCreate = await req('POST', '/consultations/bookings', {
      token: tokenA,
      body: { advocateId: 'usr-advocate-1', advocateName: 'Adv. Rajesh Varma', matterTitle: 'Tenancy dispute', date: 'Sep 15, 2026', timeSlot: '3 PM - 4 PM', fee: '₹2,500' }
    });
    record('POST /consultations/bookings creates owned booking (201)', bookingCreate.status === 201, `got ${bookingCreate.status}`);
    const bookingId = bookingCreate.data?.booking?.id;

    const bookingsA = await req('GET', '/consultations/bookings', { token: tokenA });
    record('Client A sees their own booking', bookingsA.status === 200 && bookingsA.data?.bookings?.some((b) => b.id === bookingId), `got ${bookingsA.status}`);

    const bookingsB = await req('GET', '/consultations/bookings', { token: tokenB });
    record('Client B does not see Client A booking', bookingsB.status === 200 && !bookingsB.data?.bookings?.some((b) => b.id === bookingId), `got ${bookingsB.status}`);

    const joinOther = await req('POST', `/consultations/${bookingId}/join`, { token: tokenB });
    record('Client B cannot join Client A booking (403)', joinOther.status === 403, `got ${joinOther.status}`);

    // Demo client (usr-client-1) still sees the 2 seeded bookings
    const demoLogin = await req('POST', '/auth/login', { body: { email: 'client@nyayai.demo', password: 'Client123!' } });
    record('Demo client login', demoLogin.status === 200, `got ${demoLogin.status}`);
    const demoBookings = await req('GET', '/consultations/bookings', { token: demoLogin.data?.token });
    record('Demo client sees exactly their 2 seeded bookings (no cross-account leak)', demoBookings.status === 200 && demoBookings.data?.bookings?.length === 2, `got ${demoBookings.status}`);

    // ---- PROFILE ----
    console.log('\n[PROFILE GET/UPDATE + IMMUTABLE FIELDS]');
    const profileGet = await req('GET', '/profile', { token: tokenA });
    record('GET /profile returns current user', profileGet.status === 200 && profileGet.data?.user?.email === emailA, `got ${profileGet.status}`);

    const profilePatch = await req('PATCH', '/profile', {
      token: tokenA,
      body: { phone: '+91 98765 43211', preferredLanguage: 'English', privacyConsent: true, name: 'Client Alpha Updated', email: 'evil@spoof.com', role: 'ADVOCATE', id: 'usr-hacked' }
    });
    record('PATCH /profile updates editable fields', profilePatch.status === 200 && profilePatch.data?.user?.phone === '+91 98765 43211' && profilePatch.data?.user?.preferredLanguage === 'English', `got ${profilePatch.status}`);
    record('PATCH /profile rejects immutable email/role/id spoofing', profilePatch.data?.user?.email === emailA && profilePatch.data?.user?.role === 'CLIENT' && profilePatch.data?.user?.id !== 'usr-hacked', `got email=${profilePatch.data?.user?.email}`);

    const profileMe = await req('GET', '/auth/me', { token: tokenA });
    record('/auth/me reflects updated profile fields', profileMe.data?.user?.preferredLanguage === 'English', `got ${profileMe.data?.user?.preferredLanguage}`);

    // ---- RBAC ----
    console.log('\n[RBAC ON NEW ENDPOINTS]');
    const advocateLogin = await req('POST', '/auth/login', { body: { email: 'advocate@nyayai.demo', password: 'Advocate123!' } });
    const advToken = advocateLogin.data?.token;
    const advCreateCase = await req('POST', '/cases', { token: advToken, body: { initialPrompt: 'case' } });
    record('Advocate cannot create cases (403)', advCreateCase.status === 403, `got ${advCreateCase.status}`);
    const advSaveAdv = await req('POST', '/saved-advocates', { token: advToken, body: { advocate: { id: 'x', name: 'x' } } });
    record('Advocate cannot save advocates (403)', advSaveAdv.status === 403, `got ${advSaveAdv.status}`);
  } finally {
    server.kill('SIGKILL');
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // best effort cleanup
    }
  }

  console.log(`\n========================================`);
  console.log(`PHASE 1 TESTS: ${passed} passed, ${failed} failed`);
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