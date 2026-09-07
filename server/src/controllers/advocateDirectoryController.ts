import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../db/database.js';
import { buildCaseRecommendations } from '../services/advocateRecommendationService.js';
import { logger } from '../utils/logger.js';

export async function listAdvocates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const directory = await db.getAdvocateDirectory();
    return res.status(200).json({ success: true, advocates: directory });
  } catch (err) {
    next(err);
  }
}

export async function getCaseRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    if (user.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only clients can request case recommendations.' });
    }

    const caseId = req.params.caseId as string;
    const caseRecord = await db.findCaseByIdAndClient(caseId, user.id);
    if (!caseRecord) {
      return res.status(404).json({ error: 'Not Found', message: `Case with ID ${caseId} not found for this account.` });
    }

    const budgetRaw = req.query.budget as string | undefined;
    const budget = budgetRaw && !Number.isNaN(Number(budgetRaw)) ? Number(budgetRaw) : undefined;

    const directory = await db.getAdvocateDirectory();

    let state: any = null;
    const snapshot = await db.getCaseStateSnapshot(caseId);
    if (snapshot) {
      try {
        state = JSON.parse(snapshot.state);
      } catch {
        state = null;
      }
    }

    if (!state) {
      state = {
        title: caseRecord.title,
        facts: {
          jurisdiction: { value: caseRecord.jurisdiction || '' },
          matter: { value: caseRecord.title }
        },
        practiceArea: caseRecord.practice_area || ''
      };
    }

    const recommendations = await buildCaseRecommendations(
      { facts: state.facts, practiceArea: state.practiceArea, title: state.title },
      directory,
      { budget, limit: 8 }
    );

    logger.info(`Recommendations generated for case ${caseId} (client ${user.id}): ${recommendations.length} advocates`);
    return res.status(200).json({
      success: true,
      caseId,
      ready: recommendations.length > 0,
      recommendations,
      allAdvocates: directory.map(d => ({
        advocateId: d.advocateId,
        name: d.name,
        avatar: d.avatar,
        title: d.title,
        practiceAreas: d.practiceAreas,
        jurisdiction: d.jurisdiction,
        court: d.court,
        experienceYears: d.experienceYears,
        consultationFee: d.consultationFee,
        verificationStatus: d.verificationStatus,
        verifiedCaseCount: d.verifiedCaseCount,
        location: d.location,
        bio: d.bio
      }))
    });
  } catch (err) {
    next(err);
  }
}