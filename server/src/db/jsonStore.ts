import fs from 'fs';
import path from 'path';
import os from 'os';
import type { DatabaseStore, UserRecord, BookingRecord, ConsultationLogRecord, DatabaseDriver } from './types.js';
import type { Role } from '../types/index.js';
import { logger } from '../utils/logger.js';

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = process.env.NYAYAI_DATA_DIR
  || (isVercel
    ? path.join(os.tmpdir(), 'nyayai-data')
    : path.join(process.cwd(), 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  users: UserRecord[];
  bookings: BookingRecord[];
  consultations: ConsultationLogRecord[];
}

let inMemorySchema: DatabaseSchema | null = null;

function ensureDataDirectoryExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    logger.warn('Could not create data directory, using in-memory fallback:', err);
  }
}

function readDb(): DatabaseSchema {
  if (inMemorySchema) {
    return inMemorySchema;
  }
  ensureDataDirectoryExists();
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      inMemorySchema = {
        users: parsed.users || [],
        bookings: parsed.bookings || [],
        consultations: parsed.consultations || []
      };
      logger.info(`Loaded JSON document store from ${DB_FILE}`);
      return inMemorySchema;
    }
  } catch (error) {
    logger.error('Error reading database file, using in-memory schema:', error);
  }
  inMemorySchema = { users: [], bookings: [], consultations: [] };
  return inMemorySchema;
}

function writeDb(data: DatabaseSchema): void {
  inMemorySchema = data;
  try {
    ensureDataDirectoryExists();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    logger.warn('Could not write database file to disk (serverless mode):', err);
  }
}

function defaultBookings(): BookingRecord[] {
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
      status: 'upcoming',
      fee: '₹3,500',
      scheduledTimeIso: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
      status: 'completed',
      fee: '₹4,000',
      scheduledTimeIso: new Date(Date.now() - 86400000 * 7).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 7).toISOString()
    }
  ];
}

export function createJsonStore(): DatabaseStore {
  return {
    driver: 'json',

    async findUserByEmail(email: string): Promise<UserRecord | undefined> {
      const data = readDb();
      return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    },

    async findUserById(id: string): Promise<UserRecord | undefined> {
      const data = readDb();
      return data.users.find(u => u.id === id);
    },

    async createUser(user: UserRecord): Promise<UserRecord> {
      const data = readDb();
      if (data.users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
        throw new Error(`User with email ${user.email} already exists`);
      }
      data.users.push(user);
      writeDb(data);
      return user;
    },

    async updateUser(id: string, updates: Partial<Omit<UserRecord, 'id' | 'created_at'>>): Promise<UserRecord | undefined> {
      const data = readDb();
      const index = data.users.findIndex(u => u.id === id);
      if (index === -1) return undefined;

      const existing = data.users[index];
      const updated: UserRecord = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      };
      data.users[index] = updated;
      writeDb(data);
      return updated;
    },

    async getAllUsers(): Promise<UserRecord[]> {
      const data = readDb();
      return data.users;
    },

    // BOOKING OPERATIONS
    async findBookingById(bookingId: string): Promise<BookingRecord | undefined> {
      const data = readDb();
      return data.bookings.find(b => b.id === bookingId);
    },

    async getBookingsForUser(userId: string, role: Role): Promise<BookingRecord[]> {
      const data = readDb();
      if (role === 'CLIENT') {
        return data.bookings.filter(b => b.clientId === userId || b.clientId === 'client-1' || b.clientId === 'usr-client-1');
      } else {
        return data.bookings.filter(b => b.advocateId === userId || b.advocateId === 'lawyer-1' || b.advocateId === 'usr-advocate-1');
      }
    },

    async seedDefaultBookings(): Promise<void> {
      const data = readDb();
      if (data.bookings.some(b => b.id === 'bk-501')) {
        return;
      }
      data.bookings.push(...defaultBookings());
      writeDb(data);
    },

    // CONSULTATION LOG OPERATIONS
    async findConsultationLog(bookingId: string): Promise<ConsultationLogRecord | undefined> {
      const data = readDb();
      return data.consultations.find(c => c.bookingId === bookingId);
    },

    async saveConsultationLog(log: ConsultationLogRecord): Promise<ConsultationLogRecord> {
      const data = readDb();
      const index = data.consultations.findIndex(c => c.bookingId === log.bookingId);
      if (index >= 0) {
        data.consultations[index] = {
          ...data.consultations[index],
          ...log,
          updated_at: new Date().toISOString()
        };
      } else {
        data.consultations.push(log);
      }
      writeDb(data);
      return log;
    },

    async addConsultationNotes(bookingId: string, notes: string): Promise<ConsultationLogRecord | undefined> {
      const data = readDb();
      const index = data.consultations.findIndex(c => c.bookingId === bookingId);
      if (index >= 0) {
        data.consultations[index].notes = notes;
        data.consultations[index].updated_at = new Date().toISOString();
        writeDb(data);
        return data.consultations[index];
      }
      return undefined;
    }
  };
}