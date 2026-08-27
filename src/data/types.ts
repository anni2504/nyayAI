export type UserRole = 'client' | 'advocate';

export interface CaseUnderstandingItem {
  key: string;
  label: string;
  value: string;
  status: 'verified' | 'pending' | 'missing';
}

export interface ReadinessScoreBreakdown {
  matterClarity: number;
  facts: number;
  jurisdiction: number;
  legalDomain: number;
  proceduralStage: number;
  documents: number;
  otherEvidence: number;
}

export interface AdvocateMatch {
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
  consultationFee?: string;
  breakdown: {
    legalIssueSimilarity: number;
    jurisdiction: number;
    practiceArea: number;
    courtExperience: number;
    proceduralStage: number;
  };
  matchedCases: Array<{
    title: string;
    court: string;
    year: number;
    relevance: string;
    outcome: string;
  }>;
}

export interface LegalDocument {
  id: string;
  title: string;
  name?: string;
  category: string;
  documentType?: string;
  fileSize: string;
  size?: string;
  uploadDate: string;
  fileType: 'pdf' | 'png' | 'jpg' | 'doc' | string;
  type?: string;
  riskScore?: number; // 0 - 100
  riskLevel?: 'Low Risk' | 'Medium Risk' | 'High Risk' | string;
  summary: string;
  analysis?: any;
  extractedClauses?: Array<{
    title: string;
    text: string;
    severity: 'red' | 'yellow' | 'green';
  }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  attachment?: {
    name: string;
    size: string;
    type: string;
  };
  sources?: string[];
  concepts?: string[];
  quickReplies?: string[];
}

export interface LegalCase {
  id: string;
  title: string;
  practiceArea: string;
  jurisdiction: string;
  proceduralStage: string;
  lastUpdated: string;
  status: 'Analysis in Progress' | 'Ready for Counsel' | 'In Court' | 'Closed';
  readinessScore: number;
  readinessBreakdown: ReadinessScoreBreakdown;
  caseUnderstanding: CaseUnderstandingItem[];
  missingInformation: string[];
  legalDomain: string;
  messages: ChatMessage[];
  documents: LegalDocument[];
  recommendations: AdvocateMatch[];
}

export interface AdvocateProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  barNumber: string;
  stateBarCouncil: string;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  practiceAreas: string[];
  courts: string[];
  jurisdictions: string[];
  consultationFee: string;
  activeLeadsCount: number;
  profileViewsCount: number;
  verifiedCasesCount: number;
  verifiedCases: Array<{
    id: string;
    title: string;
    anonymizedTitle: string;
    court: string;
    year: number;
    practiceArea: string;
    facts: string;
    outcome: string;
    disposition: string;
  }>;
}
