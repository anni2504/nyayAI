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
  analysis?: string | null; // JSON-serialized DocumentAnalysisResult
  created_at: string;
  updated_at: string;
}

export interface CaseMessageRecord {
  id: string;
  case_id: string;
  role: string;
  content: string;
  timestamp: string;
  created_at: string;
}

export interface CaseStateSnapshotRecord {
  case_id: string;
  state: string; // JSON-serialized CaseState
  updated_at: string;
}

export interface AdvocateProfileRecord {
  advocate_id: string;
  practice_areas: string; // JSON string[] or comma-joined
  jurisdiction: string;
  court: string;
  experience_years: number;
  consultation_fee?: string;
  bio?: string;
  location?: string;
  verification_status?: string;
  languages?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvocateCaseHistoryRecord {
  id: string;
  advocate_id: string;
  case_title: string;
  court: string;
  year: number;
  case_type: string;
  practice_area: string;
  jurisdiction: string;
  outcome: string;
  status: string;
  verification_status?: string;
  /** Corpus key (e.g. advocate-cases/usr-advocate-7/case-071.pdf) for the case
   *  file, when one exists in the legal corpus. */
  doc_file_key?: string | null;
  created_at: string;
}

export interface ConsultationMessageRecord {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
}

export interface AdvocateDirectoryEntry {
  advocateId: string;
  name: string;
  avatar?: string;
  title?: string;
  barNumber?: string;
  practiceAreas: string[];
  jurisdiction: string;
  court: string;
  experienceYears: number;
  consultationFee?: string;
  bio?: string;
  location?: string;
  verificationStatus: string;
  languages: string[];
  verifiedCaseCount: number;
  recentCases: Array<Pick<AdvocateCaseHistoryRecord, 'case_title' | 'court' | 'year' | 'practice_area' | 'jurisdiction' | 'outcome' | 'status' | 'verification_status'>>;
}

export interface ConsultationNoteRecord {
  id: string;
  booking_id: string;
  advocate_id: string;
  client_id?: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationCodeRecord {
  id: string;
  email: string;
  code_hash: string;
  purpose: string;
  expires_at: string;
  consumed_at?: string;
  created_at: string;
}

export interface SavedAdvocateRecord {
  id: string;
  client_id: string;
  advocate_id: string;
  advocate_data: string;
  created_at: string;
}

export type BookingStatus = 'pending' | 'accepted' | 'upcoming' | 'completed' | 'cancelled' | 'declined';

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
  status: BookingStatus;
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
  updateBookingStatus(bookingId: string, status: BookingStatus): Promise<BookingRecord | undefined>;
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

  // CASE MESSAGE OPERATIONS
  getMessagesForCase(caseId: string): Promise<CaseMessageRecord[]>;
  addCaseMessage(message: CaseMessageRecord): Promise<CaseMessageRecord>;

  // CASE STATE SNAPSHOT
  saveCaseStateSnapshot(snapshot: CaseStateSnapshotRecord): Promise<CaseStateSnapshotRecord>;
  getCaseStateSnapshot(caseId: string): Promise<CaseStateSnapshotRecord | undefined>;

  // ADVOCATE PROFILE OPERATIONS
  getAdvocateProfiles(): Promise<AdvocateProfileRecord[]>;
  getAdvocateProfile(advocateId: string): Promise<AdvocateProfileRecord | undefined>;
  upsertAdvocateProfile(profile: AdvocateProfileRecord): Promise<AdvocateProfileRecord>;

  // ADVOCATE CASE HISTORY OPERATIONS
  getAdvocateCaseHistory(advocateId: string): Promise<AdvocateCaseHistoryRecord[]>;
  addAdvocateCaseHistory(record: AdvocateCaseHistoryRecord): Promise<AdvocateCaseHistoryRecord>;
  updateAdvocateCaseHistory(record: AdvocateCaseHistoryRecord): Promise<AdvocateCaseHistoryRecord | undefined>;
  deleteAdvocateCaseHistory(id: string, advocateId: string): Promise<boolean>;

  // ADVOCATE DIRECTORY OPERATIONS
  getAdvocateDirectory(): Promise<AdvocateDirectoryEntry[]>;

  // CONSULTATION NOTE OPERATIONS
  createConsultationNote(note: ConsultationNoteRecord): Promise<ConsultationNoteRecord>;
  getConsultationNotes(bookingId: string): Promise<ConsultationNoteRecord[]>;

  // CONSULTATION MESSAGE OPERATIONS
  addConsultationMessage(message: ConsultationMessageRecord): Promise<ConsultationMessageRecord>;
  getConsultationMessages(bookingId: string): Promise<ConsultationMessageRecord[]>;

  // VERIFICATION CODE (OTP) OPERATIONS
  createVerificationCode(code: VerificationCodeRecord): Promise<VerificationCodeRecord>;
  findVerificationCodeByHash(email: string, purpose: string, codeHash: string): Promise<VerificationCodeRecord | undefined>;
  consumeVerificationCode(id: string): Promise<VerificationCodeRecord | undefined>;

  // DOCUMENT OPERATIONS
  createDocument(record: DocumentRecord): Promise<DocumentRecord>;
  getDocumentsForClient(clientId: string): Promise<DocumentRecord[]>;
  findDocumentByIdAndClient(docId: string, clientId: string): Promise<DocumentRecord | undefined>;
  deleteDocument(docId: string, clientId: string): Promise<boolean>;
  updateDocumentAnalysis(docId: string, clientId: string, analysis: DocumentRecord['analysis'], analysisStatus: string, summary: string): Promise<DocumentRecord | undefined>;

  // SAVED ADVOCATE OPERATIONS
  createSavedAdvocate(record: SavedAdvocateRecord): Promise<SavedAdvocateRecord>;
  getSavedAdvocatesForClient(clientId: string): Promise<SavedAdvocateRecord[]>;
  deleteSavedAdvocate(advocateId: string, clientId: string): Promise<boolean>;
}