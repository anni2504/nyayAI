import type { Role } from '../types/index.js';

export type { Role };

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

export type DatabaseDriver = 'json' | 'postgres';

export interface DatabaseStore {
  /** Identifier of the active storage driver. */
  driver: DatabaseDriver;

  // USER OPERATIONS
  findUserByEmail(email: string): Promise<UserRecord | undefined>;
  findUserById(id: string): Promise<UserRecord | undefined>;
  createUser(user: UserRecord): Promise<UserRecord>;
  updateUser(id: string, updates: Partial<Omit<UserRecord, 'id' | 'created_at'>>): Promise<UserRecord | undefined>;
  getAllUsers(): Promise<UserRecord[]>;

  // BOOKING OPERATIONS
  findBookingById(bookingId: string): Promise<BookingRecord | undefined>;
  getBookingsForUser(userId: string, role: Role): Promise<BookingRecord[]>;
  seedDefaultBookings(): Promise<void>;

  // CONSULTATION LOG OPERATIONS
  findConsultationLog(bookingId: string): Promise<ConsultationLogRecord | undefined>;
  saveConsultationLog(log: ConsultationLogRecord): Promise<ConsultationLogRecord>;
  addConsultationNotes(bookingId: string, notes: string): Promise<ConsultationLogRecord | undefined>;
}