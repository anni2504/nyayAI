import type { DatabaseStore, DatabaseDriver, UserRecord, BookingRecord, ConsultationLogRecord, CaseRecord, DocumentRecord, SavedAdvocateRecord, CaseMessageRecord, CaseStateSnapshotRecord, AdvocateProfileRecord, AdvocateCaseHistoryRecord, ConsultationNoteRecord, ConsultationMessageRecord, AdvocateDirectoryEntry, BookingStatus, VerificationCodeRecord } from './types.js';
import { createJsonStore } from './jsonStore.js';
import { initPostgresStore } from './postgresStore.js';
import { logger } from '../utils/logger.js';

export type { DatabaseStore, DatabaseDriver, UserRecord, BookingRecord, ConsultationLogRecord, CaseRecord, DocumentRecord, SavedAdvocateRecord, CaseMessageRecord, CaseStateSnapshotRecord, AdvocateProfileRecord, AdvocateCaseHistoryRecord, ConsultationNoteRecord, ConsultationMessageRecord, AdvocateDirectoryEntry, BookingStatus, VerificationCodeRecord };

export interface DatabaseInitResult {
  driver: DatabaseDriver;
  store: DatabaseStore;
}

let activeStore: DatabaseStore | null = null;

export function isDatabaseInitialized(): boolean {
  return activeStore !== null;
}

function hasPostgresConfig(): boolean {
  return !!(process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING);
}

/**
 * Initializes the active database store.
 * - PostgreSQL when DATABASE_URL is configured (schema auto-created).
 * - File-backed JSON store otherwise (local development / fallback).
 * Idempotent: subsequent calls return the already-initialized store.
 */
export async function initDatabase(): Promise<DatabaseInitResult> {
  if (activeStore) {
    return { driver: activeStore.driver, store: activeStore };
  }

  // Try PostgreSQL first if DATABASE_URL is configured
  if (hasPostgresConfig()) {
    try {
      activeStore = await initPostgresStore();
      logger.info('Database store initialized: PostgreSQL (DATABASE_URL configured).');
      return { driver: activeStore.driver, store: activeStore };
    } catch (err: any) {
      logger.warn('PostgreSQL initialization failed, falling back to JSON store:', err.message);
      // Fall through to JSON store
    }
  }

  activeStore = createJsonStore();
  logger.info('Database store initialized: file-backed JSON store. Set DATABASE_URL to enable PostgreSQL.');
  return { driver: activeStore.driver, store: activeStore };
}

function store(): DatabaseStore {
  if (!activeStore) {
    throw new Error('Database not initialized. Call initDatabase() before accessing the store.');
  }
  return activeStore;
}

export const db: DatabaseStore = {
  get driver(): DatabaseDriver {
    return store().driver;
  },

  findUserByEmail: email => store().findUserByEmail(email),
  findUserById: id => store().findUserById(id),
  createUser: user => store().createUser(user),
  updateUser: (id, updates) => store().updateUser(id, updates),
  getAllUsers: () => store().getAllUsers(),

  findBookingById: bookingId => store().findBookingById(bookingId),
  getBookingsForUser: (userId, role) => store().getBookingsForUser(userId, role),
  createBooking: booking => store().createBooking(booking),
  updateBookingStatus: (bookingId, status) => store().updateBookingStatus(bookingId, status),
  seedDefaultBookings: () => store().seedDefaultBookings(),

  findConsultationLog: bookingId => store().findConsultationLog(bookingId),
  saveConsultationLog: log => store().saveConsultationLog(log),
  addConsultationNotes: (bookingId, notes) => store().addConsultationNotes(bookingId, notes),

  createCase: caseRecord => store().createCase(caseRecord),
  findCaseById: caseId => store().findCaseById(caseId),
  findCaseByIdAndClient: (caseId, clientId) => store().findCaseByIdAndClient(caseId, clientId),
  getCasesForClient: clientId => store().getCasesForClient(clientId),
  updateCase: (caseId, updates) => store().updateCase(caseId, updates),

  getMessagesForCase: caseId => store().getMessagesForCase(caseId),
  addCaseMessage: message => store().addCaseMessage(message),

  saveCaseStateSnapshot: snapshot => store().saveCaseStateSnapshot(snapshot),
  getCaseStateSnapshot: caseId => store().getCaseStateSnapshot(caseId),

  getAdvocateProfiles: () => store().getAdvocateProfiles(),
  getAdvocateProfile: advocateId => store().getAdvocateProfile(advocateId),
  upsertAdvocateProfile: profile => store().upsertAdvocateProfile(profile),

  getAdvocateCaseHistory: advocateId => store().getAdvocateCaseHistory(advocateId),
  addAdvocateCaseHistory: record => store().addAdvocateCaseHistory(record),
  updateAdvocateCaseHistory: record => store().updateAdvocateCaseHistory(record),
  deleteAdvocateCaseHistory: (id, advocateId) => store().deleteAdvocateCaseHistory(id, advocateId),

  getAdvocateDirectory: () => store().getAdvocateDirectory(),

  createConsultationNote: note => store().createConsultationNote(note),
  getConsultationNotes: bookingId => store().getConsultationNotes(bookingId),

  addConsultationMessage: message => store().addConsultationMessage(message),
  getConsultationMessages: bookingId => store().getConsultationMessages(bookingId),

  createVerificationCode: code => store().createVerificationCode(code),
  findVerificationCodeByHash: (email, purpose, codeHash) => store().findVerificationCodeByHash(email, purpose, codeHash),
  consumeVerificationCode: id => store().consumeVerificationCode(id),

  createDocument: record => store().createDocument(record),
  getDocumentsForClient: clientId => store().getDocumentsForClient(clientId),
  findDocumentByIdAndClient: (docId, clientId) => store().findDocumentByIdAndClient(docId, clientId),
  deleteDocument: (docId, clientId) => store().deleteDocument(docId, clientId),
  updateDocumentAnalysis: (docId, clientId, analysis, analysisStatus, summary) => store().updateDocumentAnalysis(docId, clientId, analysis, analysisStatus, summary),

  createSavedAdvocate: record => store().createSavedAdvocate(record),
  getSavedAdvocatesForClient: clientId => store().getSavedAdvocatesForClient(clientId),
  deleteSavedAdvocate: (advocateId, clientId) => store().deleteSavedAdvocate(advocateId, clientId)
};