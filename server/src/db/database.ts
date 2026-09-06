import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Role } from '../types/index.js';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  avatar?: string;
  title?: string;
  barNumber?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  advocateId: string;
  advocateName: string;
  advocateAvatar?: string;
  advocateTitle?: string;
  date: string;
  timeSlot: string;
  matterTitle: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  fee: string;
  scheduledTimeIso: string;
  created_at: string;
  updated_at: string;
}

export interface ConsultationLogRecord {
  id: string;
  bookingId: string;
  channelName: string;
  clientId: string;
  advocateId: string;
  started_at: string;
  ended_at?: string;
  durationSeconds?: number;
  status: 'active' | 'completed' | 'abandoned';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  bookings: BookingRecord[];
  consultations: ConsultationLogRecord[];
}

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel
  ? path.join(os.tmpdir(), 'nyayai-data')
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let inMemorySchema: DatabaseSchema | null = null;

function ensureDataDirectoryExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data directory, using in-memory fallback:', err);
  }
}

const DEFAULT_CLIENT_HASH = '$2b$10$S4dF0Cuc4vR9MRxxaaZBOeNGf3yP2OICVKVPP1XkWsx3kvFI2hMuy';
const DEFAULT_ADVOCATE_HASH = '$2b$10$x3Grb7/clPF6UIV.Pp8sNeSQwSTHihcFAG/w/aJj5GTtvCTYika3S';

function ensureDefaultSeed(schema: DatabaseSchema): DatabaseSchema {
  if (!schema.users.some(u => u.email.toLowerCase() === 'client@nyayai.demo')) {
    schema.users.push({
      id: 'usr-client-1',
      name: 'Rohan Sharma',
      email: 'client@nyayai.demo',
      password_hash: DEFAULT_CLIENT_HASH,
      role: 'CLIENT',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  if (!schema.users.some(u => u.email.toLowerCase() === 'advocate@nyayai.demo')) {
    schema.users.push({
      id: 'usr-advocate-1',
      name: 'Adv. Rajesh Varma',
      email: 'advocate@nyayai.demo',
      password_hash: DEFAULT_ADVOCATE_HASH,
      role: 'ADVOCATE',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      title: 'Senior Criminal Defense & High Court Advocate',
      barNumber: 'KAR/2012/4819',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  if (!schema.bookings.some(b => b.id === 'bk-501')) {
    schema.bookings.push({
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
    });
    schema.bookings.push({
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
    });
  }

  return schema;
}

function readDb(): DatabaseSchema {
  if (inMemorySchema) {
    return ensureDefaultSeed(inMemorySchema);
  }
  ensureDataDirectoryExists();
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      inMemorySchema = ensureDefaultSeed({
        users: parsed.users || [],
        bookings: parsed.bookings || [],
        consultations: parsed.consultations || []
      });
      return inMemorySchema;
    }
  } catch (error) {
    console.error('Error reading database file, using in-memory schema:', error);
  }
  inMemorySchema = ensureDefaultSeed({ users: [], bookings: [], consultations: [] });
  return inMemorySchema;
}

function writeDb(data: DatabaseSchema): void {
  inMemorySchema = ensureDefaultSeed(data);
  try {
    ensureDataDirectoryExists();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.warn('Could not write database file to disk (serverless mode):', err);
  }
}

export const db = {
  findUserByEmail(email: string): UserRecord | undefined {
    const data = readDb();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserById(id: string): UserRecord | undefined {
    const data = readDb();
    return data.users.find(u => u.id === id);
  },

  createUser(user: UserRecord): UserRecord {
    const data = readDb();
    if (data.users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new Error(`User with email ${user.email} already exists`);
    }
    data.users.push(user);
    writeDb(data);
    return user;
  },

  updateUser(id: string, updates: Partial<Omit<UserRecord, 'id' | 'created_at'>>): UserRecord | undefined {
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

  getAllUsers(): UserRecord[] {
    const data = readDb();
    return data.users;
  },

  // BOOKING OPERATIONS
  findBookingById(bookingId: string): BookingRecord | undefined {
    const data = readDb();
    return data.bookings.find(b => b.id === bookingId);
  },

  getBookingsForUser(userId: string, role: Role): BookingRecord[] {
    const data = readDb();
    if (role === 'CLIENT') {
      return data.bookings.filter(b => b.clientId === userId || b.clientId === 'client-1' || b.clientId === 'usr-client-1');
    } else {
      return data.bookings.filter(b => b.advocateId === userId || b.advocateId === 'lawyer-1' || b.advocateId === 'usr-advocate-1');
    }
  },

  seedDefaultBookings(): void {
    const data = readDb();
    const existing = data.bookings.find(b => b.id === 'bk-501');
    if (!existing) {
      const defaultBooking: BookingRecord = {
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
      };
      data.bookings.push(defaultBooking);

      const completedBooking: BookingRecord = {
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
      };
      data.bookings.push(completedBooking);

      writeDb(data);
    }
  },

  // CONSULTATION LOG OPERATIONS
  findConsultationLog(bookingId: string): ConsultationLogRecord | undefined {
    const data = readDb();
    return data.consultations.find(c => c.bookingId === bookingId);
  },

  saveConsultationLog(log: ConsultationLogRecord): ConsultationLogRecord {
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

  addConsultationNotes(bookingId: string, notes: string): ConsultationLogRecord | undefined {
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

