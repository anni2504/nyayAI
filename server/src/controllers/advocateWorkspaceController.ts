import { Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db, AdvocateCaseHistoryRecord } from '../db/database.js';
import { logger } from '../utils/logger.js';

const BOOKING_STATUS_FLOW: Record<string, string[]> = {
  pending: ['accepted', 'declined'],
  accepted: ['cancelled'],
  upcoming: ['cancelled']
};

function nowIso(): string {
  return new Date().toISOString();
}

export async function getWorkspaceStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const bookings = await db.getBookingsForUser(user.id, 'ADVOCATE');
    const caseHistory = await db.getAdvocateCaseHistory(user.id);

    const pendingRequests = bookings.filter(b => b.status === 'pending');
    const upcomingConsultations = bookings.filter(b => ['accepted', 'upcoming'].includes(b.status as string));
    const completedConsultations = bookings.filter(b => b.status === 'completed');
    const activeClientIds = new Set(bookings.filter(b => !['cancelled', 'declined'].includes(b.status as string)).map(b => b.clientId));
    const verifiedCaseRecords = caseHistory.filter(h => h.verification_status === 'verified');

    return res.status(200).json({
      success: true,
      stats: {
        pendingRequests: pendingRequests.length,
        upcomingConsultations: upcomingConsultations.length,
        activeClients: activeClientIds.size,
        verifiedCaseRecords: verifiedCaseRecords.length,
        totalConsultations: completedConsultations.length,
        totalMatters: activeClientIds.size + completedConsultations.length
      },
      recentRequests: pendingRequests.slice(0, 6),
      upcoming: upcomingConsultations.slice(0, 6)
    });
  } catch (err) {
    next(err);
  }
}

export async function listCaseHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    const records = await db.getAdvocateCaseHistory(user.id);
    return res.status(200).json({ success: true, records });
  } catch (err) {
    next(err);
  }
}

export async function createCaseHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const { caseTitle, court, year, caseType, practiceArea, jurisdiction, outcome, status } = req.body || {};
    if (!caseTitle || typeof caseTitle !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "caseTitle" is required.' });
    }

    const record: AdvocateCaseHistoryRecord = {
      id: `ach-${randomUUID().slice(0, 10)}`,
      advocate_id: user.id,
      case_title: caseTitle,
      court: court || '',
      year: Number(year || new Date().getFullYear()),
      case_type: caseType || '',
      practice_area: practiceArea || '',
      jurisdiction: jurisdiction || '',
      outcome: outcome || '',
      status: status || 'ongoing',
      verification_status: 'unverified',
      created_at: nowIso()
    };

    const created = await db.addAdvocateCaseHistory(record);
    logger.info(`Advocate ${user.id} added case history ${created.id}`);
    return res.status(201).json({ success: true, record: created });
  } catch (err) {
    next(err);
  }
}

export async function updateCaseHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    const id = req.params.id as string;

    const existing = (await db.getAdvocateCaseHistory(user.id)).find(r => r.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: `Case history record ${id} not found.` });
    }

    const { caseTitle, court, year, caseType, practiceArea, jurisdiction, outcome, status } = req.body || {};
    const updated = await db.updateAdvocateCaseHistory({
      ...existing,
      case_title: caseTitle ?? existing.case_title,
      court: court ?? existing.court,
      year: Number(year ?? existing.year),
      case_type: caseType ?? existing.case_type,
      practice_area: practiceArea ?? existing.practice_area,
      jurisdiction: jurisdiction ?? existing.jurisdiction,
      outcome: outcome ?? existing.outcome,
      status: status ?? existing.status
    });
    return res.status(200).json({ success: true, record: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteCaseHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    const id = req.params.id as string;
    const deleted = await db.deleteAdvocateCaseHistory(id, user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: `Case history record ${id} not found.` });
    }
    return res.status(200).json({ success: true, message: 'Case history record deleted.' });
  } catch (err) {
    next(err);
  }
}

export async function getOwnProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const profile = await db.getAdvocateProfile(user.id);
    const fullUser = await db.findUserById(user.id);

    return res.status(200).json({
      success: true,
      profile: {
        advocateId: user.id,
        name: fullUser?.name || user.name,
        avatar: fullUser?.avatar,
        email: fullUser?.email,
        title: fullUser?.title,
        barNumber: fullUser?.barNumber,
        phone: fullUser?.phone,
        practiceAreas: (profile?.practice_areas || '').split(',').map(s => s.trim()).filter(Boolean),
        jurisdiction: profile?.jurisdiction || '',
        court: profile?.court || '',
        experienceYears: profile?.experience_years || 0,
        consultationFee: profile?.consultation_fee || '',
        bio: profile?.bio || '',
        location: profile?.location || '',
        languages: (profile?.languages || '').split(',').map(s => s.trim()).filter(Boolean),
        verificationStatus: profile?.verification_status || 'unverified'
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOwnProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const b = req.body || {};

    if (typeof b.name === 'string' || typeof b.title === 'string' || typeof b.barNumber === 'string' || typeof b.phone === 'string') {
      await db.updateUser(user.id, {
        ...(typeof b.name === 'string' ? { name: b.name } : {}),
        ...(typeof b.title === 'string' ? { title: b.title } : {}),
        ...(typeof b.barNumber === 'string' ? { barNumber: b.barNumber } : {}),
        ...(typeof b.phone === 'string' ? { phone: b.phone } : {})
      });
    }

    const existing = await db.getAdvocateProfile(user.id);
    const profile = {
      advocate_id: user.id,
      practice_areas: Array.isArray(b.practiceAreas) ? b.practiceAreas.map((s: string) => s.trim()).filter(Boolean).join(',') : (existing?.practice_areas || ''),
      jurisdiction: typeof b.jurisdiction === 'string' ? b.jurisdiction : (existing?.jurisdiction || ''),
      court: typeof b.court === 'string' ? b.court : (existing?.court || ''),
      experience_years: typeof b.experienceYears === 'number' ? b.experienceYears : (existing?.experience_years || 0),
      consultation_fee: typeof b.consultationFee === 'string' ? b.consultationFee : (existing?.consultation_fee || ''),
      bio: typeof b.bio === 'string' ? b.bio : (existing?.bio || ''),
      location: typeof b.location === 'string' ? b.location : (existing?.location || ''),
      verification_status: existing?.verification_status || 'unverified',
      languages: Array.isArray(b.languages) ? b.languages.map((s: string) => s.trim()).filter(Boolean).join(',') : (existing?.languages || ''),
      created_at: existing?.created_at || nowIso(),
      updated_at: nowIso()
    } as any;

    await db.upsertAdvocateProfile(profile);
    logger.info(`Advocate ${user.id} updated profile`);

    return getOwnProfile(req, res, next);
  } catch (err) {
    next(err);
  }
}

export async function getClientMatters(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    const clientId = req.params.clientId as string;

    const bookings = await db.getBookingsForUser(user.id, 'ADVOCATE');
    const relationship = bookings.some(b => b.clientId === clientId && !['cancelled', 'declined'].includes(b.status));
    if (!relationship) {
      return res.status(403).json({ error: 'Forbidden', message: 'No active engagement exists with this client.' });
    }

    const client = await db.findUserById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Not Found', message: 'Client not found.' });
    }

    const cases = await db.getCasesForClient(clientId);
    const matters = await Promise.all(cases.map(async (c) => {
      const snapshot = await db.getCaseStateSnapshot(c.id);
      let state: any = null;
      if (snapshot) {
        try {
          state = JSON.parse(snapshot.state);
        } catch {
          state = null;
        }
      }
      return {
        id: c.id,
        title: c.title,
        readinessScore: state?.readinessScore ?? c.readiness_score,
        readinessStage: state?.readinessStage ?? c.readiness_stage,
        jurisdiction: state?.facts?.jurisdiction?.value || c.jurisdiction || 'Not specified',
        practiceArea: state?.practiceArea || c.practice_area || 'Not specified',
        proceduralStage: state?.facts?.proceduralStage?.value || c.procedural_stage || 'Not established',
        updatedAt: c.updated_at,
        messages: (state?.messages?.length ?? 0)
      };
    }));

    return res.status(200).json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        avatar: client.avatar,
        email: client.email
      },
      matters: matters.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    });
  } catch (err) {
    next(err);
  }
}