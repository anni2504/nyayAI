import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import type { CaseRecord } from '../db/types.js';
import type { CaseState } from '../types/index.js';
import { createInitialCaseState, processClientTurn } from './caseEngineService.js';
import { detectPracticeArea } from '../utils/practiceAreaUtils.js';
import { logger } from '../utils/logger.js';

export { detectPracticeArea };

export function stateFromRecord(record: CaseRecord): CaseState {
  if (!record.state) return createInitialCaseState(record.id);
  try {
    return JSON.parse(record.state) as CaseState;
  } catch (err) {
    logger.warn(`Could not parse persisted state for case ${record.id}; starting fresh.`, err);
    return createInitialCaseState(record.id);
  }
}

export async function createClientCase(clientId: string, initialPrompt?: string): Promise<CaseRecord> {
  const caseId = `case-${randomUUID().slice(0, 12)}`;
  const state = createInitialCaseState(caseId, initialPrompt);
  const now = new Date().toISOString();
  const record = await db.createCase({
    id: caseId,
    client_id: clientId,
    title: state.title,
    state: JSON.stringify(state),
    readiness_score: state.readinessScore,
    readiness_stage: state.readinessStage,
    jurisdiction: state.facts.jurisdiction.value || '',
    practice_area: detectPracticeArea(state),
    procedural_stage: state.facts.proceduralStage.value || '',
    created_at: now,
    updated_at: now
  });
  logger.info(`Created persisted case ${caseId} for client ${clientId}`);
  return record;
}

export async function getOwnedCase(clientId: string, caseId: string): Promise<CaseRecord | undefined> {
  return db.findCaseByIdAndClient(caseId, clientId);
}

export async function persistCaseState(record: CaseRecord, state: CaseState): Promise<CaseRecord | undefined> {
  const updated = await db.updateCase(record.id, {
    title: state.title,
    state: JSON.stringify(state),
    readiness_score: state.readinessScore,
    readiness_stage: state.readinessStage,
    jurisdiction: state.facts.jurisdiction.value || '',
    practice_area: detectPracticeArea(state),
    procedural_stage: state.facts.proceduralStage.value || ''
  });

  // Persist a structured state snapshot for queryable case-state access.
  const nowIso = new Date().toISOString();
  await db.saveCaseStateSnapshot({
    case_id: record.id,
    state: JSON.stringify(state),
    updated_at: nowIso
  });

  // Persist case messages to the relational store (idempotent, durable).
  const existingMessages = await db.getMessagesForCase(record.id);
  const existingIds = new Set(existingMessages.map(m => m.id));
  let counter = 0;
  for (const message of state.messages || []) {
    const messageId = `msg-${record.id}-${existingMessages.length + counter++}`;
    if (existingIds.has(messageId)) continue;
    await db.addCaseMessage({
      id: messageId,
      case_id: record.id,
      role: message.role,
      content: message.content,
      timestamp: (message as any).timestamp || nowIso,
      created_at: nowIso
    });
    existingIds.add(messageId);
  }

  return updated;
}

export async function runClientTurn(
  clientId: string,
  caseId: string,
  userMessage: string,
  attachment?: { name: string; size: string; type: string }
): Promise<CaseState | null> {
  const record = await getOwnedCase(clientId, caseId);
  if (!record) return null;

  const state = stateFromRecord(record);
  const updated = await processClientTurn(state, userMessage, attachment);
  await persistCaseState(record, updated);
  return updated;
}

export function summarizeCaseRecord(record: CaseRecord) {
  const state = stateFromRecord(record);
  const practiceArea = detectPracticeArea(state);
  const status = state.readinessScore >= 80 ? 'Ready for Counsel' : 'Analysis in Progress';
  const readinessBreakdown = {
    matterClarity: state.facts.matter?.value ? 1 : 0,
    facts: Math.min(1, (state.establishedFacts?.length || 0) / 6),
    jurisdiction: state.facts.jurisdiction?.value ? 1 : 0,
    legalDomain: state.facts.matter?.value ? 1 : 0,
    proceduralStage: state.facts.proceduralStage?.value ? 1 : 0,
    documents: Math.min(1, (state.documents?.length || 0) / 3),
    otherEvidence: (state.facts.evidence?.value?.length || 0) > 0 ? 1 : 0
  };

  return {
    id: record.id,
    clientId: record.client_id,
    title: record.title || state.title,
    practiceArea,
    jurisdiction: state.facts.jurisdiction?.value || 'Not specified',
    proceduralStage: state.facts.proceduralStage?.value || 'Not established',
    lastUpdated: record.updated_at,
    status,
    readinessScore: state.readinessScore,
    readinessStage: state.readinessStage,
    readinessBreakdown,
    caseUnderstanding: state.caseUnderstanding,
    missingInformation: state.missingInformation,
    legalDomain: practiceArea,
    documents: state.documents,
    recommendations: state.recommendationData,
    messages: state.messages,
    collectedFacts: state.facts,
    establishedFacts: state.establishedFacts,
    discoveryStatus: state.discoveryStatus,
    scoreHistory: state.scoreHistory,
    quickResponses: state.quickResponses,
    legalAuthorities: state.legalAuthorities
  };
}