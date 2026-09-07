import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyToken, getAuthenticatedUser } from './services/authService.js';
import { db } from './db/database.js';
import { logger } from './utils/logger.js';

/**
 * Realtime consultation chat (Socket.IO + PostgreSQL persistence).
 *
 * - Authentication: JWT in the handshake (auth.token or query.token), then the
 *   user is reloaded from the database (never trusts client-supplied claims).
 * - Authorization: a socket may only join a booking room if the authenticated
 *   user is precisely the client or the advocate of that booking.
 * - Persistence: every chat message is written to consultation_messages before
 *   being broadcast, so the REST history matches the live stream on rejoin.
 */

interface JoinPayload {
  bookingId?: string;
}

interface MessagePayload {
  bookingId?: string;
  content?: string;
}

export function attachRealtimeServer(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth && socket.handshake.auth.token)
        || (socket.handshake.auth && socket.handshake.auth.token)
        || (typeof socket.handshake.query.token === 'string' ? socket.handshake.query.token : '');
      if (!token) {
        return next(new Error('unauthorized'));
      }
      const payload = verifyToken(token);
      const user = await getAuthenticatedUser(payload.userId);
      socket.data.user = { id: user.id, name: user.name, role: user.role };
      next();
    } catch (err: any) {
      logger.warn(`Socket authentication failed: ${err.message}`);
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; name: string; role: string };

    socket.on('consultation:join', async (payload: JoinPayload, ack?: (r: any) => void) => {
      try {
        const bookingId = payload && payload.bookingId;
        if (!bookingId) {
          if (ack) ack({ ok: false, error: 'bookingId required' });
          return;
        }
        const booking = await db.findBookingById(bookingId);
        if (!booking || (user.id !== booking.clientId && user.id !== booking.advocateId)) {
          if (ack) ack({ ok: false, error: 'forbidden' });
          return;
        }
        const room = `booking:${bookingId}`;
        for (const s of io.sockets.adapter.rooms.get(room) || []) {
          const existing = io.sockets.sockets.get(s);
          if (existing && existing.data.user && existing.data.user.id === user.id) {
            existing.leave(room);
          }
        }
        await socket.join(room);
        logger.info(`Socket ${socket.id} joined consultation ${bookingId} (${user.name})`);
        if (ack) ack({ ok: true, room });
      } catch (err: any) {
        logger.error(`Socket join error for booking: ${err.message}`);
        if (ack) ack({ ok: false, error: 'server_error' });
      }
    });

    socket.on('consultation:message', async (payload: MessagePayload, ack?: (r: any) => void) => {
      try {
        const bookingId = payload && payload.bookingId;
        const content = payload && typeof payload.content === 'string' ? payload.content.trim() : '';
        if (!bookingId || !content) {
          if (ack) ack({ ok: false, error: 'bookingId and content required' });
          return;
        }
        const booking = await db.findBookingById(bookingId);
        if (!booking || (user.id !== booking.clientId && user.id !== booking.advocateId)) {
          if (ack) ack({ ok: false, error: 'forbidden' });
          return;
        }

        const message = await db.addConsultationMessage({
          id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          booking_id: bookingId,
          sender_id: user.id,
          sender_name: user.name,
          sender_role: user.role,
          content,
          created_at: new Date().toISOString()
        });

        io.to(`booking:${bookingId}`).emit('consultation:message', message);
        if (ack) ack({ ok: true });
      } catch (err: any) {
        logger.error(`Socket message error: ${err.message}`);
        if (ack) ack({ ok: false, error: 'server_error' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket ${socket.id} disconnected`);
    });
  });

  return io;
}