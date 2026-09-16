import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getOrCreateCaseState } from '../services/caseEngineService.js';
import { analyzeDocumentContent } from '../services/documentEngineService.js';
import {
  generateLegalDraft,
  generateCaseTimeline,
  extractFactsAndObligations,
  researchPrecedents
} from '../services/advocateCoCounselService.js';
import { logger } from '../utils/logger.js';

/**
 * Unified /advocate/ai/chat handler (backward-compatible and dispatches to specific tools)
 */
export async function handleAdvocateChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const { tool, query, caseId, filters, court, jurisdiction } = req.body || {};

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "query" string is required.' });
    }

    const activeTool = (tool || 'drafting').toLowerCase();
    logger.info(`ADVOCATE AI request received for tool=${activeTool} by advocate=${user.id}`);

    if (activeTool === 'drafting' || activeTool === 'draft') {
      const result = await generateLegalDraft(user.id, query, caseId);
      return res.status(200).json({
        tool: 'drafting',
        output: result.draftLanguage || result.matterSummary,
        data: result
      });
    }

    if (activeTool === 'timeline' || activeTool === 'chronology') {
      const result = await generateCaseTimeline(user.id, query, caseId);
      return res.status(200).json({
        tool: 'timeline',
        output: result.formattedText || result.summary,
        data: result
      });
    }

    if (activeTool === 'extraction' || activeTool === 'facts') {
      const result = await extractFactsAndObligations(user.id, query, caseId);
      return res.status(200).json({
        tool: 'extraction',
        output: result.formattedText,
        data: result
      });
    }

    if (activeTool === 'research' || activeTool === 'precedents') {
      const result = await researchPrecedents(user.id, query, {
        court: court || filters?.court,
        jurisdiction: jurisdiction || filters?.jurisdiction
      });
      return res.status(200).json({
        tool: 'research',
        output: result.formattedText || result.analysis,
        data: result
      });
    }

    // Default to drafting if tool unrecognized
    const result = await generateLegalDraft(user.id, query, caseId);
    return res.status(200).json({
      tool: activeTool,
      output: result.draftLanguage,
      data: result
    });
  } catch (err: any) {
    logger.warn(`Advocate AI assistant error: ${err.message}`);
    return res.status(500).json({
      error: 'advocate_ai_error',
      message: err.message || 'AI processing encountered an error.'
    });
  }
}

/**
 * Dedicated POST /advocate/ai/draft
 */
export async function handleAdvocateDraft(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const { query, caseId } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "query" is required.' });
    }

    const result = await generateLegalDraft(user.id, query, caseId);
    return res.status(200).json({
      success: true,
      tool: 'drafting',
      output: result.draftLanguage,
      data: result
    });
  } catch (err: any) {
    next(err);
  }
}

/**
 * Dedicated POST /advocate/ai/timeline
 */
export async function handleAdvocateTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const { query, caseId } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "query" is required.' });
    }

    const result = await generateCaseTimeline(user.id, query, caseId);
    return res.status(200).json({
      success: true,
      tool: 'timeline',
      output: result.formattedText,
      data: result
    });
  } catch (err: any) {
    next(err);
  }
}

/**
 * Dedicated POST /advocate/ai/facts
 */
export async function handleAdvocateFacts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const { query, caseId } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "query" is required.' });
    }

    const result = await extractFactsAndObligations(user.id, query, caseId);
    return res.status(200).json({
      success: true,
      tool: 'extraction',
      output: result.formattedText,
      data: result
    });
  } catch (err: any) {
    next(err);
  }
}

/**
 * Dedicated POST /advocate/ai/precedents
 */
export async function handleAdvocatePrecedents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const { query, court, jurisdiction, topK } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "query" is required.' });
    }

    const result = await researchPrecedents(user.id, query, { court, jurisdiction, topK });
    return res.status(200).json({
      success: true,
      tool: 'research',
      output: result.formattedText,
      data: result
    });
  } catch (err: any) {
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

