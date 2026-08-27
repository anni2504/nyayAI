export interface ClientLead {
  id: string;
  clientId: string;
  clientName: string;
  caseType: string;
  matterTitle: string;
  jurisdiction: string;
  matchScore: number;
  readinessScore: number;
  receivedAt: string;
  status: 'pending' | 'accepted' | 'declined';
  summary: string;
  matchReasons: string[];
}

export const mockLeadsList: ClientLead[] = [
  {
    id: 'lead-101',
    clientId: 'client-1',
    clientName: 'Rohan Sharma',
    caseType: 'Criminal Defense & Property Dispute',
    matterTitle: 'Neighbour Boundary Dispute & Physical Obstruction',
    jurisdiction: 'Indiranagar, Bengaluru (Karnataka)',
    matchScore: 87,
    readinessScore: 82,
    receivedAt: '15 mins ago',
    status: 'pending',
    summary: 'Land encroachment onto private setback passage. Police CSR No. 184/2026 registered. Seeking Section 482 High Court Quashing and Order 39 Injunction.',
    matchReasons: [
      'Identical legal issue (boundary altercation + Section 506 CrPC)',
      'Karnataka High Court appellate experience',
      'Relevant pre-trial procedural stage'
    ]
  },
  {
    id: 'lead-102',
    clientId: 'client-2',
    clientName: 'Kavita Menon',
    caseType: 'RERA & Real Estate Litigation',
    matterTitle: '22-Month Apartment Possession Delay',
    jurisdiction: 'Whitefield, Bengaluru (Karnataka)',
    matchScore: 81,
    readinessScore: 90,
    receivedAt: '2 hours ago',
    status: 'pending',
    summary: 'Promoter delayed possession by 22 months without force majeure justification. Agreement contains asymmetrical interest penalty clause.',
    matchReasons: [
      'RERA Form N complaint preparation',
      'Karnataka RERA Tribunal experience'
    ]
  },
  {
    id: 'lead-103',
    clientId: 'client-3',
    clientName: 'Aman Deep',
    caseType: 'Corporate & Founder Disputes',
    matterTitle: 'Series A Founder Reverse Vesting Deadlock',
    jurisdiction: 'Delhi NCR / NCLT',
    matchScore: 76,
    readinessScore: 65,
    receivedAt: '1 day ago',
    status: 'accepted',
    summary: 'Arbitrary board dilution attempt prior to 12-month cliff vesting. SHA clause review requested.',
    matchReasons: [
      'Shareholders Agreement drafting & deadlock resolution',
      'NCLT experience'
    ]
  }
];
