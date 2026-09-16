#!/usr/bin/env node
/*
 * NYAYAI Advocate AI Legal Co-Counsel Integration Test Suite
 * Tests Drafting Assistance, Case Timeline Generator, Fact & Obligation Extractor,
 * and High Court Precedent Research.
 *
 * Usage: node tests/advocate-ai-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 5308;
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
    data = text;
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
      // waiting
    }
    await sleepMs(250);
  }
  return false;
}

async function main() {
  console.log('\n========================================');
  console.log('ADVOCATE AI CO-COUNSEL TEST SUITE');
  console.log('========================================\n');

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-advocate-ai-test-'));
  const server = spawn('node', ['dist/server.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(PORT),
      NYAYAI_DATA_DIR: dataDir,
      DATABASE_URL: '',
      PG_CONNECTION_STRING: '',
      NODE_ENV: 'test',
      JWT_SECRET: 'test-advocate-ai-secret'
    },
    stdio: ['ignore', 'ignore', 'inherit']
  });

  const stop = () => {
    try {
      server.kill('SIGKILL');
    } catch {}
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {}
  };
  process.on('exit', stop);
  process.on('SIGINT', () => { stop(); process.exit(1); });

  const up = await waitForServer();
  record('Server boots and /health responds', up);
  if (!up) {
    console.error('Server failed to boot on', PORT);
    stop();
    process.exit(1);
  }

  try {
    // 1. Register an advocate and a client
    const advEmail = `advocate-${Date.now()}@law.test`;
    const advReg = await req('POST', '/auth/register', {
      body: {
        name: 'Advocate Test Counsel',
        email: advEmail,
        password: 'Password123!',
        role: 'ADVOCATE'
      }
    });
    record('Advocate registers successfully', advReg.status === 201 && Boolean(advReg.data?.token));
    const advToken = advReg.data?.token;

    const clientEmail = `client-${Date.now()}@client.test`;
    const clientReg = await req('POST', '/auth/register', {
      body: {
        name: 'Client User Test',
        email: clientEmail,
        password: 'Password123!',
        role: 'CLIENT'
      }
    });
    record('Client registers successfully', clientReg.status === 201 && Boolean(clientReg.data?.token));
    const clientToken = clientReg.data?.token;

    // ==========================================
    // MODULE 1: DRAFTING ASSISTANCE
    // ==========================================
    console.log('\n[1. DRAFTING ASSISTANCE]');

    // Unauthenticated call rejected
    const unauthDraft = await req('POST', '/advocate/ai/draft', {
      body: { query: 'Draft a legal notice' }
    });
    record('Unauthenticated draft request rejected (401)', unauthDraft.status === 401);

    // Client role rejected
    const clientDraft = await req('POST', '/advocate/ai/draft', {
      token: clientToken,
      body: { query: 'Draft a legal notice' }
    });
    record('Client role rejected from advocate draft tool (403)', clientDraft.status === 403);

    // Empty query rejected
    const emptyDraft = await req('POST', '/advocate/ai/draft', {
      token: advToken,
      body: { query: '   ' }
    });
    record('Empty draft query rejected with 400', emptyDraft.status === 400);

    // Valid drafting generation
    const draftRes = await req('POST', '/advocate/ai/draft', {
      token: advToken,
      body: {
        query: 'Draft a legal notice for ₹48 lakhs refund under RERA Section 18 for delayed possession in Bengaluru.'
      }
    });
    record('Advocate receives 200 for draft generation', draftRes.status === 200);
    record('Draft output contains document type', Boolean(draftRes.data?.data?.documentType));
    record('Draft output contains structured draft language', Boolean(draftRes.data?.output && draftRes.data?.output.length > 50));
    record('Draft output contains professional disclaimer', Boolean(draftRes.data?.data?.disclaimer && draftRes.data.data.disclaimer.includes('AI-assisted draft')));

    // Unified /ai/chat endpoint works for drafting
    const unifiedDraft = await req('POST', '/advocate/ai/chat', {
      token: advToken,
      body: {
        tool: 'drafting',
        query: 'Draft an interlocutory application for interim relief in consumer dispute'
      }
    });
    record('Unified /advocate/ai/chat handles drafting tool', unifiedDraft.status === 200 && unifiedDraft.data?.tool === 'drafting');

    // ==========================================
    // MODULE 2: CASE TIMELINE GENERATOR
    // ==========================================
    console.log('\n[2. CASE TIMELINE GENERATOR]');

    const emptyTimeline = await req('POST', '/advocate/ai/timeline', {
      token: advToken,
      body: { query: '' }
    });
    record('Empty timeline input rejected with 400', emptyTimeline.status === 400);

    const timelineInput = 'Agreement signed on 12 March 2024. Payment made on 20 March 2024. Notice sent on 15 June 2024. Builder failed to respond. Complaint filed on 02 August 2024.';
    const timelineRes = await req('POST', '/advocate/ai/timeline', {
      token: advToken,
      body: { query: timelineInput }
    });

    record('Advocate receives 200 for timeline generation', timelineRes.status === 200);
    record('Timeline contains structured events array', Array.isArray(timelineRes.data?.data?.events) && timelineRes.data.data.events.length >= 3);

    // Verify dates are preserved
    const events = timelineRes.data?.data?.events || [];
    const eventDates = events.map(e => e.date).join(' ');
    record('Timeline extracts specific supplied dates (e.g. 12 Mar / March 2024)', /12.*Mar|March/i.test(eventDates));
    record('Timeline carries professional disclaimer', Boolean(timelineRes.data?.data?.disclaimer));

    // Unified endpoint works for timeline
    const unifiedTimeline = await req('POST', '/advocate/ai/chat', {
      token: advToken,
      body: {
        tool: 'timeline',
        query: timelineInput
      }
    });
    record('Unified /advocate/ai/chat handles timeline tool', unifiedTimeline.status === 200 && unifiedTimeline.data?.tool === 'timeline');

    // ==========================================
    // MODULE 3: FACT & OBLIGATION EXTRACTOR
    // ==========================================
    console.log('\n[3. FACT & OBLIGATION EXTRACTOR]');

    const factInput = 'Builder ABC Developers agreed to deliver possession of Unit 402 by 31 December 2023. Buyer paid ₹65,00,000. Builder failed to obtain Occupancy Certificate and possession is delayed by 14 months. Notice issued on 10 January 2024.';
    const factRes = await req('POST', '/advocate/ai/facts', {
      token: advToken,
      body: { query: factInput }
    });

    record('Advocate receives 200 for fact extraction', factRes.status === 200);
    record('Extraction contains confirmed facts', Array.isArray(factRes.data?.data?.confirmedFacts) && factRes.data.data.confirmedFacts.length > 0);
    record('Extraction contains inferred obligations', Array.isArray(factRes.data?.data?.inferredObligations));
    record('Extraction contains risks and issues', Array.isArray(factRes.data?.data?.risksAndIssues));
    record('Extraction contains missing info list', Array.isArray(factRes.data?.data?.missingInformation));
    record('Extraction carries professional disclaimer', Boolean(factRes.data?.data?.disclaimer));

    // Unified endpoint works for extraction
    const unifiedFacts = await req('POST', '/advocate/ai/chat', {
      token: advToken,
      body: {
        tool: 'extraction',
        query: factInput
      }
    });
    record('Unified /advocate/ai/chat handles extraction tool', unifiedFacts.status === 200 && unifiedFacts.data?.tool === 'extraction');

    // ==========================================
    // MODULE 4: HIGH COURT PRECEDENT RESEARCH
    // ==========================================
    console.log('\n[4. HIGH COURT PRECEDENT RESEARCH]');

    const emptyResearch = await req('POST', '/advocate/ai/precedents', {
      token: advToken,
      body: { query: '' }
    });
    record('Empty precedent query rejected with 400', emptyResearch.status === 400);

    const clientResearch = await req('POST', '/advocate/ai/precedents', {
      token: clientToken,
      body: { query: 'High Court delay possession RERA' }
    });
    record('Client role rejected from precedent research (403)', clientResearch.status === 403);

    const researchRes = await req('POST', '/advocate/ai/precedents', {
      token: advToken,
      body: {
        query: 'Find High Court decisions relating to delayed possession and builder refund under RERA'
      }
    });

    record('Advocate receives 200 for precedent research', researchRes.status === 200);
    record('Precedent response contains analysis or honest summary', Boolean(researchRes.data?.data?.analysis));
    record('Precedent response contains evidence list', Array.isArray(researchRes.data?.data?.evidence));
    record('Precedent response carries professional disclaimer', Boolean(researchRes.data?.data?.disclaimer));

    // Unified endpoint works for research
    const unifiedResearch = await req('POST', '/advocate/ai/chat', {
      token: advToken,
      body: {
        tool: 'research',
        query: 'Delayed possession refund RERA'
      }
    });
    record('Unified /advocate/ai/chat handles research tool', unifiedResearch.status === 200 && unifiedResearch.data?.tool === 'research');

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n========================================');
    console.log(`ADVOCATE AI RESULTS: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    if (failed > 0) {
      console.error('Failures:', failures);
      process.exitCode = 1;
    }
  } finally {
    stop();
  }
}

main().catch(err => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});
