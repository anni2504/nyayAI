#!/usr/bin/env node
/*
 * NYAYAI Phase 4 Integration Test Suite
 * Document Intelligence: store-only upload, explicit one-time analysis,
 * honest deterministic extraction (no fabricated facts), ownership, and
 * documents.analysis persistence in PostgreSQL.
 *
 * Runs against REAL Neon (server/.env) with GROQ_API_KEY blanked to force the
 * honest deterministic engine (no LLM quota consumed, fully reproducible).
 *
 * Usage (from server/):  node tests/phase4-tests.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const HOST = '127.0.0.1';
const PORT = 5312;
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
    console.error('  SKIP  No DATABASE_URL configured in server/.env. Aborting Phase 4 (needs Neon).');
    process.exit(2);
  }
}

async function main() {
  assertDbConfig();

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nyayai-phase4-test-'));
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
    if (!up) {
      server.kill('SIGKILL');
      process.exit(1);
    }
    await client.connect();

    const unique = Date.now();
    const email1 = `doc-client-a-${unique}@nyayai.test`;
    const email2 = `doc-client-b-${unique}@nyayai.test`;

    const signupA = await req('POST', '/auth/register', {
      body: { name: 'Doc Client A', email: email1, password: 'StrongPass123!', role: 'CLIENT' }
    });
    const signupB = await req('POST', '/auth/register', {
      body: { name: 'Doc Client B', email: email2, password: 'StrongPass123!', role: 'CLIENT' }
    });
    record('Two clients register', signupA.status === 201 && signupB.status === 201, `a=${signupA.status}, b=${signupB.status}`);
    const tokenA = signupA.data?.token || signupA.data?.data?.token;
    const tokenB = signupB.data?.token || signupB.data?.data?.token;

    // ---- 1. Upload does NOT auto-analyze (explicit analysis required) ----
    const stored = await req('POST', '/documents', {
      token: tokenA,
      body: {
        filename: 'agreement-sale-deed.pdf',
        fileSize: '2.1 MB',
        fileType: 'application/pdf',
        caseId: null
      }
    });
    record('POST /documents stores without analysis', stored.status === 201, `got ${stored.status}`);
    const docA = stored.data?.document;
    record('Stored document analysis_status is STORED', docA?.analysis_status === 'STORED', `${docA?.analysis_status}`);
    record('Stored document has no analysis yet', !docA?.analysis, JSON.stringify(docA && { analysis: docA.analysis }));

    // ---- 2. Legacy /documents/upload is store-only now ----
    const legacyUpload = await req('POST', '/documents/upload', {
      token: tokenA,
      body: { filename: 'fir-copy.docx', fileSize: '1.0 MB', fileType: 'application/octet-stream', caseId: null }
    });
    record('POST /documents/upload is store-only (no auto-analysis)', legacyUpload.status === 201 && legacyUpload.data?.analysisStatus === 'STORED', `status=${legacyUpload.status}, analysisStatus=${legacyUpload.data?.analysisStatus}`);

    // ---- 3. Explicit Analyze on a case document -> honest REVIEW REQUIRED ----
    const analyzeCaseDoc = await req('POST', `/documents/${docA.id}/analyze`, {
      token: tokenA,
      body: {}
    });
    record('POST /documents/:id/analyze returns success', analyzeCaseDoc.status === 200, `got ${analyzeCaseDoc.status}`);
    const analysisStatus = analyzeCaseDoc.data?.analysis?.analysisStatus || analyzeCaseDoc.data?.analysisStatus;
    record('Case doc analysis is REVIEW REQUIRED (contents not read)', analysisStatus === 'REVIEW REQUIRED', `got ${analysisStatus}`);

    const entities = analyzeCaseDoc.data?.analysis?.extractedEntities || {};
    record('No fabricated FIR/case numbers', !(entities.firOrCaseNumbers && entities.firOrCaseNumbers.length), JSON.stringify(entities.firOrCaseNumbers));
    record('No fabricated police station / court', !entities.courtOrPoliceStation || entities.courtOrPoliceStation === 'Not specified' || entities.courtOrPoliceStation === '', `got ${entities.courtOrPoliceStation}`);
    record('No fabricated legal sections', !(entities.legalSections && entities.legalSections.length), JSON.stringify(entities.legalSections));

    // ---- 4. Analysis persisted in documents.analysis in PG ----
    const { rows: persisted } = await client.query('SELECT id, analysis, analysis_status FROM documents WHERE id = $1', [docA.id]);
    record('analysis persisted to documents.analysis in PG', persisted.length === 1 && persisted[0].analysis !== null && persisted[0].analysis_status === 'REVIEW REQUIRED', JSON.stringify(persisted[0] && { status: persisted[0].analysis_status, hasAnalysis: persisted[0].analysis !== null }));

    // ---- 5. Re-analyze returns alreadyAnalyzed, no duplicate work ----
    const reAnalyze = await req('POST', `/documents/${docA.id}/analyze`, {
      token: tokenA,
      body: {}
    });
    record('Re-analyze reports alreadyAnalyzed=true', reAnalyze.data?.alreadyAnalyzed === true, `got ${reAnalyze.data?.alreadyAnalyzed}`);

    // ---- 6. Force re-analyze runs again (reproduces same status) ----
    const forceAnalyze = await req('POST', `/documents/${docA.id}/analyze`, {
      token: tokenA,
      body: { force: true }
    });
    record('Force re-analyze allowed', forceAnalyze.status === 200 && (forceAnalyze.data?.analysis?.analysisStatus === 'REVIEW REQUIRED'), `got ${forceAnalyze.status}`);

    // ---- 7. Identity document -> ANALYZED with honest masking ----
    const idDoc = await req('POST', '/documents', {
      token: tokenA,
      body: { filename: 'my-aadhaar-card.pdf', fileSize: '0.8 MB', fileType: 'application/pdf', caseId: null }
    });
    const idDocRecord = idDoc.data?.document;
    const analyzeId = await req('POST', `/documents/${idDocRecord.id}/analyze`, { token: tokenA, body: {} });
    record('Identity doc analyzed', analyzeId.data?.analysis?.analysisStatus === 'ANALYZED', `got ${analyzeId.data?.analysis?.analysisStatus}`);
    record('Identity doc PII masked honestly (no fake number)', String(analyzeId.data?.analysis?.maskedIdentifier || '') === 'REDACTED', `got ${analyzeId.data?.analysis?.maskedIdentifier}`);
    record('Identity doc contributes zero case facts', !(analyzeId.data?.analysis?.extractedCaseFacts && analyzeId.data?.analysis?.extractedCaseFacts.length), JSON.stringify(analyzeId.data?.analysis?.extractedCaseFacts));

    // ---- 8. Ownership: client B cannot analyze client A document ----
    const ownerHttp = req('POST', `/documents/${docA.id}/analyze`, { token: tokenB, body: {} });
    const foreignGet = req('GET', `/documents`, { token: tokenB });
    const [ownerRes, foreignRes] = await Promise.all([ownerHttp, foreignGet]);
    const foreignHasDoc = (foreignRes.data?.documents || []).some(d => d.id === docA.id);
    record('Other client cannot analyze someone else\'s document', ownerRes.status === 403 || ownerRes.status === 404, `got ${ownerRes.status}`);
    record('Other client cannot see foreign document in their vault', !foreignHasDoc, `got ${foreignHasDoc}`);

    // ---- 9. Case-linked analysis updates case state snapshot ----
    const createdCase = await req('POST', '/cases', {
      token: tokenA,
      body: { initialPrompt: 'A builder refused to refund my deposit for a delayed project in Bengaluru.' }
    });
    const caseId = createdCase.data?.case?.id;
    record('Client creates case for linked doc analysis', !!caseId, `got ${caseId}`);

    if (caseId) {
      await req('POST', '/ai/chat', { token: tokenA, body: { caseId, message: 'It is an RERA matter in Karnataka state.' } });
      await sleepMs(200);

      const linkedDoc = await req('POST', '/documents', {
        token: tokenA,
        body: { filename: 'notice-from-builder.pdf', fileSize: '1.2 MB', fileType: 'application/pdf', caseId }
      });
      const linked = linkedDoc.data?.document;

      const linkedAnalyze = await req('POST', `/documents/${linked.id}/analyze`, { token: tokenA, body: {} });
      record('Linked case doc analyzed successfully', linkedAnalyze.status === 200, `got ${linkedAnalyze.status} ${linkedAnalyze.data?.message || ''}`);

      const { rows: snapshots } = await client.query('SELECT state FROM case_state WHERE case_id = $1 ORDER BY updated_at DESC LIMIT 1', [caseId]);
      const stateJson = snapshots.length ? snapshots[0].state : null;
      const state = stateJson ? JSON.parse(stateJson) : null;
      const docInState = state && Array.isArray(state.documents) && state.documents.some(d => d.name === 'notice-from-builder.pdf');
      record('Linked document recorded in case state snapshot', docInState === true, `got ${docInState}`);

      const { rows: docRows2 } = await client.query('SELECT analysis_status FROM documents WHERE id = $1', [linked.id]);
      record('Linked document analysis persisted (case-linked path)', docRows2.length === 1 && docRows2[0].analysis_status === 'REVIEW REQUIRED', JSON.stringify(docRows2[0]));
    }

  } finally {
    if (client) await client.end().catch(() => {});
    server.kill('SIGKILL');
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\nPhase 4 Results: ${passed} passed, ${failed} failed`);
  if (failures.length) console.log('Failed:', failures.join(' | '));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Phase 4 suite crashed:', err);
  process.exit(1);
});