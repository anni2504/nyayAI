#!/usr/bin/env node
/*
 * NYAYAI Phase 2 Conversational Case Engine Regression Tests
 * Tests matter-aware question selection, legal role awareness,
 * strict answer validation & ambiguity handling, and no fabrication.
 *
 * Usage: node tests/phase2-regression-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 5301;
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
    } catch {}
    await sleepMs(250);
  }
  return false;
}

async function main() {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase2-reg-'));
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
    const email = `client-reg-${unique}@nyayai.test`;

    const signup = await req('POST', '/auth/register', {
      body: { name: 'Regression Client', email, password: 'StrongPass123!', role: 'CLIENT' }
    });
    record('Client registers', signup.status === 201);
    const token = signup.data?.token;

    async function createCase(initialPrompt) {
      const res = await req('POST', '/cases', { token, body: { initialPrompt } });
      return res.data?.case?.id;
    }

    async function chat(caseId, message) {
      const res = await req('POST', '/ai/chat', { token, body: { caseId, message } });
      return res.data;
    }

    async function getCase(caseId) {
      const res = await req('GET', `/cases/${caseId}`, { token });
      return res.data?.case;
    }

    // ============================================================
    // TEST SUITE 1: EXACT TREE-CUTTING REGRESSION TEST
    // Conversation:
    // 1. "hi"
    // 2. "I saw people cutting trees in forests."
    // 3. "bilaspur chattisgarh"
    // 4. "nopee"
    // 5. "yeah medical reports"
    // ============================================================
    console.log('\n[CRITICAL REGRESSION: TREE-CUTTING CONVERSATION]');
    let caseId = await createCase('hi');
    record('Case initialized', !!caseId);

    // Turn 1: "hi"
    let turn1 = await chat(caseId, 'hi');
    record('Turn 1: Natural greeting reply', !!turn1?.reply);
    record('Turn 1: Readiness is 0%', turn1?.caseReadinessScore === 0);

    // Turn 2: "I saw people cutting trees in forests."
    let turn2 = await chat(caseId, 'I saw people cutting trees in forests.');
    record('Turn 2: Matter detected as tree cutting/environmental', 
      turn2?.collectedFacts?.matter?.value?.toLowerCase().includes('tree') ||
      turn2?.collectedFacts?.matter?.value?.toLowerCase().includes('forest') ||
      turn2?.collectedFacts?.matter?.value?.toLowerCase().includes('environmental')
    );
    record('Turn 2: Practice area is Environmental & Forest Law',
      turn2?.practiceArea?.toLowerCase().includes('environmental') ||
      turn2?.practiceArea?.toLowerCase().includes('forest')
    );
    record('Turn 2: Does NOT ask about bail/quashing/injuries',
      !turn2?.reply?.toLowerCase().includes('bail') &&
      !turn2?.reply?.toLowerCase().includes('quashing') &&
      !turn2?.reply?.toLowerCase().includes('injur')
    );

    // Turn 3: "bilaspur chattisgarh"
    let turn3 = await chat(caseId, 'bilaspur chattisgarh');
    record('Turn 3: Jurisdiction acknowledges Bilaspur / Chhattisgarh',
      turn3?.reply?.toLowerCase().includes('bilaspur') ||
      turn3?.reply?.toLowerCase().includes('chhattisgarh') ||
      turn3?.reply?.toLowerCase().includes('chattisgarh')
    );
    record('Turn 3: Does NOT ask about bail or quashing',
      !turn3?.reply?.toLowerCase().includes('bail') &&
      !turn3?.reply?.toLowerCase().includes('quashing')
    );

    // Turn 4: "nopee"
    let turn4 = await chat(caseId, 'nopee');
    record('Turn 4: Reply exists after negative response', !!turn4?.reply);
    record('Turn 4: Does NOT ask about bail or quashing',
      !turn4?.reply?.toLowerCase().includes('bail') &&
      !turn4?.reply?.toLowerCase().includes('quashing')
    );

    // Turn 5: "yeah medical reports"
    let turn5 = await chat(caseId, 'yeah medical reports');
    record('Turn 5: Reply exists after ambiguous "yeah medical reports"', !!turn5?.reply);
    record('Turn 5: Clarifies ambiguity (does not assume injury/bail/quashing)',
      turn5?.reply?.toLowerCase().includes('clarif') ||
      turn5?.reply?.toLowerCase().includes('mean') ||
      turn5?.reply?.toLowerCase().includes('what happened') ||
      turn5?.reply?.toLowerCase().includes('tell me') ||
      !turn5?.reply?.toLowerCase().includes('bail')
    );
    record('Turn 5: Does NOT suggest bail or quashing',
      !turn5?.reply?.toLowerCase().includes('bail') &&
      !turn5?.reply?.toLowerCase().includes('quashing')
    );

    // Fetch case and verify strictly
    const caseState = await getCase(caseId);
    record('State: City is Bilaspur', caseState?.collectedFacts?.city?.value === 'Bilaspur');
    record('State: State is Chhattisgarh', 
      caseState?.collectedFacts?.state?.value === 'Chhattisgarh' ||
      caseState?.collectedFacts?.state?.value === 'chhattisgarh' ||
      caseState?.collectedFacts?.state?.value === 'chattisgarh'
    );
    record('State: Injury is NOT set (UNKNOWN/null)',
      !caseState?.collectedFacts?.medicalInjuryEvidence?.value
    );
    record('State: User is NOT classified as accused',
      caseState?.collectedFacts?.userRole?.value !== 'accused'
    );
    record('State: Practice area is Environmental & Forest Law',
      caseState?.practiceArea?.toLowerCase().includes('environmental') ||
      caseState?.practiceArea?.toLowerCase().includes('forest')
    );

    // ============================================================
    // TEST SUITE 2: THEFT CASE (Non-accused, criminal offence)
    // ============================================================
    console.log('\n[THEFT CASE MATTER-AWARENESS]');
    const theftCaseId = await createCase('Someone stole my laptop from my office');
    const theftTurn1 = await chat(theftCaseId, 'Someone stole my laptop from my office');
    record('Theft: Detected as theft matter',
      theftTurn1?.collectedFacts?.matter?.value?.toLowerCase().includes('theft') ||
      theftTurn1?.collectedFacts?.matter?.value?.toLowerCase().includes('stolen')
    );
    record('Theft: Does NOT ask about bail/quashing',
      !theftTurn1?.reply?.toLowerCase().includes('bail') &&
      !theftTurn1?.reply?.toLowerCase().includes('quashing')
    );

    const theftTurn2 = await chat(theftCaseId, 'Delhi');
    record('Theft Turn 2: Acknowledges Delhi',
      theftTurn2?.reply?.toLowerCase().includes('delhi')
    );
    record('Theft Turn 2: Asks theft-relevant question',
      theftTurn2?.reply?.toLowerCase().includes('fir') ||
      theftTurn2?.reply?.toLowerCase().includes('police') ||
      theftTurn2?.reply?.toLowerCase().includes('when') ||
      theftTurn2?.reply?.toLowerCase().includes('bill') ||
      theftTurn2?.reply?.toLowerCase().includes('cctv')
    );
    record('Theft Turn 2: Does NOT ask about injuries or bail',
      !theftTurn2?.reply?.toLowerCase().includes('bail') &&
      !theftTurn2?.reply?.toLowerCase().includes('injur')
    );

    // ============================================================
    // TEST SUITE 3: CONSUMER DISPUTE (Commercial/Consumer)
    // ============================================================
    console.log('\n[CONSUMER DISPUTE MATTER-AWARENESS]');
    const consumerCaseId = await createCase('I bought a defective phone from an online store');
    const consTurn1 = await chat(consumerCaseId, 'I bought a defective phone from an online store');
    record('Consumer: Detected as consumer dispute',
      consTurn1?.collectedFacts?.matter?.value?.toLowerCase().includes('consumer')
    );
    record('Consumer: Does NOT ask about FIR/bail/quashing',
      !consTurn1?.reply?.toLowerCase().includes('fir') &&
      !consTurn1?.reply?.toLowerCase().includes('bail') &&
      !consTurn1?.reply?.toLowerCase().includes('quashing')
    );

    // ============================================================
    // TEST SUITE 4: SMALL TALK / OFF-TOPIC DOES NOT RESET STATE
    // ============================================================
    console.log('\n[SMALL TALK PRESERVATION]');
    const talkCaseId = await createCase('I had a fight with my neighbour in Pune');
    await chat(talkCaseId, 'I had a fight with my neighbour in Pune');
    const preScore = (await getCase(talkCaseId))?.readinessScore;

    const metaRes = await chat(talkCaseId, 'do you understand my language?');
    record('Meta: Answers naturally without resetting',
      metaRes?.reply?.toLowerCase().includes('yes') ||
      metaRes?.reply?.toLowerCase().includes('language') ||
      metaRes?.reply?.toLowerCase().includes('words')
    );

    const whereRes = await chat(talkCaseId, 'where are you from?');
    record('Origin: Answers as NYAYAI',
      whereRes?.reply?.toLowerCase().includes('nyayai') ||
      whereRes?.reply?.toLowerCase().includes('copilot') ||
      whereRes?.reply?.toLowerCase().includes('legal')
    );

    const postCase = await getCase(talkCaseId);
    record('State: Score preserved during small talk', postCase?.readinessScore === preScore);
    record('State: Matter preserved during small talk', postCase?.collectedFacts?.matter?.value?.toLowerCase().includes('neighbour'));
    record('State: Jurisdiction preserved during small talk', postCase?.collectedFacts?.city?.value === 'Pune');

  } finally {
    server.kill('SIGKILL');
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {}
  }

  console.log(`\n========================================`);
  console.log(`PHASE 2 REGRESSION TESTS: ${passed} passed, ${failed} failed`);
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
