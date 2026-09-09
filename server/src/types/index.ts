export type Role = 'CLIENT' | 'ADVOCATE';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type FactCompletenessLevel = 0 | 0.25 | 0.5 | 0.75 | 1.0;

export type MessageIntent =
  | 'GREETING'
  | 'META_QUESTION'
  | 'CASE_INTAKE'
  | 'CASE_FACT_UPDATE'
  | 'LEGAL_QUESTION'
  | 'DOCUMENT_QUERY'
  | 'READINESS_QUERY'
  | 'READINESS_MANIPULATION_ATTEMPT'
  | 'CASUAL_CONVERSATION'
  | 'DOCUMENT_RELATED'
  | 'OUT_OF_SCOPE';

export interface FactValue<T = any> {
  value: T;
  source: 'client_chat' | 'document' | 'corroborated';
  confidence: number;
  documentId?: string;
  completeness: FactCompletenessLevel;
  sourcesList?: string[];
}

export interface CaseFacts {
  matter: FactValue<string | null>;
  incidentDescription: FactValue<string | null>;
  country: FactValue<string | null>;
  state: FactValue<string | null>;
  city: FactValue<string | null>;
  jurisdiction: FactValue<string | null>;
  incidentDate: FactValue<string | null>;
  parties: FactValue<string[]>;
  opposingParty: FactValue<string | null>;
  relationship: FactValue<string | null>;
  timeline: FactValue<string | null>;
  keyFacts: FactValue<string[]>;
  financialImpact: FactValue<string | null>;
  policeStatus: FactValue<boolean | 'NONE' | null>;
  proceedingsStatus: FactValue<string | null>;
  proceduralStage: FactValue<string | null>;
  noticesOrders: FactValue<string | null>;
  documents: FactValue<number>;
  evidence: FactValue<string[]>;
  courtInvolvement: FactValue<string | null>;
  urgency: FactValue<string | null>;
  clientObjective: FactValue<string | null>;
  newCriminalLaws: FactValue<boolean | null>;

  // Case-Specific Parameters
  agreementDetails?: FactValue<string | null>;
  possessionDueDate?: FactValue<string | null>;
  medicalInjuryEvidence?: FactValue<string | null>;
  userRole?: FactValue<'victim' | 'complainant' | 'witness' | 'observer' | 'accused' | 'respondent' | 'property_owner' | 'consumer' | 'buyer' | 'tenant' | 'employee' | 'unknown' | string | null>;
}

/**
 * Structured facts returned by the LLM fact-extraction step for a single user
 * message. Every field is optional and null when not present/ambiguous — the
 * deterministic merge layer decides what to store, never the LLM directly.
 * "correction" is a user's explicit contradiction of a previously stored value.
 */
export interface ExtractedFacts {
  matter?: string | null;
  incidentDescription?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  jurisdiction?: string | null;
  incidentDate?: string | null;
  timeline?: string | null;
  parties?: string[] | null;
  opposingParty?: string | null;
  relationship?: string | null;
  keyFacts?: string[] | null;
  financialImpact?: string | null;
  policeStatus?: boolean | 'NONE' | null;
  proceedingsStatus?: string | null;
  proceduralStage?: string | null;
  noticesOrders?: string | null;
  documents?: FactValue<number> | null;
  evidence?: string[] | null;
  courtInvolvement?: string | null;
  urgency?: string | null;
  clientObjective?: string | null;
  medicalInjuryEvidence?: string | null;
  agreementDetails?: string | null;
  possessionDueDate?: string | null;
  newCriminalLaws?: boolean | null;
  userRole?: 'victim' | 'complainant' | 'witness' | 'observer' | 'accused' | 'respondent' | 'property_owner' | 'consumer' | 'buyer' | 'tenant' | 'employee' | 'unknown' | string | null;
  correction?: Partial<Record<keyof CaseFacts, string | boolean | string[]>> | null;
  confidence: number;
  isQuestion?: boolean;
  isAmbiguous?: boolean;
  clarificationPrompt?: string;
}

export interface AdvocateMatchResult {
  id: string;
  name: string;
  avatar: string;
  title: string;
  matchScore: number;
  practiceArea: string;
  jurisdiction: string;
  court: string;
  experienceYears: number;
  whyMatch: string[];
  breakdown: Record<string, number>;
  matchedCases?: any[];
  consultationFee?: string;
  budgetFit?: 'within' | 'slightly-above' | 'above' | 'unknown';
  verificationStatus?: string;
  verifiedCaseCount?: number;
  location?: string;
  barNumber?: string;
  bio?: string;
}

export interface ScoreHistoryEntry {
  timestamp: string;
  previousScore: number;
  newScore: number;
  changedParameters: string[];
  reason: string;
}

export type ReadinessStage =
  | 'INITIAL INTAKE'
  | 'BASIC CONTEXT'
  | 'CASE CONTEXT DEVELOPING'
  | 'SUBSTANTIAL CASE UNDERSTANDING'
  | 'COUNSEL-READY'
  | 'HIGH INFORMATION COMPLETENESS';

export type DiscoveryStatus = 'NEEDS_INFORMATION' | 'READY_FOR_RECOMMENDATION';

export type DocumentCategory = 'IDENTITY' | 'CASE_DOCUMENT' | 'SUPPORTING_EVIDENCE' | 'PERSONAL';

export interface DocumentExtractedEntities {
  parties: string[];
  personNames: string[];
  importantDates: string[];
  firOrCaseNumbers: string[];
  jurisdiction: string;
  courtOrPoliceStation: string;
  legalSections: string[];
  clauses: string[];
  obligations: string[];
  deadlines: string[];
  monetaryAmounts: string[];
  importantEvents: string[];
  potentialRisks: string[];
  missingInformation: string[];
}

export interface DocumentAnalysisResult {
  documentId: string;
  filename: string;
  fileSize: string;
  fileType: string;
  documentCategory: DocumentCategory;
  documentType: string;
  isRelevant: boolean;
  relevanceScore: number;
  unrelatedReason?: string;
  privacyNoticeRequired: boolean;
  maskedIdentifier?: string;
  analysisStatus: 'UPLOADING' | 'ANALYZING' | 'ANALYZED' | 'REVIEW REQUIRED' | 'FAILED';
  extractedEntities: DocumentExtractedEntities;
  extractedCaseFacts: string[];
  confidence: number;
  relevantParameters: string[];
  contradictions: Array<{ field: string; clientValue: any; documentValue: any }>;
  summary: string;
  analysisResponseText: string;
  readinessContribution: number;
}

export interface VaultDocumentItem {
  id: string;
  name: string;
  size: string;
  type: string;
  category: DocumentCategory;
  documentType: string;
  summary: string;
  uploadDate: string;
  analysis?: DocumentAnalysisResult;
}

export interface CaseState {
  caseId: string;
  title: string;
  facts: CaseFacts;
  readinessScore: number; // 0-100%
  readinessStage: ReadinessStage;
  scoreHistory: ScoreHistoryEntry[];
  discoveryStatus: DiscoveryStatus;
  missingInformation: string[];
  allMissingInformation: string[];
  establishedFacts: Array<{ label: string; value: string; source: string }>;
  caseUnderstanding: Array<{ key: string; label: string; value: string; status: 'verified' | 'pending' | 'missing' }>;
  legalAuthorities: string[];
  quickResponses: string[];
  documents: VaultDocumentItem[];
  recommendationData: AdvocateMatchResult[];
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp?: string }>;
  contradictions?: string[];
  lastIntent?: MessageIntent;
  lastExtracted?: string[];
  practiceArea?: string;
}
