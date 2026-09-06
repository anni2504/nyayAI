import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db, BookingRecord, ConsultationLogRecord } from '../db/database.js';
import { generateAgoraRtcToken } from '../services/agoraService.js';
import { logger } from '../utils/logger.js';

// Helper to convert string userId and role into positive numeric UID for Agora
function stringToNumericUid(str: string, role: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  // Guarantee Client (100000-499999) and Advocate (500000-899999) never collide
  if (role === 'ADVOCATE') {
    return (positive % 400000) + 500000;
  }
  return (positive % 400000) + 100000;
}

export async function joinConsultation(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const bookingId = req.params.bookingId as string;
    if (!bookingId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Booking ID is required' });
    }

    const booking = await db.findBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Not Found', message: `Booking with ID ${bookingId} not found` });
    }

    // Verify booking is active/upcoming
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This booking has been cancelled and cannot be joined.'
      });
    }

    // Strict Authorization check: Authenticated user MUST be the specific client or advocate for this booking
    const isClient = user.id === booking.clientId;
    const isAdvocate = user.id === booking.advocateId;

    if (!isClient && !isAdvocate) {
      logger.warn(`Forbidden video consultation join attempt: User ${user.id} (${user.role}) for booking ${bookingId}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You are not an authorized participant for this legal consultation.'
      });
    }

    const numericUid = stringToNumericUid(user.id, user.role);
    const tokenData = generateAgoraRtcToken(booking.id, user.id, numericUid);

    // Record or update consultation log
    let log = await db.findConsultationLog(booking.id);
    if (!log) {
      log = {
        id: `con-${Date.now()}`,
        bookingId: booking.id,
        channelName: tokenData.channelName,
        clientId: booking.clientId,
        advocateId: booking.advocateId,
        started_at: new Date().toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.saveConsultationLog(log);
    }

    logger.info(`User ${user.id} (${user.role}) joined consultation ${booking.id} on channel ${tokenData.channelName}`);

    return res.status(200).json({
      success: true,
      token: tokenData.token,
      channelName: tokenData.channelName,
      appId: tokenData.appId,
      uid: tokenData.uid,
      expiresInSeconds: tokenData.expiresInSeconds,
      booking,
      log,
      userRole: user.role,
      userName: user.name
    });
  } catch (err: any) {
    logger.error('Error joining consultation:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function getUserBookings(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const bookings = await db.getBookingsForUser(user.id, user.role);
    return res.status(200).json({
      success: true,
      bookings
    });
  } catch (err: any) {
    logger.error('Error getting user bookings:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function getConsultationDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const bookingId = req.params.bookingId as string;
    const booking = await db.findBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Not Found', message: `Booking with ID ${bookingId} not found` });
    }

    // Strict Authorization check: user must be client or advocate for this booking
    if (user.id !== booking.clientId && user.id !== booking.advocateId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access Denied: You are not a participant in this consultation.' });
    }

    const log = await db.findConsultationLog(bookingId);

    return res.status(200).json({
      success: true,
      booking,
      log
    });
  } catch (err: any) {
    logger.error('Error getting consultation details:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function endConsultation(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const bookingId = req.params.bookingId as string;
    const { durationSeconds } = req.body;

    const booking = await db.findBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Not Found', message: `Booking ${bookingId} not found` });
    }

    // Strict Authorization check: user must be client or advocate for this booking
    if (user.id !== booking.clientId && user.id !== booking.advocateId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access Denied: You cannot end another user\'s consultation.' });
    }

    let log = await db.findConsultationLog(bookingId);
    const nowIso = new Date().toISOString();

    if (log) {
      log.ended_at = nowIso;
      log.durationSeconds = durationSeconds || 300;
      log.status = 'completed';
      await db.saveConsultationLog(log);
    } else {
      log = {
        id: `con-${Date.now()}`,
        bookingId: bookingId as string,
        channelName: `nyayai-consultation-${bookingId}`,
        clientId: booking.clientId,
        advocateId: booking.advocateId,
        started_at: new Date(Date.now() - (durationSeconds || 300) * 1000).toISOString(),
        ended_at: nowIso,
        durationSeconds: durationSeconds || 300,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: nowIso
      };
      await db.saveConsultationLog(log);
    }

    logger.info(`Consultation for booking ${bookingId} marked as completed.`);

    return res.status(200).json({
      success: true,
      log,
      message: 'Consultation completed successfully'
    });
  } catch (err: any) {
    logger.error('Error ending consultation:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function addConsultationNotes(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'ADVOCATE') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only advocates can add consultation notes' });
    }

    const bookingId = req.params.bookingId as string;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Bad Request', message: 'Notes text is required' });
    }

    const booking = await db.findBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Not Found', message: `Booking ${bookingId} not found` });
    }

    // Strict Authorization check: advocate must be the designated advocate for this booking
    if (user.id !== booking.advocateId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access Denied: You are not the advocate for this consultation.' });
    }

    const log = await db.addConsultationNotes(bookingId, notes);
    return res.status(200).json({
      success: true,
      log,
      message: 'Notes saved successfully'
    });
  } catch (err: any) {
    logger.error('Error adding consultation notes:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
