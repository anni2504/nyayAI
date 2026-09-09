import type { CaseState } from '../types/index.js';

// Comprehensive matter → practice area mapping. Every recognized matter type
// maps to its correct practice area. Unknown matters get a neutral label.
const MATTER_TO_PRACTICE_AREA: Record<string, string> = {
  'Tree Cutting / Environmental Offence': 'Environmental & Forest Law',
  'Environmental / Forest Issue': 'Environmental & Forest Law',
  'Forest & Wildlife Violation': 'Environmental & Forest Law',
  'Theft / Stolen Property': 'Criminal Law',
  'Assault / Physical Harm': 'Criminal Law',
  'Neighbour Dispute / Physical Altercation': 'Criminal Defense & Civil Litigation',
  'Builder Possession Delay': 'RERA & Property Litigation',
  'Tenant Security Deposit Dispute': 'Tenancy & Rent Disputes',
  'Employment / Labour Dispute': 'Employment & Labour Law',
  'Contractor / Service Dispute': 'Civil & Commercial Litigation',
  'Insurance Dispute': 'Insurance & Claims Law',
  'Consumer Dispute': 'Consumer Protection Law',
  'Property / Title Dispute': 'Property & Real Estate Law',
  'Cheque Bounce / NI Act': 'Banking & NI Act Litigation',
  'Family / Matrimonial Dispute': 'Family & Matrimonial Law',
  'Cyber Crime / Digital Fraud': 'Cyber & Digital Law',
  'Defamation / Reputation': 'Civil & Defamation Law',
  'Arbitration / ADR': 'Arbitration & ADR',
  'Tax / GST Dispute': 'Tax & GST Law',
  'FIR / Police Complaint Matter': 'Criminal Law',
  'Criminal Matter': 'Criminal Defense',
};

export function detectPracticeArea(state: CaseState): string {
  const matter = state.facts?.matter?.value;
  if (!matter) return 'Awaiting case details';
  return MATTER_TO_PRACTICE_AREA[matter] || `${matter} (General)`;
}
