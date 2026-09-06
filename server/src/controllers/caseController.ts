import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../db/database.js';
import { createClientCase, getOwnedCase, summarizeCaseRecord } from '../services/caseService.js';
import { logger } from '../utils/logger.js';

export async function listCases(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const records = await db.getCasesForClient(user.id);
    const cases = records.map(summarizeCaseRecord);
    return res.status(200).json({ success: true, cases });
  } catch (err: any) {
    logger.error('Error listing cases:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function createCase(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only clients can create cases' });
    }

    const { title, initialPrompt } = req.body;
    const prompt = initialPrompt || title;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "initialPrompt" (string) is required.' });
    }

    const record = await createClientCase(user.id, prompt.slice(0, 35));
    return res.status(201).json({ success: true, case: summarizeCaseRecord(record) });
  } catch (err: any) {
    logger.error('Error creating case:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function getCase(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const caseId = req.params.caseId as string;
    const record = await getOwnedCase(user.id, caseId);
    if (!record) {
      return res.status(404).json({ error: 'Not Found', message: `Case ${caseId} not found or does not belong to you.` });
    }
    return res.status(200).json({ success: true, case: summarizeCaseRecord(record) });
  } catch (err: any) {
    logger.error('Error getting case:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function updateCase(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const caseId = req.params.caseId as string;
    const existing = await getOwnedCase(user.id, caseId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: `Case ${caseId} not found or does not belong to you.` });
    }

    const allowed: Array<keyof typeof existing> = ['title'];
    const updates: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'title' && typeof req.body[key] !== 'string') {
          return res.status(400).json({ error: 'Bad Request', message: 'Field "title" must be a string.' });
        }
        updates[key] = req.body[key];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'No updatable fields provided.' });
    }

    const updated = await db.updateCase(caseId, updates);
    return res.status(200).json({ success: true, case: summarizeCaseRecord(updated!) });
  } catch (err: any) {
    logger.error('Error updating case:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}