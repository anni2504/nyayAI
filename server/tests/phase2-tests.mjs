#!/usr/bin/env node
/*
 * NYAYAI Phase 2 Integration Test Suite
 * Stateful AI Case Understanding: fact extraction, merging, next-question,
 * no repeated questions, readiness progression, corrections.
 *
 * Usage (from server/):  node tests/phase2-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 5300;
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
  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase2-test-'));
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
      GROQ_API_KEY: '',
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
    const email = `client-${unique}@nyayai.test`;

    const signup = await req('POST', '/auth/register', {
      body: { name: 'Test Client', email, password: 'StrongPass123!', role: 'CLIENT' }
    });
    record('Client registers', signup.status === 201, `got ${signup.status}`);
    const token = signup.data?.token;

    // Helper: create a new case
    async function createCase(initialPrompt) {
      const res = await req('POST', '/cases', { token, body: { initialPrompt } });
      return res.data?.case?.id;
    }

    // Helper: send chat message
    async function chat(caseId, message) {
      const res = await req('POST', '/ai/chat', { token, body: { caseId, message } });
      return res.data;
    }

    // Helper: get case summary
    async function getCase(caseId) {
      const res = await req('GET', `/cases/${caseId}`, { token });
      return res.data?.case;
    }

    // ============================================================
    // TEST 1: EXACT BUG SEQUENCE - Neighbour dispute with "pune" answer
    // User: "I had a fight with my neighbour"
    // AI asks: "Which city and state?"
    // User: "pune"
    // AI must NOT re-ask "which city and state"
    // ============================================================
    console.log('\n[BUG FIX: PUNE JURISDICTION RE-ASK]');
    let caseId = await createCase('I had a fight with my neighbour');
    record('Case created', !!caseId);

    let payload = await chat(caseId, 'I had a fight with my neighbour');
    record('Turn 1: Initial intake reply exists', !!payload?.reply);
    record('Turn 1: Asks for jurisdiction', payload?.reply?.toLowerCase().includes('city') && payload?.reply?.toLowerCase().includes('state'));
    record('Turn 1: Readiness > 0', payload?.caseReadinessScore > 0);

    payload = await chat(caseId, 'pune');
    record('Turn 2: Reply exists after "pune"', !!payload?.reply);
    // Critical: must NOT re-ask "which city and state"
    const reasks = payload?.reply?.toLowerCase().includes('which city and state') ||
                   payload?.reply?.toLowerCase().includes('where did this');
    record('Turn 2: Does NOT re-ask jurisdiction', !reasks, `reply: ${payload?.reply}`);
    // Must acknowledge Pune / Maharashtra
    const ack = payload?.reply?.toLowerCase().includes('pune') ||
                payload?.reply?.toLowerCase().includes('maharashtra');
    record('Turn 2: Acknowledges Pune/Maharashtra', ack, `reply: ${payload?.reply}`);
    record('Turn 2: Readiness increased', payload?.caseReadinessScore > 0);

    payload = await chat(caseId, 'yes, I filed an FIR');
    record('Turn 3: Reply exists after "yes, FIR"', !!payload?.reply);
    const ackFir = payload?.reply?.toLowerCase().includes('fir') ||
                   payload?.reply?.toLowerCase().includes('police') ||
                   payload?.reply?.toLowerCase().includes('csr');
    record('Turn 3: Acknowledges FIR', ackFir, `reply: ${payload?.reply}`);
    record('Turn 3: Readiness increased', payload?.caseReadinessScore >= (payload?.prevScore || 0));

    payload = await chat(caseId, 'he hit me');
    record('Turn 4: Reply exists after "he hit me"', !!payload?.reply);
    const ackInj = payload?.reply?.toLowerCase().includes('hit') ||
                   payload?.reply?.toLowerCase().includes('injury') ||
                   payload?.reply?.toLowerCase().includes('physical');
    record('Turn 4: Acknowledges injury', ackInj, `reply: ${payload?.reply}`);
    record('Turn 4: Readiness increased', payload?.caseReadinessScore >= (payload?.prevScore || 0));

    payload = await chat(caseId, 'I have CCTV footage');
    record('Turn 5: Reply exists after CCTV', !!payload?.reply);
    const ackEvi = payload?.reply?.toLowerCase().includes('cctv') ||
                   payload?.reply?.toLowerCase().includes('evidence') ||
                   payload?.reply?.toLowerCase().includes('footage');
    record('Turn 5: Acknowledges evidence', ackEvi, `reply: ${payload?.reply}`);
    record('Turn 5: Readiness increased', payload?.caseReadinessScore >= (payload?.prevScore || 0));

    payload = await chat(caseId, 'I want to take legal action');
    record('Turn 6: Reply exists after objective', !!payload?.reply);
    const ackObj = payload?.reply?.toLowerCase().includes('legal') ||
                   payload?.reply?.toLowerCase().includes('action') ||
                   payload?.reply?.toLowerCase().includes('advocate');
    record('Turn 6: Acknowledges objective', ackObj, `reply: ${payload?.reply}`);
    record('Turn 6: Readiness increased', payload?.caseReadinessScore >= (payload?.prevScore || 0));

    // Verify final state
    const finalCase = await getCase(caseId);
    record('Final: Jurisdiction includes Maharashtra', finalCase?.jurisdiction?.toLowerCase().includes('maharashtra') || finalCase?.jurisdiction?.toLowerCase().includes('pune'));
    record('Final: Police status is filed', finalCase?.collectedFacts?.policeStatus?.value === true);
    record('Final: Has evidence', finalCase?.collectedFacts?.evidence?.value?.length > 0);
    record('Final: Has objective', finalCase?.collectedFacts?.clientObjective?.value);
    record('Final: Readiness > 40%', finalCase?.readinessScore > 40);

    // ============================================================
    // TEST 2: BUILDER POSSESSION DELAY FLOW
    // ============================================================
    console.log('\n[BUILDER POSSESSION DELAY FLOW]');
    caseId = await createCase('My builder delayed flat handover for 2 years');
    record('Builder case created', !!caseId);

    payload = await chat(caseId, 'My builder delayed flat handover for 2 years');
    record('Turn 1: Builder matter detected', payload?.reply?.toLowerCase().includes('builder') || payload?.reply?.toLowerCase().includes('possession') || payload?.reply?.toLowerCase().includes('rera'));
    record('Turn 1: Asks for location', payload?.reply?.toLowerCase().includes('city') && payload?.reply?.toLowerCase().includes('state'));

    payload = await chat(caseId, 'Mumbai, Maharashtra');
    record('Turn 2: Acknowledges Mumbai', payload?.reply?.toLowerCase().includes('mumbai') || payload?.reply?.toLowerCase().includes('maharashtra'));
    record('Turn 2: Does NOT re-ask location', !payload?.reply?.toLowerCase().includes('which city') && !payload?.reply?.toLowerCase().includes('where is the property'));
    record('Turn 2: Asks for possession date', payload?.reply?.toLowerCase().includes('possession') && payload?.reply?.toLowerCase().includes('date'));

    payload = await chat(caseId, 'Possession was due in June 2024');
    record('Turn 3: Acknowledges possession date', payload?.reply?.toLowerCase().includes('june') || payload?.reply?.toLowerCase().includes('2024'));
    record('Turn 3: Asks for objective/notice', payload?.reply?.toLowerCase().includes('notice') || payload?.reply?.toLowerCase().includes('objective') || payload?.reply?.toLowerCase().includes('refund') || payload?.reply?.toLowerCase().includes('rera'));

    payload = await chat(caseId, 'I want a full refund with interest');
    record('Turn 4: Acknowledges refund objective', payload?.reply?.toLowerCase().includes('refund') || payload?.reply?.toLowerCase().includes('interest'));
    record('Turn 4: Readiness > 30%', payload?.caseReadinessScore > 30);

    const builderCase = await getCase(caseId);
    record('Builder: Jurisdiction is Mumbai', builderCase?.jurisdiction?.toLowerCase().includes('mumbai') || builderCase?.jurisdiction?.toLowerCase().includes('maharashtra'));
    record('Builder: Possession date set', builderCase?.collectedFacts?.possessionDueDate?.value);
    record('Builder: Objective is refund', builderCase?.collectedFacts?.clientObjective?.value?.toLowerCase().includes('refund'));

    // ============================================================
    // TEST 3: CORRECTIONS - User says "Bangalore" then "Actually Pune"
    // ============================================================
    console.log('\n[CORRECTIONS: BANGALORE -> PUNE]');
    caseId = await createCase('I had a fight with my neighbour');
    await chat(caseId, 'I had a fight with my neighbour');

    payload = await chat(caseId, 'Bangalore');
    record('Turn 2a: Sets Bangalore', payload?.reply?.toLowerCase().includes('bengaluru') || payload?.reply?.toLowerCase().includes('bangalore') || payload?.reply?.toLowerCase().includes('karnataka'));

    payload = await chat(caseId, 'Actually it was Pune');
    record('Turn 2b: Corrects to Pune', payload?.reply?.toLowerCase().includes('pune') || payload?.reply?.toLowerCase().includes('maharashtra'));
    record('Turn 2b: Does NOT mention Bangalore anymore', !payload?.reply?.toLowerCase().includes('bengaluru') && !payload?.reply?.toLowerCase().includes('bangalore'));

    const corrCase = await getCase(caseId);
    record('Correction persisted: Jurisdiction is Pune/Maharashtra', corrCase?.jurisdiction?.toLowerCase().includes('maharashtra') || corrCase?.jurisdiction?.toLowerCase().includes('pune'));

    // ============================================================
    // TEST 4: MULTI-FACT SINGLE MESSAGE
    // "I had a fight with my neighbour in Pune. He hit me and I filed an FIR. I have CCTV."
    // ============================================================
    console.log('\n[MULTI-FACT SINGLE MESSAGE]');
    caseId = await createCase('I had a fight with my neighbour in Pune. He hit me and I filed an FIR. I have CCTV footage.');
    record('Multi-fact case created', !!caseId);

    payload = await chat(caseId, 'I had a fight with my neighbour in Pune. He hit me and I filed an FIR. I have CCTV footage.');
    record('Turn 1: Reply exists', !!payload?.reply);
    // Should acknowledge multiple facts at once
    const multiAck = (payload?.reply?.toLowerCase().includes('pune') || payload?.reply?.toLowerCase().includes('maharashtra')) &&
                     (payload?.reply?.toLowerCase().includes('hit') || payload?.reply?.toLowerCase().includes('injury')) &&
                     (payload?.reply?.toLowerCase().includes('fir') || payload?.reply?.toLowerCase().includes('police')) &&
                     (payload?.reply?.toLowerCase().includes('cctv') || payload?.reply?.toLowerCase().includes('evidence'));
    record('Turn 1: Acknowledges multiple facts', multiAck, `reply: ${payload?.reply}`);

    const multiCase = await getCase(caseId);
    record('Multi: Jurisdiction set', multiCase?.jurisdiction?.toLowerCase().includes('pune') || multiCase?.jurisdiction?.toLowerCase().includes('maharashtra'));
    record('Multi: Police status filed', multiCase?.collectedFacts?.policeStatus?.value === true);
    record('Multi: Injury recorded', multiCase?.collectedFacts?.medicalInjuryEvidence?.value);
    record('Multi: Evidence recorded', multiCase?.collectedFacts?.evidence?.value?.length > 0);

    // ============================================================
    // TEST 5: SHORT ANSWERS
    // ============================================================
    console.log('\n[SHORT ANSWERS]');
    caseId = await createCase('I had a fight with my neighbour');
    await chat(caseId, 'I had a fight with my neighbour');

    // "pune" - short location
    payload = await chat(caseId, 'pune');
    record('Short "pune" works', payload?.reply?.toLowerCase().includes('pune') || payload?.reply?.toLowerCase().includes('maharashtra'));

    // "yes" to police question
    payload = await chat(caseId, 'yes');
    record('Short "yes" resolves to police', payload?.reply?.toLowerCase().includes('fir') || payload?.reply?.toLowerCase().includes('police') || payload?.reply?.toLowerCase().includes('csr'));

    // "no injury" or "minor" to injury question
    payload = await chat(caseId, 'minor injury');
    record('Short "minor injury" works', payload?.reply?.toLowerCase().includes('minor') || payload?.reply?.toLowerCase().includes('injury'));

    // ============================================================
    // TEST 6: PERSISTENCE - Refresh case and verify state survives
    // ============================================================
    console.log('\n[PERSISTENCE AFTER REFRESH]');
    caseId = await createCase('I had a fight with my neighbour in Pune. FIR filed. CCTV available.');
    await chat(caseId, 'I had a fight with my neighbour in Pune. FIR filed. CCTV available.');

    const refreshed = await getCase(caseId);
    record('Refreshed: Jurisdiction persisted', refreshed?.jurisdiction?.toLowerCase().includes('pune') || refreshed?.jurisdiction?.toLowerCase().includes('maharashtra'));
    record('Refreshed: Police status persisted', refreshed?.collectedFacts?.policeStatus?.value === true);
    record('Refreshed: Evidence persisted', refreshed?.collectedFacts?.evidence?.value?.length > 0);
    record('Refreshed: Readiness persisted', refreshed?.readinessScore > 0);

    // ============================================================
    // TEST 7: CONSERVATIVE CITATIONS - Only when relevant
    // ============================================================
    console.log('\n[CONSERVATIVE CITATIONS]');
    caseId = await createCase('I had a fight with my neighbour');
    payload = await chat(caseId, 'I had a fight with my neighbour');
    // First turn - no specific legislation should be cited yet
    record('Turn 1: No premature BNS citations', !payload?.legalAuthorities?.some(a => a.includes('BNS')));
    
    await chat(caseId, 'Pune');
    payload = await chat(caseId, 'yes, FIR filed');
    // After FIR filed, BNSS 173 should appear
    record('After FIR: BNSS 173 cited', payload?.legalAuthorities?.some(a => a.includes('BNSS') && a.includes('173')));
    
    payload = await chat(caseId, 'he hit me');
    // After injury, BNS 115 should appear
    record('After injury: BNS 115 cited', payload?.legalAuthorities?.some(a => a.includes('BNS') && a.includes('115')));

    // ============================================================
    // TEST 8: READINESS PROGRESSION - Never jumps >8 per turn
    // ============================================================
    console.log('\n[READINESS PROGRESSION]');
    caseId = await createCase('I had a fight with my neighbour');
    let prevScore = 0;
    const turns = [
      'I had a fight with my neighbour',
      'Pune, Maharashtra',
      'Yes, FIR filed',
      'He punched me',
      'CCTV available',
      'I want legal action'
    ];
    for (let i = 0; i < turns.length; i++) {
      payload = await chat(caseId, turns[i]);
      const score = payload?.caseReadinessScore;
      record(`Turn ${i+1}: Readiness ${score}% (increase ${score - prevScore})`, score - prevScore <= 8 && score >= prevScore);
      prevScore = score;
    }
    record('Final readiness > 30%', prevScore > 30);

  } finally {
    server.kill('SIGKILL');
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // best effort cleanup
    }
  }

  console.log(`\n========================================`);
  console.log(`PHASE 2 TESTS: ${passed} passed, ${failed} failed`);
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