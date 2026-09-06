import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createClientCase, detectPracticeArea, runClientTurn } from '../services/caseService.js';
import { createInitialCaseState } from '../services/caseEngineService.js';
import { logger } from '../utils/logger.js';

async function buildChatPayload(caseId: string, state: any) {
  const latestMessage = state.messages[state.messages.length - 1];

  return {
    reply: latestMessage ? latestMessage.content : 'Analysis generated.',
    caseId,
    collectedFacts: state.facts,
    caseUnderstanding: state.caseUnderstanding,
    missingInformation: state.missingInformation,
    establishedFacts: state.establishedFacts,
    caseReadinessScore: state.readinessScore,
    readinessStage: state.readinessStage,
    scoreHistory: state.scoreHistory,
    discoveryStatus: state.discoveryStatus,
    recommendationData: state.recommendationData,
    quickResponses: state.quickResponses,
    legalAuthorities: state.legalAuthorities,
    documents: state.documents,
    practiceArea: state.practiceArea || detectPracticeArea(state),
    jurisdiction: state.facts.jurisdiction.value || 'Not specified',
    proceduralStage: state.facts.proceduralStage.value || 'Not established',
    extractedFacts: state.lastExtracted || []
  };
}

export async function handleClientChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { caseId, message, attachment } = req.body;
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const clientId = req.user.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "message" string is required.' });
    }

    if (!caseId || typeof caseId !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "caseId" string is required.' });
    }

    // If a caseId does not exist yet for this user, create it as a persisted,
    // user-owned case (idempotent for the first message of a brand new case).
    const record = await runClientTurn(clientId, caseId, message, attachment);
    if (record) {
      const payload = await buildChatPayload(caseId, record);
      logger.info(`CLIENT AI Chat request processed for caseId=${caseId}`);
      return res.status(200).json(payload);
    }

    // No persisted case yet -> create one, keep the 0% baseline, and echo the
    // message as the initial chat turn.
    const fresh = await createClientCase(clientId, message.slice(0, 35));
    const state = createInitialCaseState(fresh.id);
    state.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    state.title = message.slice(0, 35) + '...';
    const payload = await buildChatPayload(fresh.id, state);
    logger.info(`CLIENT AI Chat created new case ${fresh.id} for client ${clientId}`);
    return res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
}