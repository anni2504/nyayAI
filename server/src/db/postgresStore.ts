import pg from 'pg';
import type { DatabaseStore, UserRecord, BookingRecord, ConsultationLogRecord, DatabaseDriver } from './types.js';
import type { Role } from '../types/index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * PostgreSQL connection pool. Lazily created from DATABASE_URL.
 * Caller is responsible for calling initPostgresStore() (which ensures schema).
 */
function getPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize the PostgreSQL database store.');
  }

  const sslMode = (process.env.DATABASE_SSL || '').toLowerCase();
  let ssl: boolean | { rejectUnauthorized: boolean } | undefined;
  if (sslMode === 'true' || sslMode === 'require' || sslMode === '1') {
    ssl = { rejectUnauthorized: false };
  } else if (sslMode === 'false' || sslMode === 'disable' || sslMode === '0') {
    ssl = false;
  } else if (process.env.VERCEL === '1') {
    // Serverless hosts (Neon, Supabase, Vercel Postgres) require TLS by default
    ssl = { rejectUnauthorized: false };
  }

  pool = new Pool({
    connectionString,
    max: process.env.VERCEL === '1' ? 5 : 10,
    ssl,
    idleTimeoutMillis: 30000
  });

  pool.on('error', err => {
    logger.error('Unexpected PostgreSQL client error:', err.message);
  });
  return pool;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('CLIENT', 'ADVOCATE')),
  avatar        TEXT,
  title         TEXT,
  bar_number    TEXT,
  created_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

CREATE TABLE IF NOT EXISTS bookings (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL,
  client_name       TEXT NOT NULL,
  client_avatar     TEXT,
  advocate_id       TEXT NOT NULL,
  advocate_name     TEXT NOT NULL,
  advocate_avatar   TEXT,
  advocate_title    TEXT,
  date              TEXT NOT NULL,
  time_slot         TEXT NOT NULL,
  matter_title      TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  fee               TEXT NOT NULL,
  scheduled_time_iso TEXT,
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS consultations (
  id               TEXT PRIMARY KEY,
  booking_id       TEXT NOT NULL UNIQUE,
  channel_name     TEXT NOT NULL,
  client_id        TEXT NOT NULL,
  advocate_id      TEXT NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  status           TEXT NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL
);
`;

function mapUserRow(row: any): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role,
    avatar: row.avatar || undefined,
    title: row.title || undefined,
    barNumber: row.bar_number || undefined,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function mapBookingRow(row: any): BookingRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientAvatar: row.client_avatar || undefined,
    advocateId: row.advocate_id,
    advocateName: row.advocate_name,
    advocateAvatar: row.advocate_avatar || undefined,
    advocateTitle: row.advocate_title || undefined,
    date: row.date,
    timeSlot: row.time_slot,
    matterTitle: row.matter_title,
    status: row.status,
    fee: row.fee,
    scheduledTimeIso: row.scheduled_time_iso || '',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function mapConsultationRow(row: any): ConsultationLogRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    channelName: row.channel_name,
    clientId: row.client_id,
    advocateId: row.advocate_id,
    started_at: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
    ended_at: row.ended_at ? (row.ended_at instanceof Date ? row.ended_at.toISOString() : row.ended_at) : undefined,
    durationSeconds: row.duration_seconds == null ? undefined : Number(row.duration_seconds),
    status: row.status,
    notes: row.notes || undefined,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

async function defaultBookings(): Promise<BookingRecord[]> {
  return [
    {
      id: 'bk-501',
      clientId: 'usr-client-1',
      clientName: 'Rohan Sharma',
      clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      advocateId: 'usr-advocate-1',
      advocateName: 'Adv. Rajesh Varma',
      advocateAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      advocateTitle: 'Senior Criminal Defense & High Court Advocate',
      date: 'Today / Scheduled Consultation',
      timeSlot: '4:30 PM - 5:30 PM',
      matterTitle: 'Neighbour Boundary Dispute & Emergency Injunction Order',
      status: 'upcoming' as const,
      fee: '₹3,500',
      scheduledTimeIso: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso()
    },
    {
      id: 'bk-502',
      clientId: 'usr-client-1',
      clientName: 'Rohan Sharma',
      clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      advocateId: 'usr-advocate-1',
      advocateName: 'Adv. Rajesh Varma',
      advocateAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      advocateTitle: 'Senior Criminal Defense & High Court Advocate',
      date: 'Aug 20, 2026',
      timeSlot: '2:00 PM - 2:30 PM',
      matterTitle: 'RERA Builder Refund Notice & Deposit Recovery',
      status: 'completed' as const,
      fee: '₹4,000',
      scheduledTimeIso: new Date(Date.now() - 86400000 * 7).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 7).toISOString()
    }
  ];
}

export async function initPostgresStore(): Promise<DatabaseStore> {
  const client = getPool();
  try {
    await client.query(SCHEMA_SQL);
    logger.info('PostgreSQL schema initialized (users, bookings, consultations).');
  } catch (err: any) {
    logger.error('PostgreSQL schema initialization failed:', err.message);
    throw new Error(`PostgreSQL store initialization failed: ${err.message}`);
  }

  const driver: DatabaseDriver = 'postgres';

  return {
    driver,

    async findUserByEmail(email: string): Promise<UserRecord | undefined> {
      const { rows } = await client.query(
        'SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1',
        [email]
      );
      return rows[0] ? mapUserRow(rows[0]) : undefined;
    },

    async findUserById(id: string): Promise<UserRecord | undefined> {
      const { rows } = await client.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      return rows[0] ? mapUserRow(rows[0]) : undefined;
    },

    async createUser(user: UserRecord): Promise<UserRecord> {
      const { rows } = await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, avatar, title, bar_number, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (email) DO NOTHING
         RETURNING *`,
        [
          user.id,
          user.name,
          user.email,
          user.password_hash,
          user.role,
          user.avatar || null,
          user.title || null,
          user.barNumber || null,
          user.created_at || nowIso(),
          user.created_at || nowIso()
        ]
      );
      if (!rows[0]) {
        throw new Error(`User with email ${user.email} already exists`);
      }
      return mapUserRow(rows[0]);
    },

    async updateUser(id: string, updates: Partial<Omit<UserRecord, 'id' | 'created_at'>>): Promise<UserRecord | undefined> {
      const updatedAt = nowIso();
      const buildSetClause = () => {
        const entries: string[] = [];
        const values: any[] = [];
        let idx = 1;
        const push = (col: string, val: any) => {
          entries.push(`${col} = $${idx++}`);
          values.push(val);
        };
        if (updates.name !== undefined) push('name', updates.name);
        if (updates.email !== undefined) push('email', updates.email);
        if (updates.password_hash !== undefined) push('password_hash', updates.password_hash);
        if (updates.role !== undefined) push('role', updates.role);
        if (updates.avatar !== undefined) push('avatar', updates.avatar || null);
        if (updates.title !== undefined) push('title', updates.title || null);
        if (updates.barNumber !== undefined) push('bar_number', updates.barNumber || null);
        entries.push(`updated_at = $${idx++}`);
        values.push(updatedAt);
        return { clause: entries.join(', '), values };
      };

      const { clause, values } = buildSetClause();
      if (!clause) return undefined;

      const { rows } = await client.query(
        `UPDATE users SET ${clause} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
      );
      return rows[0] ? mapUserRow(rows[0]) : undefined;
    },

    async getAllUsers(): Promise<UserRecord[]> {
      const { rows } = await client.query('SELECT * FROM users ORDER BY created_at ASC');
      return rows.map(mapUserRow);
    },

    // BOOKING OPERATIONS
    async findBookingById(bookingId: string): Promise<BookingRecord | undefined> {
      const { rows } = await client.query('SELECT * FROM bookings WHERE id = $1 LIMIT 1', [bookingId]);
      return rows[0] ? mapBookingRow(rows[0]) : undefined;
    },

    async getBookingsForUser(userId: string, role: Role): Promise<BookingRecord[]> {
      if (role === 'CLIENT') {
        const { rows } = await client.query(
          `SELECT * FROM bookings WHERE client_id = $1 OR client_id IN ('client-1', 'usr-client-1') ORDER BY created_at DESC`,
          [userId]
        );
        return rows.map(mapBookingRow);
      } else {
        const { rows } = await client.query(
          `SELECT * FROM bookings WHERE advocate_id = $1 OR advocate_id IN ('lawyer-1', 'usr-advocate-1') ORDER BY created_at DESC`,
          [userId]
        );
        return rows.map(mapBookingRow);
      }
    },

    async seedDefaultBookings(): Promise<void> {
      const existing = await client.query('SELECT id FROM bookings WHERE id = $1', ['bk-501']);
      if (existing.rows.length > 0) return;

      const bookings = await defaultBookings();
      for (const b of bookings) {
        await client.query(
          `INSERT INTO bookings (id, client_id, client_name, client_avatar, advocate_id, advocate_name,
                                 advocate_avatar, advocate_title, date, time_slot, matter_title, status,
                                 fee, scheduled_time_iso, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO NOTHING`,
          [
            b.id, b.clientId, b.clientName, b.clientAvatar || null, b.advocateId, b.advocateName,
            b.advocateAvatar || null, b.advocateTitle || null, b.date, b.timeSlot, b.matterTitle, b.status,
            b.fee, b.scheduledTimeIso, b.created_at, b.updated_at
          ]
        );
      }
    },

    // CONSULTATION LOG OPERATIONS
    async findConsultationLog(bookingId: string): Promise<ConsultationLogRecord | undefined> {
      const { rows } = await client.query('SELECT * FROM consultations WHERE booking_id = $1 LIMIT 1', [bookingId]);
      return rows[0] ? mapConsultationRow(rows[0]) : undefined;
    },

    async saveConsultationLog(log: ConsultationLogRecord): Promise<ConsultationLogRecord> {
      const updated = nowIso();
      const { rows } = await client.query(
        `INSERT INTO consultations (id, booking_id, channel_name, client_id, advocate_id, started_at,
                                   ended_at, duration_seconds, status, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (booking_id) DO UPDATE SET
           ended_at = EXCLUDED.ended_at,
           duration_seconds = EXCLUDED.duration_seconds,
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
          log.id,
          log.bookingId,
          log.channelName,
          log.clientId,
          log.advocateId,
          log.started_at ? new Date(log.started_at).toISOString() : updated,
          log.ended_at ? new Date(log.ended_at).toISOString() : null,
          log.durationSeconds ?? null,
          log.status,
          log.notes || null,
          log.created_at || updated,
          updated
        ]
      );
      return mapConsultationRow(rows[0]);
    },

    async addConsultationNotes(bookingId: string, notes: string): Promise<ConsultationLogRecord | undefined> {
      const { rows } = await client.query(
        `UPDATE consultations SET notes = $2, updated_at = $3 WHERE booking_id = $1 RETURNING *`,
        [bookingId, notes, nowIso()]
      );
      return rows[0] ? mapConsultationRow(rows[0]) : undefined;
    }
  };
}

export { getPool };