#!/usr/bin/env node
/*
 * NYAYAI Phase 6 Integration Test Suite
 * Bookings lifecyle + Consultation Security Audit + Realtime Socket.IO chat:
 *  - booking identity is derived from the DB (client body never trusted)
 *  - status transitions enforced (pending -> accepted/declined by advocate,
 *    cancelled by client on pending/accepted/upcoming)
 *  - participant-only notes/messages/join guards (identity, never role-only)
 *  - every chat message persisted to PostgreSQL before broadcast
 *  - realtime consultation chat with Socket.IO rooms
 *
 * Runs against REAL Neon (server/.env). GROQ_API_KEY blanked.
 *
 * Usage (from server/):  node tests/phase6-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const HOST = '127.0.0.1';
const PORT = 5322;
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
    body: { name: `${tag}`, email: `phase6-${slug}-${unique}@nyayai.test`, password: 'StrongPass123!', role }
  });
  return {
    token: res.data?.token,
    id: res.data?.user?.id,
    name: res.data?.user?.name
  };
}

function connectSocket(ioClient, token) {
  return new Promise((resolve, reject) => {
    const sock = ioClient(`http://${HOST}:${PORT}`, { auth: { token }, transports: ['websocket'], timeout: 5000 });
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 6000);
    sock.on('connect', () => { clearTimeout(timer); resolve(sock); });
    sock.on('connect_error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function emitAck(sock, event, payload, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout for ${event}`)), timeoutMs);
    sock.emit(event, payload, (resp) => { clearTimeout(timer); resolve(resp); });
  });
}

function waitForMessage(sock, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event} received`)), timeoutMs);
    sock.once(event, (msg) => { clearTimeout(timer); resolve(msg); });
  });
}

async function main() {
  if (!DATABASE_URL) {
    console.error('  SKIP  No DATABASE_URL configured in server/.env. Aborting Phase 6 (needs Neon).');
    process.exit(2);
  }

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase6-test-'));
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

    const cli = await register('Cons Client', 'CLIENT');
    const adv = await register('Cons Advocate', 'ADVOCATE');
    const intruder = await register('Intruder', 'CLIENT');
    record('Client, advocate and intruder registered', !!(cli.token && adv.token && intruder.token), `cli=${!!cli.token} adv=${!!adv.token} int=${!!intruder.token}`);
    if (!(cli.token && adv.token)) process.exit(1);

    // Advocate profile so directory entry carries real identity data
    await req('PATCH', '/advocate/profile', {
      token: adv.token,
      body: { name: 'Adv. Considar Kulkarni', title: 'Senior Advocate', barNumber: 'KAR/77/2005', practiceAreas: ['Criminal Defense'], jurisdiction: 'Karnataka', court: 'City Civil Court', experienceYears: 18, consultationFee: '₹3,500', bio: 'Test profile', location: 'Bengaluru' }
    });
    const dir = await req('GET', '/advocates', { token: cli.token });
    const advEntry = (dir.data?.advocates || []).find(a => a.name === 'Adv. Considar Kulkarni');
    const advId = advEntry?.advocateId;
    record('Advocate present in directory', !!advId, JSON.stringify(dir.data?.advocates?.map(a => a.name)));

    // ---- 1. Booking identity is derived from the DB ----
    const spoofed = await req('POST', '/consultations/bookings', {
      token: cli.token,
      body: {
        advocateId: advId,
        matterTitle: 'Cheque bounce matter',
        date: '2026-09-20',
        timeSlot: '11:00 AM - 12:00 PM',
        advocateName: 'Fake Hacker',
        advocateAvatar: 'https://evil.example/avatar.png'
      }
    });
    const bMain = spoofed.data?.booking;
    record('Booking created (201, status pending)', spoofed.status === 201 && bMain?.status === 'pending', `status=${spoofed.status}, st=${bMain?.status}`);
    record('advocateName derived from DB, body spoof ignored', bMain?.advocateName === 'Adv. Considar Kulkarni', `got ${bMain?.advocateName}`);
    record('spoofed avatar discarded', !bMain?.advocateAvatar, String(bMain?.advocateAvatar));
    record('Fee falls back to advocate consultation fee', bMain?.fee === '₹3,500', String(bMain?.fee));

    // ---- 2. Status lifecycle & transition guardrails ----
    // main booking: pending -> accepted (advocate), then client cancel allowed
    const acc = await req('PATCH', `/consultations/bookings/${bMain.id}/status`, { token: adv.token, body: { status: 'accepted' } });
    record('Advocate accepts pending booking', acc.status === 200 && acc.data?.booking?.status === 'accepted', `status=${acc.status}, st=${acc.data?.booking?.status}`);

    const advCancel = await req('PATCH', `/consultations/bookings/${bMain.id}/status`, { token: adv.token, body: { status: 'cancelled' } });
    record('Advocate cannot cancel an accepted booking', advCancel.status === 403, `got ${advCancel.status}`);

    const clientDecline = await req('PATCH', `/consultations/bookings/${bMain.id}/status`, { token: cli.token, body: { status: 'declined' } });
    record('Client cannot decline a booking', clientDecline.status === 403, `got ${clientDecline.status}`);

    const badStatus = await req('PATCH', `/consultations/bookings/${bMain.id}/status`, { token: cli.token, body: { status: 'sideways' } });
    record('Unknown status rejected', badStatus.status === 403, `got ${badStatus.status}`);

    // booking bCancel: client cancels while pending
    const bCancelRes = await req('POST', '/consultations/bookings', { token: cli.token, body: { advocateId: advId, matterTitle: 'Cancel me', date: '2026-09-21', timeSlot: '12:00 PM - 1:00 PM' } });
    const bCancel = bCancelRes.data?.booking;
    const clientCancel = await req('PATCH', `/consultations/bookings/${bCancel.id}/status`, { token: cli.token, body: { status: 'cancelled' } });
    record('Client cancels pending booking', clientCancel.status === 200 && clientCancel.data?.booking?.status === 'cancelled', `status=${clientCancel.status}`);

    // booking bDecline: advocate declines; then client may not cancel it
    const bDeclRes = await req('POST', '/consultations/bookings', { token: cli.token, body: { advocateId: advId, matterTitle: 'Decline me', date: '2026-09-22', timeSlot: '3:00 PM - 4:00 PM' } });
    const bDecl = bDeclRes.data?.booking;
    const decline = await req('PATCH', `/consultations/bookings/${bDecl.id}/status`, { token: adv.token, body: { status: 'declined' } });
    record('Advocate declines pending booking', decline.status === 200 && decline.data?.booking?.status === 'declined', `status=${decline.status}`);
    const cancelDeclined = await req('PATCH', `/consultations/bookings/${bDecl.id}/status`, { token: cli.token, body: { status: 'cancelled' } });
    record('Declined booking cannot be moved by client', cancelDeclined.status === 403, `got ${cancelDeclined.status}`);

    // intruder can never alter the booking
    const intruderMove = await req('PATCH', `/consultations/bookings/${bMain.id}/status`, { token: intruder.token, body: { status: 'cancelled' } });
    record('Intruder cannot change booking status', intruderMove.status === 403, `got ${intruderMove.status}`);

    // ---- 3. Join guardrails ----
    const joinOk = await req('POST', `/consultations/${bMain.id}/join`, { token: cli.token });
    record('Client joins accepted consultation (Agora token issued)', joinOk.status === 200 && !!joinOk.data?.token, `status=${joinOk.status}`);
    const joinIntruder = await req('POST', `/consultations/${bMain.id}/join`, { token: intruder.token });
    record('Intruder cannot join consultation', joinIntruder.status === 403, `got ${joinIntruder.status}`);
    const joinNotAdvocate = await req('POST', `/consultations/${bMain.id}/join`, { token: adv.token });
    record('Attached advocate can also join', joinNotAdvocate.status === 200, `got ${joinNotAdvocate.status}`);
    const details = await req('GET', `/consultations/${bMain.id}`, { token: intruder.token });
    record('Intruder cannot fetch consultation details', details.status === 403, `got ${details.status}`);
    const detailsOwner = await req('GET', `/consultations/${bMain.id}`, { token: cli.token });
    record('Participant can fetch consultation details', detailsOwner.status === 200, `got ${detailsOwner.status}`);

    // cancelled booking cannot be joined
    await req('PATCH', `/consultations/bookings/${bCancel.id}/status`, { token: cli.token, body: { status: 'cancelled' } });
    const joinCancelled = await req('POST', `/consultations/${bCancel.id}/join`, { token: cli.token });
    record('Cancelled booking cannot be joined', joinCancelled.status === 400, `got ${joinCancelled.status}`);

    // ---- 4. Notes: advocate-only ----
    const notesAdv = await req('POST', `/consultations/${bMain.id}/notes`, { token: adv.token, body: { notes: 'Client presented bounced cheque dated 05-Aug-2026. Advise civil + NI proceedings.' } });
    record('Advocate adds consultation notes', notesAdv.status === 200, `got ${notesAdv.status}`);
    const notesIntruder = await req('POST', `/consultations/${bMain.id}/notes`, { token: intruder.token, body: { notes: 'tamper' } });
    record('Intruder cannot add notes', notesIntruder.status === 403, `got ${notesIntruder.status}`);
    const notesClient = await req('GET', `/consultations/${bMain.id}/notes`, { token: cli.token });
    record('Client cannot read advocate notes', notesClient.status === 403, `got ${notesClient.status}`);
    const notesList = await req('GET', `/consultations/${bMain.id}/notes`, { token: adv.token });
    record('Advocate reads own notes', notesList.status === 200 && (notesList.data?.notes || []).length === 1, `len=${(notesList.data?.notes || []).length}`);

    // ---- 5. Messages: REST participant-only + PG persistence ----
    const msgClient = await req('POST', `/consultations/${bMain.id}/messages`, { token: cli.token, body: { content: 'Hello, I have attached the bounced cheque details.' } });
    record('Client posts chat message', msgClient.status === 201, `got ${msgClient.status}`);
    const msgEmpty = await req('POST', `/consultations/${bMain.id}/messages`, { token: cli.token, body: { content: '   ' } });
    record('Empty message rejected', msgEmpty.status === 400, `got ${msgEmpty.status}`);
    const msgIntruder = await req('POST', `/consultations/${bMain.id}/messages`, { token: intruder.token, body: { content: 'spy' } });
    record('Intruder cannot post message', msgIntruder.status === 403, `got ${msgIntruder.status}`);
    const msgHistory = await req('GET', `/consultations/${bMain.id}/messages`, { token: adv.token });
    const hist = msgHistory.data?.messages || [];
    record('Advocate reads message history', hist.length === 1, `len=${hist.length}`);
    record('Message record uses snake_case schema', !!hist[0] && !!hist[0].booking_id && !!hist[0].sender_id && typeof hist[0].content === 'string', JSON.stringify(hist[0]));

    // ---- 6. Realtime Socket.IO chat (join rooms, broadcast, persistence) ----
    let io;
    try {
      io = await import('socket.io-client');
    } catch {
      record('socket.io-client imported for realtime test', false, 'not resolvable');
      process.exit(1);
    }
    const cliSocket = await connectSocket(io.default || io, cli.token);
    const advSocket = await connectSocket(io.default || io, adv.token);
    record('Client + advocate sockets connect (JWT handshake)', !!cliSocket && !!advSocket);

    const joinClient = await emitAck(cliSocket, 'consultation:join', { bookingId: bMain.id });
    const joinAdvocate = await emitAck(advSocket, 'consultation:join', { bookingId: bMain.id });
    record('Both participants join booking room', joinClient?.ok === true && joinAdvocate?.ok === true, JSON.stringify({ joinClient, joinAdvocate }));

    const spySocket = await connectSocket(io.default || io, intruder.token);
    const spyJoin = await emitAck(spySocket, 'consultation:join', { bookingId: bMain.id });
    record('Intruder socket is refused from booking room', spyJoin?.ok === false && spyJoin?.error === 'forbidden', JSON.stringify(spyJoin));

    const incoming = waitForMessage(advSocket, 'consultation:message');
    const ack = await emitAck(cliSocket, 'consultation:message', { bookingId: bMain.id, content: 'Live test message over Socket.IO' });
    record('Client emits consultation:message (ack ok)', ack?.ok === true, JSON.stringify(ack));
    const received = await Promise.race([incoming, sleepMs(6000).then(() => null)]);
    record('Advocate receives live message in room', !!received && received.content === 'Live test message over Socket.IO' && received.sender_role === 'CLIENT', JSON.stringify(received));

    const { rows: msgRows } = await client.query('SELECT * FROM consultation_messages WHERE booking_id = $1 ORDER BY created_at ASC', [bMain.id]);
    record('PG consultation_messages has REST + socket messages persisted', msgRows.length >= 2, `rows=${msgRows.length}`);
    const { rows: noteRows } = await client.query('SELECT * FROM consultation_notes WHERE booking_id = $1', [bMain.id]);
    record('PG consultation_notes persisted', noteRows.length === 1, `rows=${noteRows.length}`);

    cliSocket.close();
    advSocket.close();
    spySocket.close();

    // after cancellation, history still readable by participants
    await req('PATCH', `/consultations/bookings/${bMain.id}/status`, { token: cli.token, body: { status: 'cancelled' } });
    const histAfter = await req('GET', `/consultations/${bMain.id}/messages`, { token: cli.token });
    record('Message history retained after cancellation (participant)', histAfter.status === 200 && (histAfter.data?.messages || []).length >= 2, `got ${histAfter.status}`);

  } finally {
    if (client) await client.end().catch(() => {});
    server.kill('SIGKILL');
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\nPhase 6 Results: ${passed} passed, ${failed} failed`);
  if (failures.length) console.log('Failed:', failures.join(' | '));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Phase 6 suite crashed:', err);
  process.exit(1);
});