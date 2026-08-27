import type { AdvocateMatch, AdvocateProfile } from './types';

export const mockAdvocatesList: AdvocateProfile[] = [
  {
    id: 'lawyer-1',
    name: 'Adv. Rajesh Varma',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    title: 'Senior Criminal Defense & High Court Appellate Advocate',
    barNumber: 'KAR/2012/4819',
    stateBarCouncil: 'Karnataka State Bar Council',
    rating: 4.9,
    reviewsCount: 142,
    experienceYears: 14,
    practiceAreas: ['Criminal Defense', 'Bail & Quashing', 'Property Litigation'],
    courts: ['Karnataka High Court', 'Supreme Court of India', 'Bengaluru Sessions Court'],
    jurisdictions: ['Karnataka', 'Maharashtra'],
    consultationFee: '₹3,500 / 30 mins',
    activeLeadsCount: 12,
    profileViewsCount: 84,
    verifiedCasesCount: 42,
    verifiedCases: [
      {
        id: 'c-101',
        title: 'High Court Quashing under CrPC Section 482',
        anonymizedTitle: 'Commercial Firm vs State of Karnataka',
        court: 'Karnataka High Court',
        year: 2024,
        practiceArea: 'Criminal Defense',
        facts: 'Defended client against erroneous criminal breach of trust proceedings arising out of a private civil land boundaries dispute.',
        outcome: 'High Court allowed 482 petition and quashed all criminal proceedings against the client.',
        disposition: 'Quashed with Costs'
      },
      {
        id: 'c-102',
        title: 'Anticipatory Bail in Commercial Dispute',
        anonymizedTitle: 'Managing Partner vs Investigation Wing',
        court: 'Karnataka High Court',
        year: 2025,
        practiceArea: 'Bail & Quashing',
        facts: 'Secured unconditional anticipatory bail for startup co-founder in alleged breach of trust complaint.',
        outcome: 'Unconditional Bail Granted.',
        disposition: 'Bail Granted'
      }
    ]
  },
  {
    id: 'lawyer-2',
    name: 'Adv. Vikramaditya Singhania',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    title: 'RERA Authority & Property Litigation Specialist',
    barNumber: 'KAR/2015/1029',
    stateBarCouncil: 'Karnataka State Bar Council',
    rating: 4.8,
    reviewsCount: 98,
    experienceYears: 11,
    practiceAreas: ['Property & Real Estate', 'RERA Consumer Complaints', 'Title Disputes'],
    courts: ['Karnataka RERA Tribunal', 'Bengaluru City Civil Court', 'Karnataka High Court'],
    jurisdictions: ['Karnataka', 'Tamil Nadu'],
    consultationFee: '₹4,000 / 30 mins',
    activeLeadsCount: 8,
    profileViewsCount: 120,
    verifiedCasesCount: 36,
    verifiedCases: [
      {
        id: 'c-201',
        title: 'RERA Delayed Possession & Full Interest Refund',
        anonymizedTitle: 'Flat Buyers Association vs Prestige Developers',
        court: 'Karnataka RERA Tribunal',
        year: 2024,
        practiceArea: 'Property & Real Estate',
        facts: 'Promoter delayed residential apartment possession by 22 months. Filed RERA Form N seeking full refund with interest under Section 18.',
        outcome: 'Full principal refund awarded along with SBI MCLR + 2% interest (10.25% p.a.).',
        disposition: 'Allowed with Interest & Costs'
      }
    ]
  },
  {
    id: 'lawyer-3',
    name: 'Adv. Ananya Roy',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    title: 'Senior Corporate, M&A & Founders Counsel',
    barNumber: 'DEL/2010/7741',
    stateBarCouncil: 'Bar Council of Delhi',
    rating: 5.0,
    reviewsCount: 186,
    experienceYears: 16,
    practiceAreas: ['Corporate & Startup', 'Shareholder Disputes', 'Commercial Contracts'],
    courts: ['NCLT Delhi', 'Delhi High Court', 'NCLAT'],
    jurisdictions: ['Delhi NCR', 'Karnataka', 'Maharashtra'],
    consultationFee: '₹5,000 / 30 mins',
    activeLeadsCount: 15,
    profileViewsCount: 210,
    verifiedCasesCount: 58,
    verifiedCases: [
      {
        id: 'c-301',
        title: 'Series A Term Sheet & Founder Vesting Deadlock',
        anonymizedTitle: 'Tech Founders vs VC Lead Investor',
        court: 'Out of Court Settlement / NCLT',
        year: 2025,
        practiceArea: 'Corporate & Startup',
        facts: 'Protected co-founders against arbitrary board dilution and forced equity forfeiture under SHA reverse vesting clauses.',
        outcome: 'SHA revised with 100% equity retention and 12-month cliff.',
        disposition: 'Settled & Executed'
      }
    ]
  },
  {
    id: 'lawyer-4',
    name: 'Adv. Priya Nambiar',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80',
    title: 'Cyber Law & Data Privacy Compliance Counsel',
    barNumber: 'MAH/2016/5521',
    stateBarCouncil: 'Bar Council of Maharashtra & Goa',
    rating: 4.9,
    reviewsCount: 76,
    experienceYears: 9,
    practiceAreas: ['Cyber & Tech Law', 'DPDP Act', 'IPR Litigation'],
    courts: ['Cyber Appellate Tribunal', 'Bombay High Court'],
    jurisdictions: ['Maharashtra', 'Delhi'],
    consultationFee: '₹3,000 / 30 mins',
    activeLeadsCount: 6,
    profileViewsCount: 65,
    verifiedCasesCount: 22,
    verifiedCases: []
  }
];

export const mockMatchesForCase: AdvocateMatch[] = [
  {
    id: 'lawyer-1',
    name: 'Adv. Rajesh Varma',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    title: 'Senior Criminal Defense & High Court Appellate Advocate',
    matchScore: 87,
    practiceArea: 'Criminal Defense & Property Dispute',
    jurisdiction: 'Karnataka High Court',
    court: 'Karnataka High Court',
    experienceYears: 14,
    whyMatch: [
      'Similar criminal & boundary dispute matters handled',
      'Extensive Karnataka High Court appellate experience',
      'Relevant procedural stage (Police complaint / Section 482)',
      '42 verified case outcomes published on NYAYAI'
    ],
    consultationFee: '₹3,500 / 30 mins',
    breakdown: {
      legalIssueSimilarity: 31,
      jurisdiction: 20,
      practiceArea: 18,
      courtExperience: 10,
      proceduralStage: 8
    },
    matchedCases: [
      {
        title: 'State of Karnataka v. S. Kumar (Property Boundary Dispute & Assault)',
        court: 'Karnataka High Court',
        year: 2024,
        relevance: 'Identical legal issue regarding private land boundary dispute leading to criminal intimidation complaint.',
        outcome: 'Quashed Section 506 proceeding under Section 482 CrPC.'
      },
      {
        title: 'Ramesh R. v. Inspector of Police (Anticipatory Bail in Assault Charge)',
        court: 'Bengaluru Sessions Court',
        year: 2024,
        relevance: 'Same geographical jurisdiction & pre-arrest procedural stage.',
        outcome: 'Granted Anticipatory Bail with protective conditions.'
      }
    ]
  },
  {
    id: 'lawyer-2',
    name: 'Adv. Vikramaditya Singhania',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    title: 'Property Litigation & Civil Injunction Authority',
    matchScore: 81,
    practiceArea: 'Property & Land Disputes',
    jurisdiction: 'Bengaluru City Civil Court',
    court: 'Karnataka High Court',
    experienceYears: 11,
    whyMatch: [
      'Specialist in boundary demarcation & civil injunction suits',
      'Active practice in Bengaluru City Civil Courts',
      'Strong track record in land encroachment orders'
    ],
    consultationFee: '₹4,000 / 30 mins',
    breakdown: {
      legalIssueSimilarity: 28,
      jurisdiction: 20,
      practiceArea: 17,
      courtExperience: 9,
      proceduralStage: 7
    },
    matchedCases: [
      {
        title: 'Mehta v. Municipal Corp & Neighbors (Injunction Against Encroachment)',
        court: 'Bengaluru City Civil Court',
        year: 2023,
        relevance: 'Boundary wall encroachment and temporary restraining injunction.',
        outcome: 'Permanent mandatory injunction decreed.'
      }
    ]
  }
];
