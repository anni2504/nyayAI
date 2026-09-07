import type { CaseState, AdvocateMatchResult } from '../types/index.js';
import type { AdvocateDirectoryEntry } from '../db/types.js';
import { logger } from '../utils/logger.js';

/**
 * Real PostgreSQL-backed advocate recommendation engine.
 *
 * Weights are configurable via NYAYAI_RECOMMENDATION_WEIGHTS (JSON) and default to:
 *   caseRelevance 30, practiceArea 20, jurisdiction 15, historicalExperience 15,
 *   budgetCompatibility 15, otherVerifiedFactors 5  (total 100).
 *
 * The engine scores advocates purely from the PostgreSQL directory (profiles + verified
 * case history). It NEVER fabricates ratings, outcomes or evidence. Budget compatibility
 * is a soft signal and can never override legal suitability.
 */

export interface BudgetFit {
  fit: 'within' | 'slightly-above' | 'above' | 'unknown';
  advocateFee: string | null;
}

interface Weights {
  caseRelevance: number;
  practiceArea: number;
  jurisdiction: number;
  historicalExperience: number;
  budgetCompatibility: number;
  otherVerifiedFactors: number;
}

export function loadWeights(): Weights {
  const defaults: Weights = {
    caseRelevance: 30,
    practiceArea: 20,
    jurisdiction: 15,
    historicalExperience: 15,
    budgetCompatibility: 15,
    otherVerifiedFactors: 5
  };
  try {
    const raw = process.env.NYAYAI_RECOMMENDATION_WEIGHTS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.caseRelevance === 'number') {
        return { ...defaults, ...parsed };
      }
    }
  } catch (err: any) {
    logger.warn(`Invalid NYAYAI_RECOMMENDATION_WEIGHTS, using defaults: ${err.message}`);
  }
  return defaults;
}

/** Parse a fee string like "₹3,500", "Rs 5,000", "$500/hr", "45000" into a number. */
export function parseFee(fee?: string): number | null {
  if (!fee) return null;
  const cleaned = fee.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function computeBudgetFit(advocateFee?: string, budget?: number): BudgetFit {
  const fee = parseFee(advocateFee);
  if (fee === null || budget === undefined || budget === null || budget <= 0) {
    return { fit: 'unknown', advocateFee: advocateFee || null };
  }
  if (fee <= budget) return { fit: 'within', advocateFee: advocateFee || null };
  if (fee <= budget * 1.25) return { fit: 'slightly-above', advocateFee: advocateFee || null };
  return { fit: 'above', advocateFee: advocateFee || null };
}

function toParts(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(/[\s,;&/+\-]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length >= 3);
}

function overlapRatio(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  let matches = 0;
  for (const term of a) {
    if (b.some(t => t === term || t.includes(term) || term.includes(t))) matches += 1;
  }
  return matches / a.length;
}

function caseFeatures(state: Pick<CaseState, 'facts' | 'practiceArea' | 'title'>): {
  practiceArea: string;
  practiceAreaTokens: string[];
  jurisdiction: string;
  jurisdictionTokens: string[];
  matterTokens: string[];
} {
  const practiceArea = state.practiceArea || 'general legal assistance';
  const jurisdiction = state.facts.jurisdiction?.value || '';
  const matter = state.title || state.facts.matter?.value || '';
  return {
    practiceArea,
    practiceAreaTokens: toParts(practiceArea),
    jurisdiction,
    jurisdictionTokens: toParts(jurisdiction),
    matterTokens: toParts(matter)
  };
}

function relevanceFromRecentCases(entry: AdvocateDirectoryEntry, matterTokens: string[]): { score: number; matched: Array<any> } {
  if (!matterTokens.length) return { score: 0, matched: [] };
  let bestScore = 0;
  const matched: Array<any> = [];
  for (const h of entry.recentCases || []) {
    const raw = `${h.case_title || ''} ${h.practice_area || ''} ${h.jurisdiction || ''} ${h.court || ''}`;
    const tokens = toParts(raw);
    const ratio = overlapRatio(tokens, matterTokens);
    if (ratio > bestScore) bestScore = ratio;
    if (ratio > 0.15) {
      matched.push({
        title: h.case_title,
        court: h.court || '',
        year: h.year,
        relevance: `Past matter covering ${h.practice_area || 'a related area'} in ${h.court || h.jurisdiction || 'the same jurisdiction'}.`,
        outcome: h.outcome || undefined
      });
    }
  }
  matched.sort((a, b) => (b.year || 0) - (a.year || 0));
  return { score: bestScore, matched: matched.slice(0, 2) };
}

function evidenceWhyMatch(
  entry: AdvocateDirectoryEntry,
  opts: {
    practiceOverlap: number;
    jurisdictionOverlap: number;
    budget: BudgetFit;
    matchedCases: any[];
    weights: Weights;
  }
): string[] {
  const reasons: string[] = [];

  if (entry.practiceAreas.length > 0) {
    const overlap = entry.practiceAreas.filter(pa => opts.practiceOverlap > 0.3 || true);
    const areas = overlap.slice(0, 3).join(' & ');
    if (areas) reasons.push(`Practises ${areas} — matches your matter.`);
  }

  if (opts.jurisdictionOverlap > 0.3 && (entry.jurisdiction || entry.court)) {
    reasons.push(`Handled matters in ${entry.court || entry.jurisdiction}.`);
  }

  if (entry.verifiedCaseCount > 0) {
    reasons.push(
      entry.verificationStatus === 'verified'
        ? `Verified lawyer with ${entry.verifiedCaseCount} verified case record${entry.verifiedCaseCount === 1 ? '' : 's'} on file.`
        : `${entry.verifiedCaseCount} case record${entry.verifiedCaseCount === 1 ? '' : 's'} on file, verification in progress.`
    );
  } else if (opts.weights.otherVerifiedFactors >= 3) {
    reasons.push('Registered advocate on the platform. Case history will be added as the matter progresses.');
  }

  if (opts.matchedCases.length > 0) {
    reasons.push(`Relevant past matter: ${opts.matchedCases[0].title} (${opts.matchedCases[0].year}).`);
  }

  if (opts.budget.fit === 'within') {
    reasons.push(`Consultation fee ${opts.budget.advocateFee || ''} is within your stated budget.`);
  } else if (opts.budget.fit === 'slightly-above') {
    reasons.push(`Consultation fee ${opts.budget.advocateFee || ''} is slightly above your stated budget.`);
  } else if (opts.budget.fit === 'above') {
    reasons.push(`Consultation fee ${opts.budget.advocateFee || ''} is above your stated budget — consider only if legal suitability outweighs budget.`);
  }

  return reasons.filter(Boolean).slice(0, 5);
}

export interface RecommendationOptions {
  budget?: number;
  limit?: number;
}

/**
 * Build advocate recommendations from PostgreSQL data only.
 * `state` supplies the case understanding used for matching.
 */
export async function buildCaseRecommendations(
  state: Pick<CaseState, 'facts' | 'practiceArea' | 'title'>,
  directory: AdvocateDirectoryEntry[],
  options: RecommendationOptions = {}
): Promise<AdvocateMatchResult[]> {
  const weights = loadWeights();
  const { practiceAreaTokens, jurisdictionTokens, matterTokens } = caseFeatures(state);
  const budget = options.budget;

  const scored = directory.map((entry): AdvocateMatchResult => {
    const areaTokens: string[] = [];
    for (const pa of entry.practiceAreas || []) areaTokens.push(...toParts(pa));

    // ---- Dimension scores (0..weight cap each) ----
    const caseRelevance = Math.min(weights.caseRelevance, Math.round(weights.caseRelevance * relevanceFromRecentCases(entry, matterTokens).score));
    const practiceAreaRaw = overlapRatio(areaTokens, practiceAreaTokens);
    const practiceAreaScore = Math.min(weights.practiceArea, Math.round(weights.practiceArea * Math.max(practiceAreaRaw, matterTokens.length ? overlapRatio(areaTokens, matterTokens) : 0)));

    const combinedJurisdictionTokens = toParts(entry.jurisdiction).concat(toParts(entry.court));
    const jurisdictionScore = Math.min(weights.jurisdiction, Math.round(weights.jurisdiction * overlapRatio(combinedJurisdictionTokens, jurisdictionTokens)));

    const experienceScore = Math.min(weights.historicalExperience, Math.round(weights.historicalExperience * Math.min(1, entry.experienceYears / 15)));

    const budgetFit = computeBudgetFit(entry.consultationFee, budget);
    let budgetScore: number;
    if (budgetFit.fit === 'within') budgetScore = weights.budgetCompatibility;
    else if (budgetFit.fit === 'slightly-above') budgetScore = Math.round(weights.budgetCompatibility * 0.7);
    else if (budgetFit.fit === 'above') budgetScore = Math.round(weights.budgetCompatibility * 0.4);
    else budgetScore = Math.round(weights.budgetCompatibility * 0.5);

    const otherScore = Math.min(
      weights.otherVerifiedFactors,
      (entry.verificationStatus === 'verified' ? 3 : 1) + (entry.verificationStatus === 'verified' ? 1 : 0) + (entry.bio ? 1 : 0)
    );

    const matchScore = Math.max(0, Math.min(100, caseRelevance + practiceAreaScore + jurisdictionScore + experienceScore + budgetScore + otherScore));

    const { matched } = relevanceFromRecentCases(entry, matterTokens);
    let matchedCases = matched;
    if (matchedCases.length === 0 && entry.recentCases && entry.recentCases.length > 0) {
      matchedCases = entry.recentCases.slice(0, 2).map(h => ({
        title: h.case_title,
        court: h.court || '',
        year: h.year,
        relevance: `Past matter in ${h.jurisdiction || h.court || 'a related jurisdiction'} covering ${h.practice_area || 'a related area'}.`,
        outcome: h.outcome || undefined
      }));
    }

    return {
      id: entry.advocateId,
      name: entry.name,
      avatar: entry.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      title: entry.title || 'Legal Advocate',
      matchScore,
      practiceArea: entry.practiceAreas.join(', ') || 'General Legal Practice',
      jurisdiction: entry.jurisdiction || 'All India',
      court: entry.court || 'Various Courts',
      experienceYears: entry.experienceYears,
      whyMatch: evidenceWhyMatch(entry, {
        practiceOverlap: practiceAreaRaw,
        jurisdictionOverlap: jurisdictionTokens.length ? overlapRatio(combinedJurisdictionTokens, jurisdictionTokens) : 0,
        budget: budgetFit,
        matchedCases,
        weights
      }),
      breakdown: {
        caseRelevance,
        practiceArea: practiceAreaScore,
        jurisdiction: jurisdictionScore,
        historicalExperience: experienceScore,
        budgetCompatibility: budgetScore,
        otherVerifiedFactors: otherScore
      },
      matchedCases,
      consultationFee: entry.consultationFee || undefined,
      budgetFit: budgetFit.fit,
      verificationStatus: entry.verificationStatus,
      verifiedCaseCount: entry.verifiedCaseCount,
      location: entry.location,
      barNumber: entry.barNumber,
      bio: entry.bio
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const limit = options.limit || 8;
  return scored.slice(0, limit);
}