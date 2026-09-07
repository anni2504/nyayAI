import fs from 'fs';
import path from 'path';
import os from 'os';
import type { DatabaseStore, UserRecord, BookingRecord, ConsultationLogRecord, CaseRecord, DocumentRecord, SavedAdvocateRecord, CaseMessageRecord, CaseStateSnapshotRecord, AdvocateProfileRecord, AdvocateCaseHistoryRecord, ConsultationNoteRecord, VerificationCodeRecord, ConsultationMessageRecord, AdvocateDirectoryEntry, BookingStatus, DatabaseDriver } from './types.js';
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
  cases: CaseRecord[];
  documents: DocumentRecord[];
  savedAdvocates: SavedAdvocateRecord[];
  caseMessages: CaseMessageRecord[];
  caseStateSnapshots: CaseStateSnapshotRecord[];
  advocateProfiles: AdvocateProfileRecord[];
  advocateCaseHistory: AdvocateCaseHistoryRecord[];
  consultationNotes: ConsultationNoteRecord[];
  consultationMessages: ConsultationMessageRecord[];
  verificationCodes: VerificationCodeRecord[];
}

function emptySchema(): DatabaseSchema {
  return {
    users: [],
    bookings: [],
    consultations: [],
    cases: [],
    documents: [],
    savedAdvocates: [],
    caseMessages: [],
    caseStateSnapshots: [],
    advocateProfiles: [],
    advocateCaseHistory: [],
    consultationNotes: [],
    consultationMessages: [],
    verificationCodes: []
  };
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
        consultations: parsed.consultations || [],
        cases: parsed.cases || [],
        documents: parsed.documents || [],
        savedAdvocates: parsed.savedAdvocates || [],
        caseMessages: parsed.caseMessages || [],
        caseStateSnapshots: parsed.caseStateSnapshots || [],
        advocateProfiles: parsed.advocateProfiles || [],
        advocateCaseHistory: parsed.advocateCaseHistory || [],
        consultationNotes: parsed.consultationNotes || [],
        consultationMessages: parsed.consultationMessages || [],
        verificationCodes: parsed.verificationCodes || []
      };
      logger.info(`Loaded JSON document store from ${DB_FILE}`);
      return inMemorySchema;
    }
  } catch (error) {
    logger.error('Error reading database file, using in-memory schema:', error);
  }
  inMemorySchema = emptySchema();
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
        return data.bookings.filter(b => b.clientId === userId);
      } else {
        return data.bookings.filter(b => b.advocateId === userId);
      }
    },

    async createBooking(booking: BookingRecord): Promise<BookingRecord> {
      const data = readDb();
      data.bookings.push(booking);
      writeDb(data);
      return booking;
    },

    async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<BookingRecord | undefined> {
      const data = readDb();
      const index = data.bookings.findIndex(b => b.id === bookingId);
      if (index === -1) return undefined;
      data.bookings[index] = {
        ...data.bookings[index],
        status,
        updated_at: new Date().toISOString()
      };
      writeDb(data);
      return data.bookings[index];
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
    },

    // CASE OPERATIONS
    async createCase(caseRecord: CaseRecord): Promise<CaseRecord> {
      const data = readDb();
      data.cases.push(caseRecord);
      writeDb(data);
      return caseRecord;
    },

    async findCaseById(caseId: string): Promise<CaseRecord | undefined> {
      const data = readDb();
      return data.cases.find(c => c.id === caseId);
    },

    async findCaseByIdAndClient(caseId: string, clientId: string): Promise<CaseRecord | undefined> {
      const data = readDb();
      return data.cases.find(c => c.id === caseId && c.client_id === clientId);
    },

    async getCasesForClient(clientId: string): Promise<CaseRecord[]> {
      const data = readDb();
      return data.cases
        .filter(c => c.client_id === clientId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    },

    async updateCase(caseId: string, updates: Partial<Omit<CaseRecord, 'id' | 'client_id' | 'created_at'>>): Promise<CaseRecord | undefined> {
      const data = readDb();
      const index = data.cases.findIndex(c => c.id === caseId);
      if (index === -1) return undefined;
      const updated: CaseRecord = {
        ...data.cases[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      data.cases[index] = updated;
      writeDb(data);
      return updated;
    },

    // CASE MESSAGE OPERATIONS
    async getMessagesForCase(caseId: string): Promise<CaseMessageRecord[]> {
      const data = readDb();
      return data.caseMessages
        .filter(m => m.case_id === caseId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    async addCaseMessage(message: CaseMessageRecord): Promise<CaseMessageRecord> {
      const data = readDb();
      data.caseMessages.push(message);
      writeDb(data);
      return message;
    },

    // CASE STATE SNAPSHOT
    async saveCaseStateSnapshot(snapshot: CaseStateSnapshotRecord): Promise<CaseStateSnapshotRecord> {
      const data = readDb();
      const index = data.caseStateSnapshots.findIndex(s => s.case_id === snapshot.case_id);
      if (index >= 0) {
        data.caseStateSnapshots[index] = snapshot;
      } else {
        data.caseStateSnapshots.push(snapshot);
      }
      writeDb(data);
      return snapshot;
    },

    async getCaseStateSnapshot(caseId: string): Promise<CaseStateSnapshotRecord | undefined> {
      const data = readDb();
      return data.caseStateSnapshots.find(s => s.case_id === caseId);
    },

    // ADVOCATE PROFILE OPERATIONS
    async getAdvocateProfiles(): Promise<AdvocateProfileRecord[]> {
      const data = readDb();
      return [...data.advocateProfiles].sort((a, b) => b.experience_years - a.experience_years);
    },

    async getAdvocateProfile(advocateId: string): Promise<AdvocateProfileRecord | undefined> {
      const data = readDb();
      return data.advocateProfiles.find(p => p.advocate_id === advocateId);
    },

    async upsertAdvocateProfile(profile: AdvocateProfileRecord): Promise<AdvocateProfileRecord> {
      const data = readDb();
      const index = data.advocateProfiles.findIndex(p => p.advocate_id === profile.advocate_id);
      profile.updated_at = new Date().toISOString();
      if (index >= 0) {
        data.advocateProfiles[index] = profile;
      } else {
        data.advocateProfiles.push(profile);
      }
      writeDb(data);
      return profile;
    },

    // ADVOCATE CASE HISTORY OPERATIONS
    async getAdvocateCaseHistory(advocateId: string): Promise<AdvocateCaseHistoryRecord[]> {
      const data = readDb();
      return data.advocateCaseHistory
        .filter(h => h.advocate_id === advocateId)
        .sort((a, b) => b.year - a.year);
    },

    async addAdvocateCaseHistory(record: AdvocateCaseHistoryRecord): Promise<AdvocateCaseHistoryRecord> {
      const data = readDb();
      data.advocateCaseHistory.push(record);
      writeDb(data);
      return record;
    },

    async updateAdvocateCaseHistory(record: AdvocateCaseHistoryRecord): Promise<AdvocateCaseHistoryRecord | undefined> {
      const data = readDb();
      const index = data.advocateCaseHistory.findIndex(h => h.id === record.id && h.advocate_id === record.advocate_id);
      if (index === -1) return undefined;
      data.advocateCaseHistory[index] = { ...data.advocateCaseHistory[index], ...record };
      writeDb(data);
      return data.advocateCaseHistory[index];
    },

    async deleteAdvocateCaseHistory(id: string, advocateId: string): Promise<boolean> {
      const data = readDb();
      const index = data.advocateCaseHistory.findIndex(h => h.id === id && h.advocate_id === advocateId);
      if (index === -1) return false;
      data.advocateCaseHistory.splice(index, 1);
      writeDb(data);
      return true;
    },

    async getAdvocateDirectory(): Promise<AdvocateDirectoryEntry[]> {
      const data = readDb();
      const advocateUserIds = new Set(data.users.filter(u => u.role === 'ADVOCATE').map(u => u.id));
      return data.users
        .filter(u => u.role === 'ADVOCATE')
        .map(u => {
          const profile = data.advocateProfiles.find(p => p.advocate_id === u.id);
          const history = data.advocateCaseHistory
            .filter(h => h.advocate_id === u.id && h.status !== 'draft')
            .sort((a, b) => b.year - a.year);
          const verifiedHistory = history.filter(h => h.verification_status === 'verified');
          return {
            advocateId: u.id,
            name: u.name,
            avatar: u.avatar,
            title: u.title,
            barNumber: u.barNumber,
            practiceAreas: (profile?.practice_areas || '').split(',').map(s => s.trim()).filter(Boolean),
            jurisdiction: profile?.jurisdiction || '',
            court: profile?.court || '',
            experienceYears: profile?.experience_years || 0,
            consultationFee: profile?.consultation_fee,
            bio: profile?.bio,
            location: profile?.location,
            verificationStatus: profile?.verification_status || 'unverified',
            languages: (profile?.languages || '').split(',').map(s => s.trim()).filter(Boolean),
            verifiedCaseCount: verifiedHistory.length,
            recentCases: history.slice(0, 3).map(h => ({
              case_title: h.case_title,
              court: h.court,
              year: h.year,
              practice_area: h.practice_area,
              jurisdiction: h.jurisdiction,
              outcome: h.outcome,
              status: h.status,
              verification_status: h.verification_status
            }))
          };
        })
        .filter(() => advocateUserIds)
        .sort((a, b) => (b.verificationStatus === 'verified' ? 1 : 0) - (a.verificationStatus === 'verified' ? 1 : 0) || b.experienceYears - a.experienceYears);
    },

    // CONSULTATION NOTE OPERATIONS
    async createConsultationNote(note: ConsultationNoteRecord): Promise<ConsultationNoteRecord> {
      const data = readDb();
      data.consultationNotes.push(note);
      writeDb(data);
      return note;
    },

    async getConsultationNotes(bookingId: string): Promise<ConsultationNoteRecord[]> {
      const data = readDb();
      return data.consultationNotes
        .filter(n => n.booking_id === bookingId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    // CONSULTATION MESSAGE OPERATIONS
    async addConsultationMessage(message: ConsultationMessageRecord): Promise<ConsultationMessageRecord> {
      const data = readDb();
      data.consultationMessages = data.consultationMessages || [];
      data.consultationMessages.push(message);
      writeDb(data);
      return message;
    },

    async getConsultationMessages(bookingId: string): Promise<ConsultationMessageRecord[]> {
      const data = readDb();
      return (data.consultationMessages || [])
        .filter(m => m.booking_id === bookingId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    // VERIFICATION CODE (OTP) OPERATIONS
    async createVerificationCode(code: VerificationCodeRecord): Promise<VerificationCodeRecord> {
      const data = readDb();
      data.verificationCodes.push(code);
      writeDb(data);
      return code;
    },

    async findVerificationCodeByHash(email: string, purpose: string, codeHash: string): Promise<VerificationCodeRecord | undefined> {
      const data = readDb();
      const now = Date.now();
      return data.verificationCodes.find(c =>
        c.email.toLowerCase() === email.toLowerCase() &&
        c.purpose === purpose &&
        c.code_hash === codeHash &&
        !c.consumed_at &&
        new Date(c.expires_at).getTime() > now
      );
    },

    async consumeVerificationCode(id: string): Promise<VerificationCodeRecord | undefined> {
      const data = readDb();
      const index = data.verificationCodes.findIndex(c => c.id === id);
      if (index === -1) return undefined;
      data.verificationCodes[index].consumed_at = new Date().toISOString();
      writeDb(data);
      return data.verificationCodes[index];
    },

    // DOCUMENT OPERATIONS
    async createDocument(record: DocumentRecord): Promise<DocumentRecord> {
      const data = readDb();
      data.documents.push(record);
      writeDb(data);
      return record;
    },

    async getDocumentsForClient(clientId: string): Promise<DocumentRecord[]> {
      const data = readDb();
      return data.documents
        .filter(d => d.client_id === clientId)
        .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
    },

    async findDocumentByIdAndClient(docId: string, clientId: string): Promise<DocumentRecord | undefined> {
      const data = readDb();
      return data.documents.find(d => d.id === docId && d.client_id === clientId);
    },

    async deleteDocument(docId: string, clientId: string): Promise<boolean> {
      const data = readDb();
      const index = data.documents.findIndex(d => d.id === docId && d.client_id === clientId);
      if (index === -1) return false;
      data.documents.splice(index, 1);
      writeDb(data);
      return true;
    },

    async updateDocumentAnalysis(docId: string, clientId: string, analysis: DocumentRecord['analysis'], analysisStatus: string, summary: string): Promise<DocumentRecord | undefined> {
      const data = readDb();
      const index = data.documents.findIndex(d => d.id === docId && d.client_id === clientId);
      if (index === -1) return undefined;
      data.documents[index] = {
        ...data.documents[index],
        analysis: analysis || null,
        analysis_status: analysisStatus,
        summary,
        updated_at: new Date().toISOString()
      };
      writeDb(data);
      return data.documents[index];
    },

    // SAVED ADVOCATE OPERATIONS
    async createSavedAdvocate(record: SavedAdvocateRecord): Promise<SavedAdvocateRecord> {
      const data = readDb();
      data.savedAdvocates.push(record);
      writeDb(data);
      return record;
    },

    async getSavedAdvocatesForClient(clientId: string): Promise<SavedAdvocateRecord[]> {
      const data = readDb();
      return data.savedAdvocates
        .filter(s => s.client_id === clientId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    async deleteSavedAdvocate(advocateId: string, clientId: string): Promise<boolean> {
      const data = readDb();
      const index = data.savedAdvocates.findIndex(s => s.advocate_id === advocateId && s.client_id === clientId);
      if (index === -1) return false;
      data.savedAdvocates.splice(index, 1);
      writeDb(data);
      return true;
    }
  };
}