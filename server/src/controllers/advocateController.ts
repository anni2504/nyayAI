import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { callGroqAPI, GroqChatMessage } from '../services/groqService.js';
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
        content: `You are NYAYAI Advocate Legal Suite Assistant. Provide professional Indian legal research, precedent analysis, petition drafting suggestions, and strategy. Cite only established statutes and landmark rulings you are confident about; clearly flag uncertainty.`
      },
      {
        role: 'user',
        content: `Tool: ${tool || 'Legal Analysis'}\nQuery: ${query}`
      }
    ];

    try {
      const output = await callGroqAPI(promptMessages, 0.2);
      return res.status(200).json({
        tool: tool || 'Legal Analysis',
        output
      });
    } catch (err: any) {
      logger.warn(`Advocate AI assistant unavailable (${err.message})`);
      return res.status(503).json({
        tool: tool || 'Legal Analysis',
        output: `[AI Legal Assistant unavailable]\n\nThe AI assistant is temporarily unavailable. Your query was: "${query}". Please try again shortly.`,
        error: 'groq_unavailable'
      });
    }
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
