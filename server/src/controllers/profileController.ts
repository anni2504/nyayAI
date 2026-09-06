import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../db/database.js';
import { sanitizeUser } from '../services/authService.js';
import { logger } from '../utils/logger.js';

export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const record = await db.findUserById(user.id);
    if (!record) {
      return res.status(404).json({ error: 'Not Found', message: 'User account not found.' });
    }
    return res.status(200).json({ success: true, user: sanitizeUser(record) });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const record = await db.findUserById(user.id);
    if (!record) {
      return res.status(404).json({ error: 'Not Found', message: 'User account not found.' });
    }

    const updates: Record<string, any> = {};
    const rejected: string[] = [];

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || req.body.name.trim().length < 2) {
        return res.status(400).json({ error: 'Bad Request', message: 'Name must be at least 2 characters long.' });
      }
      updates.name = req.body.name.trim();
    }
    if (req.body.phone !== undefined) {
      if (req.body.phone !== null && typeof req.body.phone !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: 'Phone must be a string.' });
      }
      updates.phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : undefined;
    }
    if (req.body.preferredLanguage !== undefined) {
      if (req.body.preferredLanguage !== null && typeof req.body.preferredLanguage !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: 'Preferred language must be a string.' });
      }
      updates.preferredLanguage = typeof req.body.preferredLanguage === 'string' ? req.body.preferredLanguage.trim() : undefined;
    }
    if (req.body.privacyConsent !== undefined) {
      if (typeof req.body.privacyConsent !== 'boolean') {
        return res.status(400).json({ error: 'Bad Request', message: 'Privacy consent must be a boolean.' });
      }
      updates.privacyConsent = req.body.privacyConsent;
    }
    if (req.body.avatar !== undefined) {
      if (typeof req.body.avatar !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: 'Avatar must be a URL string.' });
      }
      updates.avatar = req.body.avatar;
    }

    // Immutable identity fields: silently reject attempts to spoof them.
    for (const key of ['email', 'role', 'id', 'password']) {
      if (req.body[key] !== undefined) rejected.push(key);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'No updatable fields provided.' });
    }

    const updated = await db.updateUser(user.id, updates);
    logger.info(`Profile updated for user ${user.id}${rejected.length ? ` (rejected immutable fields: ${rejected.join(', ')})` : ''}`);
    return res.status(200).json({
      success: true,
      user: sanitizeUser(updated!),
      rejectedFields: rejected.length ? rejected : undefined
    });
  } catch (err) {
    next(err);
  }
}