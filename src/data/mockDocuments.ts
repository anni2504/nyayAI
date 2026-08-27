import type { LegalDocument } from './types';

export const mockDocumentsList: LegalDocument[] = [
  {
    id: 'doc-101',
    title: 'Police_Complaint_Copy_Neighbour_Incident.pdf',
    category: 'Criminal & Police Records',
    fileSize: '1.8 MB',
    uploadDate: 'Today, 2:15 PM',
    fileType: 'pdf',
    riskScore: 35,
    riskLevel: 'Low Risk',
    summary: 'Formal complaint acknowledgment filed at Indiranagar Police Station, Bengaluru under IPC Sections 341, 504, and 506 regarding verbal abuse, physical obstruction, and boundary dispute.',
    extractedClauses: [
      {
        title: 'Cognizable Offense Indication (IPC Sec 341/506)',
        text: 'Complainant details wrongful restraint on private setback passage and criminal intimidation.',
        severity: 'yellow'
      },
      {
        title: 'Station CSR Receipt Number',
        text: 'CSR No. 184/2026 registered. Pending preliminary inquiry by Sub-Inspector.',
        severity: 'green'
      }
    ]
  },
  {
    id: 'doc-102',
    title: 'Builder_Buyer_Agreement_Flat_402.pdf',
    category: 'Property & Real Estate',
    fileSize: '4.8 MB',
    uploadDate: 'Yesterday at 5:30 PM',
    fileType: 'pdf',
    riskScore: 78,
    riskLevel: 'High Risk',
    summary: 'One-sided promoter agreement for residential flat booking in Whitefield, Bengaluru. Missing fixed possession deadline date and contains asymmetrical delay penalty interest rate.',
    extractedClauses: [
      {
        title: 'Asymmetrical Penalty Rate (Clause 11.2)',
        text: 'Buyer pays 18% p.a. for late installment; Builder pays only Rs 5/sq.ft/month for possession delay.',
        severity: 'red'
      },
      {
        title: 'Unilateral Force Majeure Extension (Clause 18)',
        text: 'Vague force majeure clause giving promoter sole discretion to delay construction without interest payout.',
        severity: 'red'
      }
    ]
  },
  {
    id: 'doc-103',
    title: 'Co-Founders_Shareholders_Agreement_Draft.pdf',
    category: 'Corporate & Startup',
    fileSize: '2.4 MB',
    uploadDate: 'Aug 22, 2026',
    fileType: 'pdf',
    riskScore: 24,
    riskLevel: 'Low Risk',
    summary: 'Comprehensive Shareholders Agreement (SHA) between 3 co-founders. Contains 4-year reverse vesting schedule, 1-year cliff, drag-along rights, and non-compete clause.',
    extractedClauses: [
      {
        title: 'Reverse Vesting Schedule (Clause 4.2)',
        text: 'Equity shares vest over 48 months with a mandatory 12-month cliff period.',
        severity: 'green'
      }
    ]
  }
];
