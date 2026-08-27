import type { AdvocateMatchResult, CaseFacts } from '../types/index.js';
import { logger } from '../utils/logger.js';

export const mockAdvocateDatabase: AdvocateMatchResult[] = [
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
      'Handled 42 verified Karnataka High Court petitions under CrPC 482 / BNSS 173 & boundary disputes',
      'Extensive criminal defense & quashing experience in Bengaluru Courts',
      'Matched for physical altercation & police complaint procedural stage'
    ],
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
        outcome: 'Quashed Section 506 proceeding under Section 482 CrPC / BNSS.'
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
    title: 'RERA Authority & Property Litigation Specialist',
    matchScore: 81,
    practiceArea: 'Property & Real Estate',
    jurisdiction: 'Bengaluru City Civil Court',
    court: 'Karnataka High Court & RERA Tribunal',
    experienceYears: 11,
    whyMatch: [
      'Specialist in boundary demarcation & civil injunction suits',
      'Active practice in Bengaluru City Civil Courts',
      'Strong track record in land encroachment orders'
    ],
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

export function findMatchingAdvocates(facts: CaseFacts): AdvocateMatchResult[] {
  logger.info('Recommendation engine executed based on accumulated case facts', { facts });

  return mockAdvocateDatabase.map(adv => {
    let score = adv.matchScore;

    if (facts.jurisdiction?.value && String(facts.jurisdiction.value).toLowerCase().includes('karnataka')) {
      score += 3;
    }
    if (facts.policeStatus?.value === true) {
      score += 2;
    }

    return {
      ...adv,
      matchScore: Math.min(98, score)
    };
  });
}
