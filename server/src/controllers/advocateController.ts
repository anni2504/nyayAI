import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { callGroqAPI, GroqChatMessage } from '../services/groqService.js';
import { mockAdvocateDatabase } from '../services/advocateEngineService.js';
import { getOrCreateCaseState } from '../services/caseEngineService.js';
import { analyzeDocumentContent } from '../services/documentEngineService.js';
import { logger } from '../utils/logger.js';

export async function handleAdvocateChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { tool, query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "query" string is required.' });
    }

    logger.info(`ADVOCATE AI request received for tool=${tool || 'general'}`);

    const promptMessages: GroqChatMessage[] = [
      {
        role: 'system',
        content: `You are NYAYAI Advocate Legal Suite Assistant. Provide professional Indian legal research, precedent analysis, petition drafting suggestions, and strategy.`
      },
      {
        role: 'user',
        content: `Tool: ${tool || 'Legal Analysis'}\nQuery: ${query}`
      }
    ];

    let output = '';
    try {
      output = await callGroqAPI(promptMessages, 0.2);
    } catch (err) {
      output = `[NYAYAI Advocate Legal Suite Analysis]\n\nBased on your query regarding "${query}", standard precedent analysis under relevant Indian High Court rulings suggests structuring your legal strategy by establishing clear timeline evidence, contractual obligations, and statutory provisions.`;
    }

    res.status(200).json({
      tool: tool || 'Legal Analysis',
      output
    });
  } catch (err) {
    next(err);
  }
}

export async function handleAdvocateDocumentAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { caseId, filename } = req.body;
    const activeCaseId = caseId || 'case-1';

    logger.info(`ADVOCATE document analysis requested for caseId=${activeCaseId}`);

    const caseState = getOrCreateCaseState(activeCaseId);
    const { analysis } = analyzeDocumentContent(caseState, filename || 'court_order.pdf', '2.5 MB', 'application/pdf');

    res.status(200).json({
      message: 'Advocate document work product generated.',
      analysis
    });
  } catch (err) {
    next(err);
  }
}

export async function handleAdvocateLeads(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    res.status(200).json({
      leadsCount: mockAdvocateDatabase.length,
      leads: mockAdvocateDatabase
    });
  } catch (err) {
    next(err);
  }
}
