export interface AdvocateCaseRecord {
  id: string;
  advocateId: string;
  caseTitle: string;
  anonymizedTitle: string;
  court: string;
  year: number;
  practiceArea: string;
  legalIssues: string[];
  jurisdiction: string;
  proceduralStage: string;
  outcome: string;
  relevantSections: string[];
  caseSummary: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'NEEDS_REVIEW';
}

export const mockAdvocateCaseRecords: AdvocateCaseRecord[] = [
  {
    id: 'rec-901',
    advocateId: 'lawyer-1',
    caseTitle: 'State of Karnataka v. S. Kumar',
    anonymizedTitle: 'Private Land Owner vs State & Neighbors',
    court: 'Karnataka High Court',
    year: 2024,
    practiceArea: 'Criminal Defense',
    legalIssues: ['Boundary altercation', 'Criminal Intimidation', 'CrPC Section 482 Quashing'],
    jurisdiction: 'Karnataka',
    proceduralStage: 'High Court Appeal',
    outcome: 'Quashed Section 506 proceeding under Section 482 CrPC.',
    relevantSections: ['CrPC Section 482', 'IPC Section 504', 'IPC Section 506'],
    caseSummary: 'Defended private landowner against malicious criminal breach proceedings arising out of a land boundary demarcation dispute in Bengaluru.',
    verificationStatus: 'VERIFIED'
  },
  {
    id: 'rec-902',
    advocateId: 'lawyer-1',
    caseTitle: 'Ramesh R. v. Inspector of Police',
    anonymizedTitle: 'Commercial Partner vs Police Investigation',
    court: 'Bengaluru Sessions Court',
    year: 2024,
    practiceArea: 'Bail & Quashing',
    legalIssues: ['Anticipatory Bail', 'Commercial Dispute'],
    jurisdiction: 'Karnataka',
    proceduralStage: 'Pre-Arrest Bail Petition',
    outcome: 'Granted Anticipatory Bail with protective conditions.',
    relevantSections: ['CrPC Section 438', 'IPC Section 420'],
    caseSummary: 'Secured anticipatory bail for commercial firm director facing wrongful criminal charges during breach of contract negotiations.',
    verificationStatus: 'VERIFIED'
  },
  {
    id: 'rec-903',
    advocateId: 'lawyer-1',
    caseTitle: 'Founders Collective v. Promoter Group',
    anonymizedTitle: 'Minority Shareholders vs Promoter',
    court: 'Karnataka High Court',
    year: 2025,
    practiceArea: 'Property & Injunction Litigation',
    legalIssues: ['Order 39 Temporary Injunction', 'Encroachment'],
    jurisdiction: 'Karnataka',
    proceduralStage: 'Interlocutory Injunction',
    outcome: 'Granted mandatory interim restraining order.',
    relevantSections: ['Code of Civil Procedure Order 39', 'Specific Relief Act Section 38'],
    caseSummary: 'Obtained temporary restraining injunction preventing unauthorized construction on contested setback land.',
    verificationStatus: 'PENDING'
  }
];
