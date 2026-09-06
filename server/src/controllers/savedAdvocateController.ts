import { Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../db/database.js';
import { logger } from '../utils/logger.js';

export async function listSavedAdvocates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const records = await db.getSavedAdvocatesForClient(user.id);
    const advocates = records.map(r => parseAdvocateData(r.advocate_data));
    return res.status(200).json({ success: true, advocates });
  } catch (err) {
    next(err);
  }
}

export async function saveAdvocate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user || user.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only clients can save advocates' });
    }

    const advocate = req.body && (req.body.advocate || req.body);
    if (!advocate || typeof advocate !== 'object' || !advocate.id || !advocate.name) {
      return res.status(400).json({ error: 'Bad Request', message: 'A valid advocate object with "id" and "name" is required.' });
    }

    const now = new Date().toISOString();
    const record = await db.createSavedAdvocate({
      id: `saved-${randomUUID().slice(0, 10)}`,
      client_id: user.id,
      advocate_id: String(advocate.id),
      advocate_data: JSON.stringify(advocate),
      created_at: now
    });

    logger.info(`Client ${user.id} saved advocate ${record.advocate_id}`);
    return res.status(201).json({
      success: true,
      advocate: parseAdvocateData(record.advocate_data)
    });
  } catch (err) {
    next(err);
  }
}

export async function removeSavedAdvocate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const advocateId = req.params.advocateId as string;
    const deleted = await db.deleteSavedAdvocate(advocateId, user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: `Saved advocate ${advocateId} not found.` });
    }
    return res.status(200).json({ success: true, message: 'Saved advocate removed.' });
  } catch (err) {
    next(err);
  }
}

function parseAdvocateData(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}