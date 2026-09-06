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
  phone?: string;
  preferredLanguage?: string;
  privacyConsent?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseRecord {
  id: string;
  client_id: string;
  title: string;
  state: string;
  readiness_score: number;
  readiness_stage: string;
  jurisdiction: string;
  practice_area: string;
  procedural_stage: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  client_id: string;
  case_id: string | null;
  name: string;
  size: string;
  type: string;
  category: string;
  document_type: string;
  summary: string;
  upload_date: string;
  analysis_status: string;
  created_at: string;
  updated_at: string;
}

export interface SavedAdvocateRecord {
  id: string;
  client_id: string;
  advocate_id: string;
  advocate_data: string;
  created_at: string;
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
  createBooking(booking: BookingRecord): Promise<BookingRecord>;
  seedDefaultBookings(): Promise<void>;

  // CONSULTATION LOG OPERATIONS
  findConsultationLog(bookingId: string): Promise<ConsultationLogRecord | undefined>;
  saveConsultationLog(log: ConsultationLogRecord): Promise<ConsultationLogRecord>;
  addConsultationNotes(bookingId: string, notes: string): Promise<ConsultationLogRecord | undefined>;

  // CASE OPERATIONS
  createCase(caseRecord: CaseRecord): Promise<CaseRecord>;
  findCaseById(caseId: string): Promise<CaseRecord | undefined>;
  findCaseByIdAndClient(caseId: string, clientId: string): Promise<CaseRecord | undefined>;
  getCasesForClient(clientId: string): Promise<CaseRecord[]>;
  updateCase(caseId: string, updates: Partial<Omit<CaseRecord, 'id' | 'client_id' | 'created_at'>>): Promise<CaseRecord | undefined>;

  // DOCUMENT OPERATIONS
  createDocument(record: DocumentRecord): Promise<DocumentRecord>;
  getDocumentsForClient(clientId: string): Promise<DocumentRecord[]>;
  findDocumentByIdAndClient(docId: string, clientId: string): Promise<DocumentRecord | undefined>;
  deleteDocument(docId: string, clientId: string): Promise<boolean>;

  // SAVED ADVOCATE OPERATIONS
  createSavedAdvocate(record: SavedAdvocateRecord): Promise<SavedAdvocateRecord>;
  getSavedAdvocatesForClient(clientId: string): Promise<SavedAdvocateRecord[]>;
  deleteSavedAdvocate(advocateId: string, clientId: string): Promise<boolean>;
}