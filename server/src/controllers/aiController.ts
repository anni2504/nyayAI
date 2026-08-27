import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { processClientTurn } from '../services/caseEngineService.js';
import { logger } from '../utils/logger.js';

export async function handleClientChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { caseId, message, attachment } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "message" string is required.' });
    }

    const activeCaseId = caseId || 'case-1';
    logger.info(`CLIENT AI Chat request received for caseId=${activeCaseId}`);

    const caseState = await processClientTurn(activeCaseId, message, attachment);

    const latestMessage = caseState.messages[caseState.messages.length - 1];

    const detectedPracticeArea = caseState.facts.matter.value
      ? (caseState.facts.matter.value.includes('Builder') ? 'RERA & Property Litigation' : 'Criminal Defense & Property')
      : 'Awaiting case details';

    res.status(200).json({
      reply: latestMessage ? latestMessage.content : 'Analysis generated.',
      caseId: caseState.caseId,
      collectedFacts: caseState.facts,
      caseUnderstanding: caseState.caseUnderstanding,
      missingInformation: caseState.missingInformation,
      establishedFacts: caseState.establishedFacts,
      caseReadinessScore: caseState.readinessScore,
      readinessStage: caseState.readinessStage,
      scoreHistory: caseState.scoreHistory,
      discoveryStatus: caseState.discoveryStatus,
      recommendationData: caseState.recommendationData,
      quickResponses: caseState.quickResponses,
      legalAuthorities: caseState.legalAuthorities,
      documents: caseState.documents,
      practiceArea: detectedPracticeArea,
      jurisdiction: caseState.facts.jurisdiction.value || 'Not specified',
      proceduralStage: caseState.facts.proceduralStage.value || 'Not established'
    });
  } catch (err) {
    next(err);
  }
}
