import pg from 'pg';
import type { DatabaseStore, UserRecord, BookingRecord, ConsultationLogRecord, CaseRecord, DocumentRecord, SavedAdvocateRecord, CaseMessageRecord, CaseStateSnapshotRecord, AdvocateProfileRecord, AdvocateCaseHistoryRecord, ConsultationNoteRecord, VerificationCodeRecord, ConsultationMessageRecord, AdvocateDirectoryEntry, BookingStatus, DatabaseDriver } from './types.js';
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
  phone         TEXT,
  preferred_language TEXT,
  privacy_consent   BOOLEAN,
  created_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN;

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
  status            TEXT NOT NULL CHECK (status IN ('upcoming', 'completed', 'cancelled', 'pending', 'accepted', 'declined')),
  fee               TEXT NOT NULL,
  scheduled_time_iso TEXT,
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL
);

-- Relax booking status constraint on pre-existing tables (idempotent)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('upcoming', 'completed', 'cancelled', 'pending', 'accepted', 'declined'));

CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_advocate ON bookings (advocate_id);

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

CREATE TABLE IF NOT EXISTS cases (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL,
  title             TEXT NOT NULL,
  state             TEXT NOT NULL,
  readiness_score   INTEGER NOT NULL DEFAULT 0,
  readiness_stage   TEXT NOT NULL,
  jurisdiction      TEXT,
  practice_area     TEXT,
  procedural_stage  TEXT,
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_client ON cases (client_id);

CREATE TABLE IF NOT EXISTS documents (
  id               TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL,
  case_id          TEXT,
  name             TEXT NOT NULL,
  size             TEXT,
  type             TEXT,
  category         TEXT,
  document_type    TEXT,
  summary          TEXT,
  upload_date      TEXT,
  analysis_status  TEXT NOT NULL,
  analysis         TEXT,
  created_at       TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents (client_id);

CREATE TABLE IF NOT EXISTS case_messages (
  id         TEXT PRIMARY KEY,
  case_id    TEXT NOT NULL,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  timestamp  TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_messages_case ON case_messages (case_id, created_at);

CREATE TABLE IF NOT EXISTS case_state (
  case_id    TEXT PRIMARY KEY,
  state      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS advocate_profiles (
  advocate_id         TEXT PRIMARY KEY,
  practice_areas      TEXT,
  jurisdiction        TEXT,
  court               TEXT,
  experience_years    INTEGER NOT NULL DEFAULT 0,
  consultation_fee    TEXT,
  bio                 TEXT,
  location            TEXT,
  verification_status TEXT,
  languages           TEXT,
  created_at          TIMESTAMPTZ NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS advocate_case_history (
  id            TEXT PRIMARY KEY,
  advocate_id   TEXT NOT NULL,
  case_title    TEXT NOT NULL,
  court         TEXT,
  year          INTEGER,
  case_type     TEXT,
  practice_area TEXT,
  jurisdiction  TEXT,
  outcome       TEXT,
  status        TEXT,
  created_at    TIMESTAMPTZ NOT NULL
);

ALTER TABLE advocate_case_history ADD COLUMN IF NOT EXISTS verification_status TEXT;
ALTER TABLE advocate_case_history ADD COLUMN IF NOT EXISTS doc_file_key TEXT;

CREATE INDEX IF NOT EXISTS idx_adv_case_history_adv ON advocate_case_history (advocate_id);

CREATE TABLE IF NOT EXISTS consultation_messages (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL,
  sender_id   TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_booking ON consultation_messages (booking_id, created_at);

CREATE TABLE IF NOT EXISTS consultation_notes (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL,
  advocate_id TEXT NOT NULL,
  client_id   TEXT,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consultation_notes_booking ON consultation_notes (booking_id);

CREATE TABLE IF NOT EXISTS verification_codes (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes (email, purpose);

CREATE TABLE IF NOT EXISTS saved_advocates (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  advocate_id    TEXT NOT NULL,
  advocate_data  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_advocates_client_adv ON saved_advocates (client_id, advocate_id);
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
    phone: row.phone || undefined,
    preferredLanguage: row.preferred_language || undefined,
    privacyConsent: row.privacy_consent == null ? undefined : Boolean(row.privacy_consent),
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

function mapCaseRow(row: any): CaseRecord {
  return {
    id: row.id,
    client_id: row.client_id,
    title: row.title,
    state: row.state,
    readiness_score: Number(row.readiness_score),
    readiness_stage: row.readiness_stage,
    jurisdiction: row.jurisdiction || '',
    practice_area: row.practice_area || '',
    procedural_stage: row.procedural_stage || '',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function mapDocumentRow(row: any): DocumentRecord {
  return {
    id: row.id,
    client_id: row.client_id,
    case_id: row.case_id || null,
    name: row.name,
    size: row.size || '',
    type: row.type || '',
    category: row.category || '',
    document_type: row.document_type || (row.type || '').charAt(0).toUpperCase() + (row.type || '').slice(1),
    summary: row.summary || '',
    upload_date: row.upload_date || (row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at),
    analysis_status: row.analysis_status,
    analysis: row.analysis || null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function mapCaseMessageRow(row: any): CaseMessageRecord {
  return {
    id: row.id,
    case_id: row.case_id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp || (row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function mapCaseStateSnapshotRow(row: any): CaseStateSnapshotRecord {
  return {
    case_id: row.case_id,
    state: row.state,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function mapAdvocateProfileRow(row: any): AdvocateProfileRecord {
  return {
    advocate_id: row.advocate_id,
    practice_areas: row.practice_areas || '',
    jurisdiction: row.jurisdiction || '',
    court: row.court || '',
    experience_years: Number(row.experience_years || 0),
    consultation_fee: row.consultation_fee || undefined,
    bio: row.bio || undefined,
    location: row.location || undefined,
    verification_status: row.verification_status || 'unverified',
    languages: row.languages || undefined,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function mapAdvocateCaseHistoryRow(row: any): AdvocateCaseHistoryRecord {
  return {
    id: row.id,
    advocate_id: row.advocate_id,
    case_title: row.case_title,
    court: row.court || '',
    year: Number(row.year || 0),
    case_type: row.case_type || '',
    practice_area: row.practice_area || '',
    jurisdiction: row.jurisdiction || '',
    outcome: row.outcome || '',
    status: row.status || '',
    verification_status: row.verification_status || 'unverified',
    doc_file_key: row.doc_file_key || null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function mapConsultationMessageRow(row: any): ConsultationMessageRecord {
  return {
    id: row.id,
    booking_id: row.booking_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name,
    sender_role: row.sender_role,
    content: row.content,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function mapConsultationNoteRow(row: any): ConsultationNoteRecord {
  return {
    id: row.id,
    booking_id: row.booking_id,
    advocate_id: row.advocate_id,
    client_id: row.client_id || undefined,
    note: row.note,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function mapVerificationCodeRow(row: any): VerificationCodeRecord {
  return {
    id: row.id,
    email: row.email,
    code_hash: row.code_hash,
    purpose: row.purpose,
    expires_at: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    consumed_at: row.consumed_at ? (row.consumed_at instanceof Date ? row.consumed_at.toISOString() : row.consumed_at) : undefined,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function mapSavedAdvocateRow(row: any): SavedAdvocateRecord {
  return {
    id: row.id,
    client_id: row.client_id,
    advocate_id: row.advocate_id,
    advocate_data: row.advocate_data,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
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
        `INSERT INTO users (id, name, email, password_hash, role, avatar, title, bar_number, phone, preferred_language, privacy_consent, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          user.phone || null,
          user.preferredLanguage || null,
          user.privacyConsent == null ? null : user.privacyConsent,
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
        if (updates.phone !== undefined) push('phone', updates.phone || null);
        if (updates.preferredLanguage !== undefined) push('preferred_language', updates.preferredLanguage || null);
        if (updates.privacyConsent !== undefined) push('privacy_consent', updates.privacyConsent);
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
          `SELECT * FROM bookings WHERE client_id = $1 ORDER BY created_at DESC`,
          [userId]
        );
        return rows.map(mapBookingRow);
      } else {
        const { rows } = await client.query(
          `SELECT * FROM bookings WHERE advocate_id = $1 ORDER BY created_at DESC`,
          [userId]
        );
        return rows.map(mapBookingRow);
      }
    },

    async createBooking(booking: BookingRecord): Promise<BookingRecord> {
      const { rows } = await client.query(
        `INSERT INTO bookings (id, client_id, client_name, client_avatar, advocate_id, advocate_name,
                               advocate_avatar, advocate_title, date, time_slot, matter_title, status,
                               fee, scheduled_time_iso, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          booking.id, booking.clientId, booking.clientName, booking.clientAvatar || null,
          booking.advocateId, booking.advocateName, booking.advocateAvatar || null,
          booking.advocateTitle || null, booking.date, booking.timeSlot, booking.matterTitle,
          booking.status, booking.fee, booking.scheduledTimeIso, booking.created_at, booking.updated_at
        ]
      );
      return mapBookingRow(rows[0]);
    },

    async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<BookingRecord | undefined> {
      const { rows } = await client.query(
        `UPDATE bookings SET status = $2, updated_at = $3 WHERE id = $1 RETURNING *`,
        [bookingId, status, nowIso()]
      );
      return rows[0] ? mapBookingRow(rows[0]) : undefined;
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
    },

    // CASE OPERATIONS
    async createCase(caseRecord: CaseRecord): Promise<CaseRecord> {
      const { rows } = await client.query(
        `INSERT INTO cases (id, client_id, title, state, readiness_score, readiness_stage, jurisdiction,
                            practice_area, procedural_stage, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          caseRecord.id,
          caseRecord.client_id,
          caseRecord.title,
          caseRecord.state,
          caseRecord.readiness_score,
          caseRecord.readiness_stage,
          caseRecord.jurisdiction || null,
          caseRecord.practice_area || null,
          caseRecord.procedural_stage || null,
          caseRecord.created_at,
          caseRecord.created_at
        ]
      );
      return mapCaseRow(rows[0]);
    },

    async findCaseById(caseId: string): Promise<CaseRecord | undefined> {
      const { rows } = await client.query('SELECT * FROM cases WHERE id = $1 LIMIT 1', [caseId]);
      return rows[0] ? mapCaseRow(rows[0]) : undefined;
    },

    async findCaseByIdAndClient(caseId: string, clientId: string): Promise<CaseRecord | undefined> {
      const { rows } = await client.query('SELECT * FROM cases WHERE id = $1 AND client_id = $2 LIMIT 1', [caseId, clientId]);
      return rows[0] ? mapCaseRow(rows[0]) : undefined;
    },

    async getCasesForClient(clientId: string): Promise<CaseRecord[]> {
      const { rows } = await client.query(
        'SELECT * FROM cases WHERE client_id = $1 ORDER BY updated_at DESC',
        [clientId]
      );
      return rows.map(mapCaseRow);
    },

    async updateCase(caseId: string, updates: Partial<Omit<CaseRecord, 'id' | 'client_id' | 'created_at'>>): Promise<CaseRecord | undefined> {
      const updatedAt = nowIso();
      const buildSetClause = () => {
        const entries: string[] = [];
        const values: any[] = [];
        let idx = 1;
        const push = (col: string, val: any) => {
          entries.push(`${col} = $${idx++}`);
          values.push(val);
        };
        if (updates.title !== undefined) push('title', updates.title);
        if (updates.state !== undefined) push('state', updates.state);
        if (updates.readiness_score !== undefined) push('readiness_score', updates.readiness_score);
        if (updates.readiness_stage !== undefined) push('readiness_stage', updates.readiness_stage);
        if (updates.jurisdiction !== undefined) push('jurisdiction', updates.jurisdiction || null);
        if (updates.practice_area !== undefined) push('practice_area', updates.practice_area || null);
        if (updates.procedural_stage !== undefined) push('procedural_stage', updates.procedural_stage || null);
        entries.push(`updated_at = $${idx++}`);
        values.push(updatedAt);
        return { clause: entries.join(', '), values };
      };

      const { clause, values } = buildSetClause();
      if (!clause) return undefined;

      const { rows } = await client.query(
        `UPDATE cases SET ${clause} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, caseId]
      );
      return rows[0] ? mapCaseRow(rows[0]) : undefined;
    },

    // CASE MESSAGE OPERATIONS
    async getMessagesForCase(caseId: string): Promise<CaseMessageRecord[]> {
      const { rows } = await client.query(
        'SELECT * FROM case_messages WHERE case_id = $1 ORDER BY created_at ASC',
        [caseId]
      );
      return rows.map(mapCaseMessageRow);
    },

    async addCaseMessage(message: CaseMessageRecord): Promise<CaseMessageRecord> {
      const { rows } = await client.query(
        `INSERT INTO case_messages (id, case_id, role, content, timestamp, created_at)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [message.id, message.case_id, message.role, message.content, message.timestamp, message.created_at]
      );
      return mapCaseMessageRow(rows[0]);
    },

    // CASE STATE SNAPSHOT
    async saveCaseStateSnapshot(snapshot: CaseStateSnapshotRecord): Promise<CaseStateSnapshotRecord> {
      const updated = nowIso();
      const { rows } = await client.query(
        `INSERT INTO case_state (case_id, state, updated_at)
         VALUES ($1,$2,$3)
         ON CONFLICT (case_id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [snapshot.case_id, snapshot.state, snapshot.updated_at || updated]
      );
      return mapCaseStateSnapshotRow(rows[0]);
    },

    async getCaseStateSnapshot(caseId: string): Promise<CaseStateSnapshotRecord | undefined> {
      const { rows } = await client.query('SELECT * FROM case_state WHERE case_id = $1 LIMIT 1', [caseId]);
      return rows[0] ? mapCaseStateSnapshotRow(rows[0]) : undefined;
    },

    // ADVOCATE PROFILE OPERATIONS
    async getAdvocateProfiles(): Promise<AdvocateProfileRecord[]> {
      const { rows } = await client.query('SELECT * FROM advocate_profiles ORDER BY experience_years DESC, updated_at DESC');
      return rows.map(mapAdvocateProfileRow);
    },

    async getAdvocateProfile(advocateId: string): Promise<AdvocateProfileRecord | undefined> {
      const { rows } = await client.query('SELECT * FROM advocate_profiles WHERE advocate_id = $1 LIMIT 1', [advocateId]);
      return rows[0] ? mapAdvocateProfileRow(rows[0]) : undefined;
    },

    async upsertAdvocateProfile(profile: AdvocateProfileRecord): Promise<AdvocateProfileRecord> {
      const updated = nowIso();
      const fee = profile.consultation_fee || null;
      const { rows } = await client.query(
        `INSERT INTO advocate_profiles (advocate_id, practice_areas, jurisdiction, court, experience_years,
                                        consultation_fee, bio, location, verification_status, languages, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (advocate_id) DO UPDATE SET
           practice_areas = EXCLUDED.practice_areas,
           jurisdiction = EXCLUDED.jurisdiction,
           court = EXCLUDED.court,
           experience_years = EXCLUDED.experience_years,
           consultation_fee = EXCLUDED.consultation_fee,
           bio = EXCLUDED.bio,
           location = EXCLUDED.location,
           verification_status = EXCLUDED.verification_status,
           languages = EXCLUDED.languages,
           updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
          profile.advocate_id,
          profile.practice_areas || '',
          profile.jurisdiction || '',
          profile.court || '',
          profile.experience_years || 0,
          fee,
          profile.bio || null,
          profile.location || null,
          profile.verification_status || 'unverified',
          profile.languages || null,
          profile.created_at || updated,
          profile.updated_at || updated
        ]
      );
      return mapAdvocateProfileRow(rows[0]);
    },

    // ADVOCATE CASE HISTORY OPERATIONS
    async getAdvocateCaseHistory(advocateId: string): Promise<AdvocateCaseHistoryRecord[]> {
      const { rows } = await client.query(
        'SELECT * FROM advocate_case_history WHERE advocate_id = $1 ORDER BY year DESC, created_at DESC',
        [advocateId]
      );
      return rows.map(mapAdvocateCaseHistoryRow);
    },

    async addAdvocateCaseHistory(record: AdvocateCaseHistoryRecord): Promise<AdvocateCaseHistoryRecord> {
      const { rows } = await client.query(
        `INSERT INTO advocate_case_history (id, advocate_id, case_title, court, year, case_type, practice_area,
                                            jurisdiction, outcome, status, verification_status, doc_file_key, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          record.id,
          record.advocate_id,
          record.case_title,
          record.court || null,
          record.year || null,
          record.case_type || null,
          record.practice_area || null,
          record.jurisdiction || null,
          record.outcome || null,
          record.status || null,
          record.verification_status || 'unverified',
          record.doc_file_key || null,
          record.created_at || nowIso()
        ]
      );
      return mapAdvocateCaseHistoryRow(rows[0]);
    },

    async updateAdvocateCaseHistory(record: AdvocateCaseHistoryRecord): Promise<AdvocateCaseHistoryRecord | undefined> {
      const { rows } = await client.query(
        `UPDATE advocate_case_history SET
           case_title = $3, court = $4, year = $5, case_type = $6, practice_area = $7,
           jurisdiction = $8, outcome = $9, status = $10, verification_status = $11
         WHERE id = $1 AND advocate_id = $2 RETURNING *`,
        [
          record.id,
          record.advocate_id,
          record.case_title,
          record.court || null,
          record.year || null,
          record.case_type || null,
          record.practice_area || null,
          record.jurisdiction || null,
          record.outcome || null,
          record.status || null,
          record.verification_status || 'unverified'
        ]
      );
      return rows[0] ? mapAdvocateCaseHistoryRow(rows[0]) : undefined;
    },

    async deleteAdvocateCaseHistory(id: string, advocateId: string): Promise<boolean> {
      const { rowCount } = await client.query('DELETE FROM advocate_case_history WHERE id = $1 AND advocate_id = $2', [id, advocateId]);
      return (rowCount || 0) > 0;
    },

    async getAdvocateDirectory(): Promise<AdvocateDirectoryEntry[]> {
      const { rows } = await client.query(
        `SELECT u.id AS advocate_id, u.name, u.avatar, u.title, u.bar_number, p.practice_areas, p.jurisdiction,
                p.court, p.experience_years, p.consultation_fee, p.bio, p.location, p.verification_status, p.languages,
                (SELECT count(*)::int FROM advocate_case_history h WHERE h.advocate_id = u.id
                  AND (h.verification_status = 'verified' OR h.verification_status IS NULL) AND h.status != 'draft') AS verified_case_count
         FROM users u
         LEFT JOIN advocate_profiles p ON p.advocate_id = u.id
         WHERE u.role = 'ADVOCATE'
         ORDER BY p.verification_status = 'verified' DESC, p.experience_years DESC, u.name ASC`
      );
      const { rows: historyRows } = await client.query(
        `SELECT id, advocate_id, case_title, court, year, practice_area, jurisdiction, outcome, status, verification_status, created_at
         FROM advocate_case_history
         WHERE status != 'draft' AND year IS NOT NULL
         ORDER BY year DESC, created_at DESC`
      );
      return rows.map((row: any) => {
        const history = historyRows.filter((h: any) => h.advocate_id === row.advocate_id).slice(0, 3);
        return {
          advocateId: row.advocate_id,
          name: row.name,
          avatar: row.avatar || undefined,
          title: row.title || undefined,
          barNumber: row.bar_number || undefined,
          practiceAreas: (row.practice_areas || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          jurisdiction: row.jurisdiction || '',
          court: row.court || '',
          experienceYears: Number(row.experience_years || 0),
          consultationFee: row.consultation_fee || undefined,
          bio: row.bio || undefined,
          location: row.location || undefined,
          verificationStatus: row.verification_status || 'unverified',
          languages: (row.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          verifiedCaseCount: Number(row.verified_case_count || 0),
          recentCases: history.map((h: any) => ({
            case_title: h.case_title,
            court: h.court || '',
            year: Number(h.year || 0),
            practice_area: h.practice_area || '',
            jurisdiction: h.jurisdiction || '',
            outcome: h.outcome || '',
            status: h.status || '',
            verification_status: h.verification_status || 'unverified'
          }))
        };
      });
    },

    // CONSULTATION NOTE OPERATIONS
    async createConsultationNote(note: ConsultationNoteRecord): Promise<ConsultationNoteRecord> {
      const updated = nowIso();
      const { rows } = await client.query(
        `INSERT INTO consultation_notes (id, booking_id, advocate_id, client_id, note, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [note.id, note.booking_id, note.advocate_id, note.client_id || null, note.note, note.created_at || updated, note.updated_at || updated]
      );
      return mapConsultationNoteRow(rows[0]);
    },

    async getConsultationNotes(bookingId: string): Promise<ConsultationNoteRecord[]> {
      const { rows } = await client.query(
        'SELECT * FROM consultation_notes WHERE booking_id = $1 ORDER BY created_at ASC',
        [bookingId]
      );
      return rows.map(mapConsultationNoteRow);
    },

    // CONSULTATION MESSAGE OPERATIONS
    async addConsultationMessage(message: ConsultationMessageRecord): Promise<ConsultationMessageRecord> {
      const { rows } = await client.query(
        `INSERT INTO consultation_messages (id, booking_id, sender_id, sender_name, sender_role, content, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [message.id, message.booking_id, message.sender_id, message.sender_name, message.sender_role, message.content, message.created_at || nowIso()]
      );
      return mapConsultationMessageRow(rows[0]);
    },

    async getConsultationMessages(bookingId: string): Promise<ConsultationMessageRecord[]> {
      const { rows } = await client.query(
        'SELECT * FROM consultation_messages WHERE booking_id = $1 ORDER BY created_at ASC',
        [bookingId]
      );
      return rows.map(mapConsultationMessageRow);
    },

    // VERIFICATION CODE (OTP) OPERATIONS
    async createVerificationCode(code: VerificationCodeRecord): Promise<VerificationCodeRecord> {
      const { rows } = await client.query(
        `INSERT INTO verification_codes (id, email, code_hash, purpose, expires_at, consumed_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [code.id, code.email, code.code_hash, code.purpose, code.expires_at, code.consumed_at || null, code.created_at]
      );
      return mapVerificationCodeRow(rows[0]);
    },

    async findVerificationCodeByHash(email: string, purpose: string, codeHash: string): Promise<VerificationCodeRecord | undefined> {
      const { rows } = await client.query(
        `SELECT * FROM verification_codes WHERE lower(email) = lower($1) AND purpose = $2 AND code_hash = $3
           AND consumed_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1`,
        [email, purpose, codeHash]
      );
      return rows[0] ? mapVerificationCodeRow(rows[0]) : undefined;
    },

    async consumeVerificationCode(id: string): Promise<VerificationCodeRecord | undefined> {
      const { rows } = await client.query(
        `UPDATE verification_codes SET consumed_at = $2 WHERE id = $1 RETURNING *`,
        [id, nowIso()]
      );
      return rows[0] ? mapVerificationCodeRow(rows[0]) : undefined;
    },

    // DOCUMENT OPERATIONS
    async createDocument(record: DocumentRecord): Promise<DocumentRecord> {
      const { rows } = await client.query(
        `INSERT INTO documents (id, client_id, case_id, name, size, type, category, document_type,
                                summary, upload_date, analysis_status, analysis, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [
          record.id,
          record.client_id,
          record.case_id || null,
          record.name,
          record.size || null,
          record.type || null,
          record.category || null,
          record.document_type || null,
          record.summary || null,
          record.upload_date || nowIso(),
          record.analysis_status,
          record.analysis || null,
          record.created_at,
          record.created_at
        ]
      );
      return mapDocumentRow(rows[0]);
    },

    async getDocumentsForClient(clientId: string): Promise<DocumentRecord[]> {
      const { rows } = await client.query(
        'SELECT * FROM documents WHERE client_id = $1 ORDER BY upload_date DESC',
        [clientId]
      );
      return rows.map(mapDocumentRow);
    },

    async findDocumentByIdAndClient(docId: string, clientId: string): Promise<DocumentRecord | undefined> {
      const { rows } = await client.query(
        'SELECT * FROM documents WHERE id = $1 AND client_id = $2 LIMIT 1',
        [docId, clientId]
      );
      return rows[0] ? mapDocumentRow(rows[0]) : undefined;
    },

    async deleteDocument(docId: string, clientId: string): Promise<boolean> {
      const { rowCount } = await client.query(
        'DELETE FROM documents WHERE id = $1 AND client_id = $2',
        [docId, clientId]
      );
      return (rowCount ?? 0) > 0;
    },

    async updateDocumentAnalysis(docId: string, clientId: string, analysis: DocumentRecord['analysis'], analysisStatus: string, summary: string): Promise<DocumentRecord | undefined> {
      const { rows } = await client.query(
        `UPDATE documents SET analysis = $3, analysis_status = $4, summary = $5, updated_at = $6
         WHERE id = $1 AND client_id = $2 RETURNING *`,
        [docId, clientId, analysis || null, analysisStatus, summary, nowIso()]
      );
      return rows[0] ? mapDocumentRow(rows[0]) : undefined;
    },

    // SAVED ADVOCATE OPERATIONS
    async createSavedAdvocate(record: SavedAdvocateRecord): Promise<SavedAdvocateRecord> {
      const { rows } = await client.query(
        `INSERT INTO saved_advocates (id, client_id, advocate_id, advocate_data, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (client_id, advocate_id) DO NOTHING
         RETURNING *`,
        [record.id, record.client_id, record.advocate_id, record.advocate_data, record.created_at]
      );
      if (!rows[0]) {
        const existing = await client.query(
          'SELECT * FROM saved_advocates WHERE client_id = $1 AND advocate_id = $2 LIMIT 1',
          [record.client_id, record.advocate_id]
        );
        return mapSavedAdvocateRow(existing.rows[0]);
      }
      return mapSavedAdvocateRow(rows[0]);
    },

    async getSavedAdvocatesForClient(clientId: string): Promise<SavedAdvocateRecord[]> {
      const { rows } = await client.query(
        'SELECT * FROM saved_advocates WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
      );
      return rows.map(mapSavedAdvocateRow);
    },

    async deleteSavedAdvocate(advocateId: string, clientId: string): Promise<boolean> {
      const { rowCount } = await client.query(
        'DELETE FROM saved_advocates WHERE advocate_id = $1 AND client_id = $2',
        [advocateId, clientId]
      );
      return (rowCount ?? 0) > 0;
    }
  };
}

export { getPool };