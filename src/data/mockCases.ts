import type { LegalCase } from './types';
import { mockMatchesForCase } from './mockAdvocates';
import { mockDocumentsList } from './mockDocuments';

export const mockCases: LegalCase[] = [
  {
    id: 'case-1',
    title: 'Neighbour Dispute',
    practiceArea: 'Property & Criminal Law',
    jurisdiction: 'Karnataka (Bengaluru)',
    proceduralStage: 'Police Complaint Filed',
    lastUpdated: 'Today, 2:45 PM',
    status: 'Analysis in Progress',
    readinessScore: 82,
    readinessBreakdown: {
      matterClarity: 20,
      facts: 20,
      jurisdiction: 15,
      legalDomain: 15,
      proceduralStage: 7,
      documents: 5,
      otherEvidence: 0
    },
    caseUnderstanding: [
      { key: 'matter', label: 'Matter', value: 'Neighbour dispute over boundary wall & setback passage', status: 'verified' },
      { key: 'physicalViolence', label: 'Physical Threat', value: 'Verbal aggression & physical obstruction', status: 'verified' },
      { key: 'jurisdiction', label: 'Jurisdiction', value: 'Karnataka (Indiranagar, Bengaluru)', status: 'verified' },
      { key: 'policeComplaint', label: 'Police Complaint', value: 'CSR Receipt No. 184/2026 registered', status: 'verified' },
      { key: 'proceduralStage', label: 'Procedural Stage', value: 'Pending station preliminary inquiry', status: 'pending' }
    ],
    missingInformation: [
      'Property title deeds & boundary survey map',
      'CCTV recording of boundary altercation'
    ],
    legalDomain: 'Property & Criminal Intimidation',
    documents: [mockDocumentsList[0]],
    recommendations: mockMatchesForCase,
    messages: [
      {
        id: 'm-1',
        sender: 'ai',
        text: 'Welcome to NYAYAI Legal Copilot. I can help analyze your legal situation, assess case readiness, review documents, and connect you with verified Advocates in your jurisdiction.\n\nCould you describe the nature of your dispute and where it took place?',
        timestamp: '2:15 PM'
      },
      {
        id: 'm-2',
        sender: 'user',
        text: 'My neighbor built an illegal fence encroaching 2 feet into my property setback in Indiranagar, Bengaluru. When I objected, he threatened me physically and blocked my parking driveway.',
        timestamp: '2:18 PM'
      },
      {
        id: 'm-3',
        sender: 'ai',
        text: 'I understand. Since physical aggression occurred alongside land encroachment in Indiranagar, Bengaluru, this touches both civil property law and criminal intimidation under IPC.\n\nHave you already reported this incident to the local Indiranagar police station?',
        timestamp: '2:19 PM',
        sources: [
          'Indian Penal Code 1860, Section 504 & 506 (Criminal Intimidation)',
          'Karnataka Police Act Section 92 (Public Obstruction)',
          'Specific Relief Act 1963 Section 38 (Perpetual Injunction)'
        ],
        concepts: ['Boundary Encroachment', 'Criminal Intimidation', 'Temporary Injunction'],
        quickReplies: ['Yes, FIR / CSR filed', 'No, not reported yet', 'Seeking Injunction Order']
      },
      {
        id: 'm-4',
        sender: 'user',
        text: 'Yes, FIR / CSR filed at Indiranagar station yesterday. I have uploaded the acknowledgment copy.',
        timestamp: '2:22 PM',
        attachment: {
          name: 'Police_Complaint_Copy_Neighbour_Incident.pdf',
          size: '1.8 MB',
          type: 'pdf'
        }
      },
      {
        id: 'm-5',
        sender: 'ai',
        text: 'I have reviewed your police CSR acknowledgment. Your case readiness score is now updated to 82%.\n\nBased on your facts, you have strong grounds for:\n1. A Civil Restraining Injunction under Order 39 Rules 1 & 2 before Bengaluru City Civil Court.\n2. Seeking a Direction to Police for protection under Section 154/156 CrPC.\n\nI have matched two senior Advocates specializing in Karnataka property boundary disputes and criminal defense below.',
        timestamp: '2:25 PM',
        sources: ['Code of Civil Procedure Order 39 Rule 1', 'Karnataka High Court Precedent: Ramesh v. State (2024)'],
        concepts: ['Order 39 Stay Order', 'Police Protection Petition'],
        quickReplies: ['View Matched Advocates', 'Draft Injunction Application', 'How is 82% calculated?']
      }
    ]
  },
  {
    id: 'case-2',
    title: 'Builder Delayed Possession',
    practiceArea: 'Property & RERA',
    jurisdiction: 'Karnataka (Bengaluru)',
    proceduralStage: 'Pre-Litigation Legal Notice',
    lastUpdated: 'Yesterday, 5:30 PM',
    status: 'Ready for Counsel',
    readinessScore: 90,
    readinessBreakdown: {
      matterClarity: 20,
      facts: 20,
      jurisdiction: 15,
      legalDomain: 15,
      proceduralStage: 10,
      documents: 10,
      otherEvidence: 0
    },
    caseUnderstanding: [
      { key: 'matter', label: 'Matter', value: 'RERA 22-month residential apartment possession delay', status: 'verified' },
      { key: 'jurisdiction', label: 'Jurisdiction', value: 'Karnataka RERA Tribunal, Bengaluru', status: 'verified' },
      { key: 'proceduralStage', label: 'Procedural Stage', value: 'Drafting RERA Form N Complaint', status: 'verified' }
    ],
    missingInformation: [],
    legalDomain: 'Real Estate Regulation (RERA Act 2016)',
    documents: [mockDocumentsList[1]],
    recommendations: [mockMatchesForCase[1]],
    messages: [
      {
        id: 'm-201',
        sender: 'user',
        text: 'The developer delayed my flat possession in Whitefield by over 22 months.',
        timestamp: 'Yesterday'
      },
      {
        id: 'm-202',
        sender: 'ai',
        text: 'Under RERA Section 18, you are entitled to full refund with interest (SBI MCLR + 2%) or monthly delay compensation. I have analyzed your agreement and highlighted the unilateral clause.',
        timestamp: 'Yesterday'
      }
    ]
  },
  {
    id: 'case-3',
    title: 'Employment ESOP Vesting',
    practiceArea: 'Employment & Corporate',
    jurisdiction: 'Delhi NCR',
    proceduralStage: 'Internal Dispute Resolution',
    lastUpdated: 'Aug 22, 2026',
    status: 'Analysis in Progress',
    readinessScore: 65,
    readinessBreakdown: {
      matterClarity: 15,
      facts: 15,
      jurisdiction: 15,
      legalDomain: 10,
      proceduralStage: 5,
      documents: 5,
      otherEvidence: 0
    },
    caseUnderstanding: [
      { key: 'matter', label: 'Matter', value: 'Wrongful termination prior to ESOP cliff vesting', status: 'verified' }
    ],
    missingInformation: ['Employment offer letter', 'ESOP Grant Letter'],
    legalDomain: 'Labour & Service Law',
    documents: [],
    recommendations: [],
    messages: [
      {
        id: 'm-301',
        sender: 'user',
        text: 'My company terminated my contract 10 days before my 1-year ESOP cliff vesting period.',
        timestamp: 'Aug 22'
      }
    ]
  }
];
