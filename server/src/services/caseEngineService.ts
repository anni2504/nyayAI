import type {
  CaseState,
  CaseFacts,
  FactValue,
  DiscoveryStatus,
  ReadinessStage,
  MessageIntent
} from '../types/index.js';
import { callGroqAPI, GroqChatMessage, sanitizeLLMResponse } from './groqService.js';
import { extractFacts, mergeExtractedFacts, factsFromExtraction } from './factExtractorService.js';
import { buildCaseRecommendations } from './advocateRecommendationService.js';
import { detectPracticeArea } from '../utils/practiceAreaUtils.js';
import { db } from '../db/database.js';
import { logger } from '../utils/logger.js';

// In-memory server-side session store keyed by caseId
const caseStore = new Map<string, CaseState>();

export const MAX_INCREASE_PER_TURN = 8;
export const MAX_DOCUMENT_INCREASE = 12;

function createFact<T>(val: T, source: 'client_chat' | 'document' | 'corroborated' = 'client_chat', completeness: 0 | 0.25 | 0.5 | 0.75 | 1.0 = 0): FactValue<T> {
  return {
    value: val,
    source,
    confidence: val !== null && val !== undefined && (Array.isArray(val) ? val.length > 0 : true) ? 0.9 : 0,
    completeness,
    sourcesList: val !== null ? [source] : []
  };
}

export function isFactKnown(field: keyof CaseFacts, state: CaseState): boolean {
  const fact = (state.facts as any)[field] as FactValue<any>;
  if (!fact) return false;
  if (fact.value === null || fact.value === undefined) return false;
  if (Array.isArray(fact.value) && fact.value.length === 0) return false;
  if (typeof fact.value === 'number' && fact.value === 0) return false;
  return fact.value !== null;
}

function computeMissingLabels(facts: CaseFacts): string[] {
  const labels: string[] = [];
  if (!facts.matter.value) labels.push('Describe your legal concern');
  if (!facts.incidentDescription.value) labels.push('Incident Description');
  if (!facts.jurisdiction.value) labels.push('Jurisdiction');
  if (!facts.parties.value?.length) labels.push('Parties Involved');
  if (!facts.opposingParty.value) labels.push('Opposing Party');
  if (!facts.relationship.value) labels.push('Relationship');
  if (!facts.timeline.value && !facts.incidentDate.value) labels.push('Timeline & Dates');
  if (!facts.incidentDate.value) labels.push('Incident Date');
  if (!facts.keyFacts.value?.length) labels.push('Key Circumstances');
  if (!facts.financialImpact.value) labels.push('Financial Impact');
  if (facts.policeStatus.value === null || facts.policeStatus.value === undefined) labels.push('Police Status');
  if (!facts.proceedingsStatus.value) labels.push('Proceedings Status');
  if (!facts.proceduralStage.value) labels.push('Procedural Stage');
  if (!facts.noticesOrders.value) labels.push('Notices/Orders');
  if (!facts.evidence.value?.length) labels.push('Evidence');
  if (!facts.courtInvolvement.value) labels.push('Court Involvement');
  if (!facts.urgency.value) labels.push('Urgency');
  if (!facts.clientObjective.value) labels.push('Client Objective');
  if (!facts.newCriminalLaws.value) labels.push('Awareness of New Laws');
  return labels;
}

export function classifyMessageIntent(text: string, caseState: CaseState): MessageIntent {
  const clean = text.trim().toLowerCase();
  const stripped = clean.replace(/[^a-z0-9 ]/g, '');

  // 1. META QUESTIONS (Check FIRST!)
  if (
    clean.includes('do you understand') ||
    clean.includes('do u understand') ||
    clean.includes('can you understand') ||
    clean.includes('can u understand') ||
    clean.includes('are you an ai') ||
    clean.includes('are u an ai') ||
    clean.includes('how do you work') ||
    clean.includes('how do u work') ||
    clean.includes('what can you do') ||
    clean.includes('what can u do') ||
    clean.includes('what are you capable of') ||
    clean.includes('what are u capable of') ||
    clean.includes('can you help me') ||
    clean.includes('can u help me') ||
    clean.includes('are you listening') ||
    clean.includes('are u listening') ||
    clean.includes('will you understand') ||
    clean.includes('will u understand') ||
    clean.includes('understand whatever') ||
    clean.includes('understand normal language') ||
    clean.includes('understand natural language')
  ) {
    return 'META_QUESTION';
  }

  // 2. QUESTIONS ABOUT PAST STATEMENTS (e.g. "did I tell you that I filed a CSR?")
  if (
    clean.startsWith('did i tell') ||
    clean.startsWith('did i say') ||
    clean.startsWith('have i mentioned') ||
    (clean.includes('did i') && clean.endsWith('?'))
  ) {
    return 'CASUAL_CONVERSATION';
  }

  // 3. READINESS MANIPULATION ATTEMPT
  if (
    clean.includes('increase the score') ||
    clean.includes('increase my score') ||
    clean.includes('make my score') ||
    clean.includes('make it 100') ||
    clean.includes('make it 90') ||
    clean.includes('make it 80') ||
    clean.includes('set score') ||
    clean.includes('can you increase readiness') ||
    clean.includes('boost readiness') ||
    clean.includes('set readiness to')
  ) {
    return 'READINESS_MANIPULATION_ATTEMPT';
  }

  // 4. READINESS QUERY
  if (
    clean.includes('what is my score') ||
    clean.includes('what is my readiness') ||
    clean.includes('why is my score') ||
    clean.includes('why is it only') ||
    clean.includes('how do i improve readiness') ||
    clean.includes('what is missing') ||
    clean.includes('score details')
  ) {
    return 'READINESS_QUERY';
  }

  // 5. GREETING (Only pure greetings without legal intake context)
  const greetingPhrases = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'start', 'help', 'hi nyayai', 'hello nyayai'];
  const hasLegalKeywords = clean.includes('fight') || clean.includes('assault') || clean.includes('neighbour') || clean.includes('builder') || clean.includes('flat') || clean.includes('possession') || clean.includes('landlord') || clean.includes('deposit') || clean.includes('fired');
  
  if (!hasLegalKeywords && (greetingPhrases.includes(stripped) || stripped.length <= 2)) {
    return 'GREETING';
  }

  // 6. CASUAL CONVERSATION / OUT OF SCOPE
  if (
    clean.includes('what is the time') ||
    clean.includes('what time is it') ||
    clean.includes('what day is it') ||
    clean.includes('who created you') ||
    clean.includes('who are you') ||
    clean.includes('how are you') ||
    stripped === 'thanks' ||
    stripped === 'thank you' ||
    stripped === 'okay' ||
    stripped === 'ok' ||
    stripped === 'cool' ||
    stripped === 'nice'
  ) {
    return 'CASUAL_CONVERSATION';
  }

  // 7. LEGAL QUESTION
  if (
    clean.includes('what are my rights') ||
    clean.includes('what happens next') ||
    clean.includes('can i file a case') ||
    clean.includes('how long does a case take')
  ) {
    return 'LEGAL_QUESTION';
  }

  // 8. CASE INTAKE / CASE FACT UPDATE
  return caseState.facts.matter.value ? 'CASE_FACT_UPDATE' : 'CASE_INTAKE';
}

export function getOrCreateCaseState(caseId: string, initialMessage?: string): CaseState {
  if (caseStore.has(caseId)) {
    return caseStore.get(caseId)!;
  }

  const newCase = createInitialCaseState(caseId, initialMessage);

  caseStore.set(caseId, newCase);
  logger.info(`Created new server case state for caseId=${caseId} (0% baseline score)`);
  return newCase;
}

export function createInitialCaseState(caseId: string, initialMessage?: string): CaseState {
  const initialFacts: CaseFacts = {
    matter: createFact(null),
    incidentDescription: createFact(null),
    country: createFact(null),
    state: createFact(null),
    city: createFact(null),
    jurisdiction: createFact(null),
    incidentDate: createFact(null),
    parties: createFact([]),
    opposingParty: createFact(null),
    relationship: createFact(null),
    timeline: createFact(null),
    keyFacts: createFact([]),
    financialImpact: createFact(null),
    policeStatus: createFact(null),
    proceedingsStatus: createFact(null),
    proceduralStage: createFact(null),
    noticesOrders: createFact(null),
    documents: createFact(0),
    evidence: createFact([]),
    courtInvolvement: createFact(null),
    urgency: createFact(null),
    clientObjective: createFact(null),
    newCriminalLaws: createFact(null),
    agreementDetails: createFact(null),
    possessionDueDate: createFact(null),
    medicalInjuryEvidence: createFact(null)
  };

  return {
    caseId,
    title: initialMessage ? initialMessage.slice(0, 35) + '...' : 'New Legal Consultation',
    facts: initialFacts,
    readinessScore: 0, // MUST START AT 0%
    readinessStage: 'INITIAL INTAKE',
    scoreHistory: [
      {
        timestamp: new Date().toISOString(),
        previousScore: 0,
        newScore: 0,
        changedParameters: [],
        reason: 'Case initialization (0% baseline)'
      }
    ],
    discoveryStatus: 'NEEDS_INFORMATION',
    missingInformation: ['Describe your legal concern'],
    allMissingInformation: ['Describe your legal concern'],
    establishedFacts: [],
    caseUnderstanding: [
      { key: 'matter', label: 'Matter', value: 'Not established', status: 'missing' },
      { key: 'jurisdiction', label: 'Jurisdiction', value: 'Not specified', status: 'missing' },
      { key: 'practiceArea', label: 'Practice Area', value: 'Not established', status: 'missing' },
      { key: 'proceduralStage', label: 'Procedural Stage', value: 'Not established', status: 'missing' }
    ],
    legalAuthorities: [],
    quickResponses: [
      'I had a fight with my neighbour',
      'My builder delayed flat handover for 2 years',
      'Consumer contract breach issue',
      'Police FIR / CSR query'
    ],
    documents: [],
    recommendationData: [],
    messages: []
  };
}

/**
 * Backward-compatible wrapper: persists without any LLM. Merges only the
 * clearly-stated facts via the deterministic merge layer. The live intake path
 * uses LLM extraction (extractFacts) + mergeExtractedFacts instead.
 */
export function mergeFactsDeterministically(existing: CaseFacts, newText: string, lastAssistantMsg?: string, isDoc = false): CaseFacts {
  const clean = newText.trim().toLowerCase();
  const isQuestionAboutState = clean.startsWith('did i tell you') || clean.startsWith('did i say') || clean.startsWith('have i mentioned') || (clean.includes('did i') && clean.endsWith('?'));
  if (isQuestionAboutState) return { ...existing };

  const extracted = deterministicExtractForMerge(existing, clean, lastAssistantMsg, isDoc);
  return mergeExtractedFacts(existing, extracted);
}

/**
 * Minimal deterministic extractor used by the backward-compatible wrapper.
 * The primary extractor (LLM, with deterministic fallback) lives in
 * factExtractorService; this one only supports the cases exercise scripts
 * depending on mergeFactsDeterministically offline.
 */
function deterministicExtractForMerge(
  existing: CaseFacts,
  clean: string,
  lastAssistantMsg?: string,
  isDoc = false
): any {
  const out: any = { confidence: 0.6, isQuestion: false, correction: {} };

  const setIfEmpty = (field: string, value: any) => {
    const cur = (existing as any)[field] as FactValue<any> | undefined;
    if (cur && cur.value !== null && cur.value !== undefined) return;
    (out as any)[field] = value;
  };

  const setCorrection = (field: string, value: any) => {
    out.correction[field] = value;
  };

  // Detect explicit corrections: "Actually X", "No, X", "Correction: X", "It was X"
  const isCorrection = /^actually\b|^no,?\s|^correction:?\s|^it was\s/i.test(clean);
  const correctionTarget = clean.replace(/^(actually|no|correction)\b,?\s*/i, '').trim();

  const last = lastAssistantMsg ? lastAssistantMsg.toLowerCase() : '';
  if ((clean === 'yes' || clean === 'ya' || clean === 'yup' || clean === 'yeah') && lastAssistantMsg) {
    if (/police|csr|fir|complaint|reported/i.test(last)) setIfEmpty('policeStatus', true);
    if (/injur|assault|hit|medical|hurt/i.test(last)) setIfEmpty('medicalInjuryEvidence', 'Physical violence / injuries occurred');
    if (/agreement|contract|possession/i.test(last)) setIfEmpty('agreementDetails', 'Sale / Possession Agreement documented');
  } else if (clean === 'no' || clean === 'not yet') {
    if (/police|csr|fir|complaint|reported/i.test(last)) setIfEmpty('policeStatus', 'NONE');
  }

  // Handle corrections - override existing values
  if (isCorrection && correctionTarget) {
    if (/pune|maharashtra/.test(correctionTarget)) {
      setCorrection('state', 'Maharashtra');
      setCorrection('city', 'Pune');
      setCorrection('jurisdiction', 'Maharashtra (Pune)');
    } else if (/bengaluru|bangalore|karnataka/.test(correctionTarget)) {
      setCorrection('state', 'Karnataka');
      setCorrection('city', 'Bengaluru');
      setCorrection('jurisdiction', 'Karnataka (Bengaluru)');
    } else if (/delhi|ncr/.test(correctionTarget)) {
      setCorrection('state', 'Delhi');
      setCorrection('city', 'Delhi');
      setCorrection('jurisdiction', 'Delhi NCR');
    } else if (/mumbai/.test(correctionTarget)) {
      setCorrection('state', 'Maharashtra');
      setCorrection('city', 'Mumbai');
      setCorrection('jurisdiction', 'Maharashtra (Mumbai)');
    }
  } else {
    // Normal (non-correction) location extraction
    if (/pune|maharashtra/.test(clean)) {
      out.state = 'Maharashtra';
      out.city = 'Pune';
      out.jurisdiction = existing.jurisdiction?.value || 'Maharashtra (Pune)';
    } else if (/bengaluru|bangalore|karnataka/.test(clean)) {
      out.state = 'Karnataka';
      out.city = 'Bengaluru';
      out.jurisdiction = existing.jurisdiction?.value || 'Karnataka (Bengaluru)';
    } else if (/delhi|ncr/.test(clean)) {
      out.state = 'Delhi';
      out.city = 'Delhi';
      out.jurisdiction = existing.jurisdiction?.value || 'Delhi NCR';
    } else if (/mumbai/.test(clean)) {
      out.state = 'Maharashtra';
      out.city = 'Mumbai';
      out.jurisdiction = existing.jurisdiction?.value || 'Maharashtra (Mumbai)';
    }
  }

  if (/fight|assault|neighbo?ur|boundary|altercation|hit me|punched|slapped|physical|road|walking/.test(clean)) {
    setIfEmpty('matter', 'Neighbour Dispute / Physical Altercation');
    if (/hit me|punched|slapped|struck|physical|assault/.test(clean)) {
      setIfEmpty('medicalInjuryEvidence', 'Physical violence / injuries occurred');
    }
  } else if (/builder|flat|possession|rera|deliver|handover/.test(clean)) {
    setIfEmpty('matter', 'Builder Possession Delay');
  } else if (/landlord|deposit|rent|tenant/.test(clean)) {
    setIfEmpty('matter', 'Tenant Security Deposit Dispute');
  }

  if (/reported it to police|reported to police|csr filed|filed (a )?csr|filed (an )?fir|filed fir|police complaint (is )?done/i.test(clean)) {
    setIfEmpty('policeStatus', true);
  } else if (/no police|havent? reported|no fir|not reported/i.test(clean)) {
    setIfEmpty('policeStatus', 'NONE');
  }

  if (/yesterday|last week|last (sunday|monday|tuesday|wednesday|thursday|friday|saturday)|today|2 years|months ago|days ago|2024|2025|2026/.test(clean)) {
    setIfEmpty('incidentDate', clean.match(/\d{4}|yesterday|last \w+|today|2 years|[\w ]+ ago/)?.[0] || 'Timeline & dates recorded');
  }

  if (/cctv|medical|witness|photo|video|document|certificate/.test(clean)) {
    const list: string[] = [];
    if (/cctv|video/.test(clean)) list.push('CCTV footage');
    if (/medical|certificate/.test(clean)) list.push('Medical certificate');
    if (/witness/.test(clean)) list.push('Witness');
    if (/photo/.test(clean)) list.push('Photographs');
    if (list.length) out.evidence = list;
  }

  if (/refund|interest/.test(clean)) out.clientObjective = 'Full refund + delay interest';
  else if (/legal action|sue|file a case|compensation|court/.test(clean)) out.clientObjective = 'Legal protection & remedy';

  return out;
}

export function calculateRawUncappedScore(facts: CaseFacts, docCount: number): {
  rawScore: number;
  stage: ReadinessStage;
  missing: string[];
  allMissing: string[];
  established: Array<{ label: string; value: string; source: string }>;
  status: DiscoveryStatus;
  authorities: string[];
  quickReplies: string[];
} {
  if (!facts.matter.value) {
    return {
      rawScore: 0,
      stage: 'INITIAL INTAKE',
      missing: ['Describe your legal concern'],
      allMissing: ['Describe your legal concern'],
      established: [],
      status: 'NEEDS_INFORMATION',
      authorities: [],
      quickReplies: [
        'I had a fight with my neighbour',
        'My builder delayed flat handover for 2 years',
        'Consumer contract breach issue',
        'Police FIR / CSR query'
      ]
    };
  }

  const weights = [
    { key: 'matter', weight: 8, label: 'Matter Clarity' },
    { key: 'incidentDescription', weight: 8, label: 'Incident Description' },
    { key: 'jurisdiction', weight: 8, label: 'Jurisdiction' },
    { key: 'parties', weight: 4, label: 'Parties Involved' },
    { key: 'opposingParty', weight: 2, label: 'Opposing Party' },
    { key: 'relationship', weight: 3, label: 'Relationship' },
    { key: 'timeline', weight: 5, label: 'Timeline & Dates' },
    { key: 'incidentDate', weight: 4, label: 'Incident Date' },
    { key: 'possessionDueDate', weight: 5, label: 'Possession Due Date' },
    { key: 'keyFacts', weight: 8, label: 'Key Circumstances' },
    { key: 'financialImpact', weight: 4, label: 'Financial Impact' },
    { key: 'policeStatus', weight: 7, label: 'Police Status' },
    { key: 'proceedingsStatus', weight: 4, label: 'Proceedings Status' },
    { key: 'proceduralStage', weight: 5, label: 'Procedural Stage' },
    { key: 'noticesOrders', weight: 4, label: 'Notices/Orders' },
    { key: 'documents', weight: 8, label: 'Documents' },
    { key: 'evidence', weight: 6, label: 'Evidence' },
    { key: 'courtInvolvement', weight: 3, label: 'Court Involvement' },
    { key: 'urgency', weight: 3, label: 'Urgency' },
    { key: 'clientObjective', weight: 8, label: 'Client Objective' },
    { key: 'newCriminalLaws', weight: 2, label: 'Awareness of New Laws' },
    { key: 'medicalInjuryEvidence', weight: 5, label: 'Medical Injury Evidence' }
  ];

  let rawCalculatedScore = 0;
  const missing: string[] = [];
  const established: Array<{ label: string; value: string; source: string }> = [];
  const authorities: string[] = [];
  const quickReplies: string[] = [];

  facts.documents.completeness = Math.min(1.0, docCount * 0.5) as 0 | 0.5 | 1.0;

  // Case-specific bonus understanding (only the fields actually established by
  // evidence/statements count toward the committee score).
  if (facts.matter.value === 'Builder Possession Delay') {
    if (facts.agreementDetails?.value) { facts.agreementDetails.completeness = 1.0; rawCalculatedScore += 4; }
    if (facts.possessionDueDate?.value) { facts.possessionDueDate.completeness = 1.0; rawCalculatedScore += 4; }
  } else if (facts.matter.value === 'Neighbour Dispute / Physical Altercation' || 
             facts.matter.value === 'Criminal Matter' ||
             facts.matter.value === 'Employment / Labour Dispute') {
    if (facts.medicalInjuryEvidence?.value) { facts.medicalInjuryEvidence.completeness = 0.75; rawCalculatedScore += 4; }
  } else {
    if (facts.medicalInjuryEvidence?.value) { facts.medicalInjuryEvidence.completeness = 0.75; rawCalculatedScore += 4; }
  }

  for (const item of weights) {
    const factVal = (facts as any)[item.key] as FactValue<any>;
    if (factVal && factVal.value !== null && factVal.value !== undefined && factVal.completeness > 0) {
      const paramScore = item.weight * factVal.completeness;
      rawCalculatedScore += paramScore;

      const displayVal = Array.isArray(factVal.value)
        ? factVal.value.join(', ')
        : String(factVal.value);

      established.push({
        label: item.label,
        value: displayVal,
        source: factVal.sourcesList?.join(' + ') || factVal.source
      });
    } else {
      missing.push(item.label);
    }
  }

  // CONSERVATIVE CITATIONS — only attach legislation when the corresponding
  // fact is actually established in this case; never attach blindly.
  if (facts.matter.value === 'Builder Possession Delay') {
    if (facts.agreementDetails?.value || facts.possessionDueDate?.value) {
      authorities.push('Real Estate (Regulation and Development) Act 2016 Section 18 (Refund & possession delay interest)');
      authorities.push('Consumer Protection Act 2019 (unfair trade practice, delay in possession)');
    }
  } else if (facts.matter.value === 'Neighbour Dispute / Physical Altercation') {
    if (facts.policeStatus?.value === true) {
      authorities.push('Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 Section 173 (Cognizable Report / FIR)');
    }
    if (facts.medicalInjuryEvidence?.value) {
      authorities.push('Bharatiya Nyaya Sanhita (BNS), 2023 Section 115 (Voluntarily Causing Hurt)');
    }
    // BNS 351 (Criminal Intimidation) only if threat specifically alleged
    if (facts.medicalInjuryEvidence?.value?.toLowerCase().includes('threat')) {
      authorities.push('Bharatiya Nyaya Sanhita (BNS), 2023 Section 351 (Criminal Intimidation)');
    }
  }

  // ADAPTIVE QUICK REPLIES — always reflect the currently missing information,
  // never hardcoded city options that could nudge the jurisdiction.
  if (!facts.matter.value) {
    quickReplies.push('I had a fight with my neighbour');
    quickReplies.push('My builder delayed possession of my flat');
  } else if (!facts.jurisdiction.value) {
    quickReplies.push('Let me tell you where this happened');
    quickReplies.push('I will describe the incident in detail');
  } else if (facts.matter.value === 'Builder Possession Delay') {
    if (!facts.agreementDetails?.value) {
      quickReplies.push('I signed a sale agreement');
      quickReplies.push('Possession was due in June 2024');
    } else if (!facts.clientObjective?.value) {
      quickReplies.push('I want a full refund with interest');
      quickReplies.push('I want possession of my flat');
    }
  } else if (facts.policeStatus.value === null || facts.policeStatus.value === undefined) {
    quickReplies.push('Yes, I filed an FIR / police complaint');
    quickReplies.push('No police complaint filed yet');
  } else if (!facts.medicalInjuryEvidence?.value) {
    quickReplies.push('Yes, I sustained injuries');
    quickReplies.push('No injuries, just verbal threats');
  }

  const rawScore = Math.min(100, Math.round(rawCalculatedScore));

  let stage: ReadinessStage = 'INITIAL INTAKE';
  if (rawScore >= 90) stage = 'HIGH INFORMATION COMPLETENESS';
  else if (rawScore >= 80) stage = 'COUNSEL-READY';
  else if (rawScore >= 65) stage = 'SUBSTANTIAL CASE UNDERSTANDING';
  else if (rawScore >= 45) stage = 'CASE CONTEXT DEVELOPING';
  else if (rawScore >= 25) stage = 'BASIC CONTEXT';

  const isAssaultReady = facts.matter.value === 'Neighbour Dispute / Physical Altercation'
    ? (facts.jurisdiction.value !== null && facts.policeStatus.value !== null && facts.medicalInjuryEvidence?.value !== null)
    : (facts.jurisdiction.value !== null && (facts.agreementDetails?.value !== null || facts.possessionDueDate?.value !== null));

  const status: DiscoveryStatus = (rawScore >= 80 && isAssaultReady)
    ? 'READY_FOR_RECOMMENDATION'
    : 'NEEDS_INFORMATION';

  return {
    rawScore,
    stage,
    missing: missing.slice(0, 3),
    allMissing: missing,
    established,
    status,
    authorities,
    quickReplies
  };
}

export async function processClientTurn(
  caseIdOrState: string | CaseState,
  userMessage: string,
  attachment?: { name: string; size: string; type: string }
): Promise<CaseState> {
  const state = typeof caseIdOrState === 'string'
    ? getOrCreateCaseState(caseIdOrState, userMessage)
    : caseIdOrState;
  const caseId = state.caseId;
  const previousScore = state.readinessScore;

  const intent = classifyMessageIntent(userMessage, state);
  state.lastIntent = intent;

  const lastAssistantMsg = state.messages.filter(m => m.role === 'assistant').pop()?.content;

  // Append user message to server history
  state.messages.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // INTENT 1: META QUESTIONS
  if (intent === 'META_QUESTION') {
    const metaReply = "Yes. You can describe your situation naturally in your own words — you don't need to use legal terminology. I'll identify the relevant details, ask for missing information, and explain your options.";
    state.messages.push({
      role: 'assistant',
      content: metaReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    return state; // CaseFacts, readinessScore, and discoveryStatus remain STRICTLY UNCHANGED!
  }

  // INTENT 2: READINESS MANIPULATION ATTEMPT
  if (intent === 'READINESS_MANIPULATION_ATTEMPT') {
    const refusalReply = "I can improve your Case Readiness Score only by establishing more relevant case facts or reviewing supporting documents. Tell me more about your legal situation and I'll update your score automatically.";
    state.messages.push({ role: 'assistant', content: refusalReply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    return state;
  }

  // INTENT 3: READINESS QUERY
  if (intent === 'READINESS_QUERY') {
    const missingList = state.missingInformation.length > 0 ? state.missingInformation.join(', ') : 'Incident details and evidence';
    const queryReply = `Your current Case Readiness Score is ${state.readinessScore}% (${state.readinessStage}). The main information still missing is: ${missingList}. Providing these details or uploading supporting documents will update your score automatically.`;
    state.messages.push({ role: 'assistant', content: queryReply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    return state;
  }

  // INTENT 4: CASUAL CONVERSATION / OUT OF SCOPE
  if (intent === 'CASUAL_CONVERSATION' || intent === 'OUT_OF_SCOPE') {
    let casualReply = "It's around 6:14 AM in your local time. If you'd like to continue discussing your legal matter, I'm ready.";
    if (userMessage.toLowerCase().includes('thanks') || userMessage.toLowerCase().includes('thank')) {
      casualReply = "You're welcome! Let me know whenever you have more details or questions about your case.";
    } else if (userMessage.toLowerCase().includes('okay') || userMessage.toLowerCase().includes('ok') || userMessage.toLowerCase().includes('cool')) {
      casualReply = "Understood. Whenever you are ready to continue, tell me more about your case context.";
    } else if (userMessage.toLowerCase().includes('did i tell you') || userMessage.toLowerCase().includes('did i say') || userMessage.toLowerCase().includes('have i mentioned')) {
      const hasPolice = state.facts.policeStatus.value === true;
      casualReply = hasPolice
        ? "Yes, you previously mentioned that a police complaint / CSR was filed."
        : "You haven't explicitly mentioned whether a police report was filed yet. Have you reported it to the police?";
    }
    state.messages.push({ role: 'assistant', content: casualReply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    return state; // CaseFacts & readinessScore remain STRICTLY UNCHANGED!
  }

  // INTENT 5: GREETING
  if (intent === 'GREETING') {
    if (!state.facts.matter.value) {
      const greetingReply = "Hello! I'm NYAYAI. Tell me what legal issue you're dealing with, and I'll help you understand your options, calculate your case readiness, and match relevant advocates.";
      state.messages.push({ role: 'assistant', content: greetingReply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      state.readinessScore = 0;
      return state;
    } else {
      const activeGreetingReply = `Hello again! We are currently working on your ${state.facts.matter.value} case (${state.readinessScore}% readiness). What update or details would you like to add?`;
      state.messages.push({ role: 'assistant', content: activeGreetingReply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      return state;
    }
  }

  // INTENT 6: CASE_INTAKE or CASE_FACT_UPDATE -> LLM extraction + deterministic merge
  let extractedLabels: string[] = [];
  let extractionFallback = false;
  {
    // Quick pre-extraction missing list from current state to guide LLM
    const preMissing = computeMissingLabels(state.facts);
    const extracted = await extractFacts(state.facts, userMessage, lastAssistantMsg, preMissing);
    const mergeResult = mergeExtractedFacts(state.facts, extracted);
    state.facts = mergeResult;
    extractedLabels = Object.keys(extracted).filter(k => k !== 'confidence' && k !== 'isQuestion' && k !== 'correction' && (extracted as any)[k] !== null && (extracted as any)[k] !== undefined);
    extractionFallback = !extracted.confidence || extracted.confidence < 0.5;
    logger.info('[CASE] Facts merged', { extractedLabels, extractionFallback });
  }

  if (attachment) {
    state.documents.push({
      id: `doc-${Date.now()}`,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
      category: 'CASE_DOCUMENT',
      documentType: 'Legal Document',
      uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      summary: `Document ${attachment.name} uploaded and facts extracted.`
    });
  }

  // Calculate raw uncapped score
  const uncapped = calculateRawUncappedScore(state.facts, state.documents.length);

  // Apply HARD CAP score increase per turn (MAX_INCREASE_PER_TURN = 8)
  const maxAllowedCap = attachment ? MAX_DOCUMENT_INCREASE : MAX_INCREASE_PER_TURN;
  const targetScore = Math.min(100, Math.min(previousScore + maxAllowedCap, uncapped.rawScore));

  if (targetScore !== previousScore) {
    state.readinessScore = targetScore;
    state.readinessStage = uncapped.stage;

    state.scoreHistory.push({
      timestamp: new Date().toISOString(),
      previousScore,
      newScore: targetScore,
      changedParameters: uncapped.established.map(e => e.label),
      reason: attachment ? `Document facts extracted (${previousScore}% -> ${targetScore}%)` : `Facts updated from chat turn (${previousScore}% -> ${targetScore}%)`
    });
  }

  state.missingInformation = uncapped.missing;
  state.allMissingInformation = uncapped.allMissing || uncapped.missing;
  state.establishedFacts = uncapped.established;
  state.discoveryStatus = uncapped.status;
  state.legalAuthorities = uncapped.authorities;
  state.quickResponses = uncapped.quickReplies;
  state.lastExtracted = extractedLabels;

  const detectedPracticeArea = detectPracticeArea(state);
  state.practiceArea = detectedPracticeArea;

  // RICH CASE UNDERSTANDING — reflects the actual merged state for the UI panel
  state.caseUnderstanding = [
    { key: 'matter', label: 'Matter', value: state.facts.matter.value || 'Not established', status: state.facts.matter.value ? 'verified' : 'missing' },
    { key: 'jurisdiction', label: 'Jurisdiction', value: state.facts.jurisdiction.value || 'Not specified', status: state.facts.jurisdiction.value ? 'verified' : 'missing' },
    { key: 'practiceArea', label: 'Practice Area', value: detectedPracticeArea, status: state.facts.matter.value ? 'verified' : 'missing' },
    { key: 'proceduralStage', label: 'Procedural Stage', value: state.facts.proceduralStage.value || 'Not established', status: state.facts.proceduralStage.value ? 'verified' : 'missing' },
    { key: 'incidentDate', label: 'Incident Date', value: state.facts.incidentDate.value || 'Not specified', status: state.facts.incidentDate.value ? 'verified' : 'missing' },
    { key: 'opposingParty', label: 'Opposing Party', value: state.facts.opposingParty.value || 'Not specified', status: state.facts.opposingParty.value ? 'verified' : 'missing' },
    { key: 'relationship', label: 'Relationship', value: state.facts.relationship.value || 'Not specified', status: state.facts.relationship.value ? 'verified' : 'missing' },
    { key: 'policeStatus', label: 'Police Status', value: state.facts.policeStatus.value === true ? 'FIR / CSR filed' : state.facts.policeStatus.value === 'NONE' ? 'No police complaint' : 'Not specified', status: state.facts.policeStatus.value !== null && state.facts.policeStatus.value !== undefined ? 'verified' : 'missing' },
    { key: 'medicalInjuryEvidence', label: 'Injury / Threat', value: state.facts.medicalInjuryEvidence?.value || 'Not specified', status: state.facts.medicalInjuryEvidence?.value ? 'verified' : 'missing' },
    { key: 'evidence', label: 'Evidence', value: state.facts.evidence.value?.length ? state.facts.evidence.value.join(', ') : 'Not specified', status: state.facts.evidence.value?.length ? 'verified' : 'missing' },
    { key: 'clientObjective', label: 'Client Objective', value: state.facts.clientObjective.value || 'Not specified', status: state.facts.clientObjective.value ? 'verified' : 'missing' },
    { key: 'urgency', label: 'Urgency', value: state.facts.urgency.value || 'Not specified', status: state.facts.urgency.value ? 'verified' : 'missing' }
  ];

  if (state.discoveryStatus === 'READY_FOR_RECOMMENDATION' && state.readinessScore >= 80) {
    try {
      const directory = await db.getAdvocateDirectory();
      const matches = await buildCaseRecommendations(
        { facts: state.facts, practiceArea: state.practiceArea, title: state.title },
        directory,
        { limit: 8 }
      );
      state.recommendationData = matches.filter(m => m.matchScore >= 60);
    } catch (err: any) {
      logger.warn(`Recommendation engine unavailable, keeping empty recommendations: ${err.message}`);
      state.recommendationData = [];
    }
  } else {
    state.recommendationData = [];
  }

  // DEBUG LOGGING
  logger.info(`[CASE DEBUG] caseId=${caseId}`, {
    BEFORE_KNOWN: state.establishedFacts.map(f => f.label),
    NEW_MESSAGE: userMessage,
    EXTRACTED_MATTER: state.facts.matter.value,
    EXTRACTED_JURISDICTION: state.facts.jurisdiction.value,
    EXTRACTED_LABELS: extractedLabels,
    READINESS: `${previousScore}% -> ${state.readinessScore}%`,
    REMAINING_MISSING: state.missingInformation
  });

  // DETERMINISTIC NEXT QUESTION SELECTION (matter-aware, no repeats, combine related)
  const nextQuestion = determineNextQuestion(state);

  // BUILD REPLY — try LLM with strict instruction to ask exactly that question;
  // reject any output that re-asks a known fact; fall back to deterministic text.
  let replyText = '';
  const groqMessages: GroqChatMessage[] = [
    {
      role: 'system',
      content: `You are NYAYAI Legal Copilot. You are having a natural conversation with a client gathering facts for a legal case.
Known facts (do NOT ask these again):
${Object.entries({
  Matter: state.facts.matter.value,
  Jurisdiction: state.facts.jurisdiction.value,
  'Incident Date': state.facts.incidentDate.value,
  'Opposing Party': state.facts.opposingParty.value,
  Relationship: state.facts.relationship.value,
  'Police Status': state.facts.policeStatus.value === true ? 'FIR/CSR filed' : state.facts.policeStatus.value === 'NONE' ? 'No FIR' : 'unknown',
  'Injury/Threat': state.facts.medicalInjuryEvidence?.value || 'unknown',
  Evidence: state.facts.evidence.value?.length ? state.facts.evidence.value.join(', ') : 'none',
  Objective: state.facts.clientObjective.value || 'unknown'
}).filter(([,v]) => v && v !== 'unknown').map(([k,v]) => `${k}: ${v}`).join('\\n')}

Missing information we still need: ${state.missingInformation.join(', ')}

NEXT QUESTION TO ASK (combine related missing items into ONE natural question, acknowledge what you just learned, do NOT repeat known facts):
${nextQuestion}

Rules:
- Keep response under 120 words. Be conversational, not robotic.
- Acknowledge the new facts the user just shared before asking the next question.
- NEVER ask for a fact that is already listed as KNOWN above.
- If the case is complete (READY_FOR_RECOMMENDATION), give a brief summary and mention advocate matches are ready.`
    },
    ...state.messages.slice(-4).map(m => ({ role: m.role, content: m.content }))
  ];

  try {
    const rawReply = await callGroqAPI(groqMessages, 0.1);
    const sanitized = sanitizeLLMResponse(rawReply);

    // STRICT NO-REPEAT GUARD: reject if reply re-asks any KNOWN fact
    if (containsRepeatedKnownQuestion(sanitized, state)) {
      throw new Error('LLM re-asked a known fact');
    }
    replyText = sanitized;
  } catch (err) {
    logger.warn('Groq reply generation failed or re-asked known fact, using deterministic reply');
    replyText = buildDeterministicReply(state, extractedLabels, nextQuestion);
  }

  // Append assistant message to server history
  state.messages.push({
    role: 'assistant',
    content: replyText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  return state;
}

/**
 * Determines the next most useful question based on matter type and known facts.
 * Combines related missing fields into a single natural question.
 */
function determineNextQuestion(state: CaseState): string {
  const matter = state.facts.matter.value;
  // Use allMissingInformation (full list) not truncated missingInformation
  const allMissing = state.allMissingInformation || state.missingInformation || [];
  const known = (key: string) => !allMissing.includes(key);

  if (!matter) {
    return 'What legal issue are you dealing with?';
  }

  // NEIGHBOUR DISPUTE / PHYSICAL ALTERCATION
  if (matter === 'Neighbour Dispute / Physical Altercation') {
    if (!known('Jurisdiction')) return 'Which city and state did this occur in?';
    if (!known('Police Status')) return `The incident occurred in ${state.facts.jurisdiction.value}. Has a police complaint, CSR, or FIR been filed?`;
    if (!known('Injury / Threat') && !known('Evidence')) return `A police CSR was registered in ${state.facts.jurisdiction.value}. What exactly happened — were there physical injuries, verbal threats, or property damage?`;
    if (!known('Evidence')) return `Thank you for those details. Do you have medical records, photographs, CCTV footage, or witnesses to support your claim?`;
    if (!known('Client Objective')) return `What outcome are you hoping for — legal action, compensation, protection, or something else?`;
    return 'Is there anything else you want to add?';
  }

  // BUILDER POSSESSION DELAY
  if (matter === 'Builder Possession Delay') {
    if (!known('Jurisdiction')) return 'Which city and state is the property located in?';
    if (!known('Possession Due Date') && !known('Notices/Orders')) return `The property is in ${state.facts.jurisdiction.value}. What was the promised possession date in your builder-buyer agreement?`;
    if (!known('Notices/Orders')) return `Have you issued a formal legal notice to the builder or filed a petition with the RERA Tribunal?`;
    if (!known('Client Objective')) return `What outcome are you seeking — full refund with interest, possession delivery, or compensation?`;
    return 'Is there anything else you want to add?';
  }

  // EMPLOYMENT / LABOUR DISPUTE
  if (matter === 'Employment / Labour Dispute') {
    if (!known('Jurisdiction')) return 'Which city and state is your workplace located in?';
    if (!known('Opposing Party')) return 'Who is your employer — the company name or individual?';
    if (!known('Incident Date') && !known('Timeline & Dates')) return `How long have the salary payments been delayed?`;
    if (!known('Evidence')) return `Do you have appointment letters, pay slips, bank statements, or email correspondence as evidence?`;
    if (!known('Client Objective')) return `What outcome are you seeking — unpaid salary recovery, compensation, or reinstatement?`;
    return 'Is there anything else you want to add?';
  }

  // CONTRACTOR / SERVICE DISPUTE
  if (matter === 'Contractor / Service Dispute') {
    if (!known('Jurisdiction')) return 'Which city and state is the work site located in?';
    if (!known('Opposing Party')) return 'Who is the contractor or service provider?';
    if (!known('Incident Date') && !known('Timeline & Dates')) return `When was the work supposed to be completed?`;
    if (!known('Evidence')) return `Do you have a written agreement, payment receipts, photos of incomplete work, or messages?`;
    if (!known('Client Objective')) return `What outcome are you seeking — refund, completion of work, or compensation?`;
    return 'Is there anything else you want to add?';
  }

  // INSURANCE DISPUTE
  if (matter === 'Insurance Dispute') {
    if (!known('Jurisdiction')) return 'Which city and state are you located in?';
    if (!known('Opposing Party')) return 'Which insurance company denied your claim?';
    if (!known('Incident Date')) return `When did the incident occur that led to the claim?`;
    if (!known('Evidence')) return `Do you have the policy document, claim rejection letter, medical reports, or surveyor reports?`;
    if (!known('Client Objective')) return `What outcome are you seeking — claim settlement, policy enforcement, or compensation?`;
    return 'Is there anything else you want to add?';
  }

  // CONSUMER DISPUTE
  if (matter === 'Consumer Dispute') {
    if (!known('Jurisdiction')) return 'Which city and state did the purchase/service take place in?';
    if (!known('Opposing Party')) return 'Who is the seller or service provider?';
    if (!known('Incident Date')) return `When did you make the purchase or avail the service?`;
    if (!known('Evidence')) return `Do you have the invoice, warranty card, product photos, or communication records?`;
    if (!known('Client Objective')) return `What outcome are you seeking — refund, replacement, repair, or compensation?`;
    return 'Is there anything else you want to add?';
  }

  // TENANT SECURITY DEPOSIT DISPUTE
  if (matter === 'Tenant Security Deposit Dispute') {
    if (!known('Jurisdiction')) return 'Which city and state is the property located in?';
    if (!known('Opposing Party')) return 'Who is the landlord?';
    if (!known('Incident Date')) return `When did you vacate the property?`;
    if (!known('Evidence')) return `Do you have the rental agreement, move-in/move-out photos, or rent receipts?`;
    if (!known('Client Objective')) return `What outcome are you seeking — full deposit return, partial deduction dispute, or interest?`;
    return 'Is there anything else you want to add?';
  }

  // CRIMINAL MATTER
  if (matter === 'Criminal Matter') {
    if (!known('Jurisdiction')) return 'Which city and state did the incident occur in?';
    if (!known('Police Status')) return `Has an FIR been registered? If so, at which police station?`;
    if (!known('Injury / Threat')) return `What happened — was there physical harm, threat, or property damage?`;
    if (!known('Evidence')) return `Do you have medical reports, witnesses, CCTV, or other evidence?`;
    if (!known('Client Objective')) return `What are you seeking — FIR registration, bail, quashing, or compensation?`;
    return 'Is there anything else you want to add?';
  }

  // GENERIC FALLBACK
  if (!known('Jurisdiction')) return 'Which city and state is this matter in?';
  if (!known('Incident Description')) return `Can you describe what happened in ${state.facts.jurisdiction.value}?`;
  if (!known('Opposing Party')) return `Who is the other party involved?`;
  if (!known('Incident Date') && !known('Timeline & Dates')) return `When did this issue start or occur?`;
  if (!known('Evidence')) return `Do you have any documents, photos, messages, or witnesses?`;
  if (!known('Client Objective')) return 'What outcome are you looking for?';
  return 'Is there anything else you would like to share?';
}

/**
 * Strict check: does the reply ask for a fact we already know?
 */
function containsRepeatedKnownQuestion(reply: string, state: CaseState): boolean {
  const lower = reply.toLowerCase();
  const knownFacts: string[] = [];

  if (state.facts.matter.value) knownFacts.push('matter');
  if (state.facts.jurisdiction.value) knownFacts.push('jurisdiction', 'city', 'state', 'which city', 'which state', 'where is the property', 'where did this');
  if (state.facts.incidentDate.value) knownFacts.push('incident date', 'when did', 'when was');
  if (state.facts.opposingParty.value) knownFacts.push('opposing party', 'who is the', 'who was the');
  if (state.facts.relationship.value) knownFacts.push('relationship', 'what is your relation');
  if (state.facts.policeStatus.value !== null && state.facts.policeStatus.value !== undefined) knownFacts.push('police', 'csr', 'fir', 'complaint', 'reported');
  if (state.facts.medicalInjuryEvidence?.value) knownFacts.push('injur', 'threat', 'hit', 'physical', 'damage');
  if (state.facts.evidence.value?.length) knownFacts.push('evidence', 'cctv', 'witness', 'photo', 'certificate', 'document');
  if (state.facts.clientObjective.value) knownFacts.push('objective', 'what do you want', 'outcome', 'goal');

  // Patterns that indicate a question about a known fact
  const questionPatterns = knownFacts.map(k => new RegExp(`(what|which|where|when|who|do you have|have you|was there|is there).*${k}|${k}.*\\?`, 'i'));

  for (const pattern of questionPatterns) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

/**
 * Deterministic fallback reply that acknowledges extracted facts and asks the
 * exact next question without any LLM hallucination.
 */
function buildDeterministicReply(state: CaseState, extractedLabels: string[], nextQuestion: string): string {
  const ackParts: string[] = [];
  const matter = state.facts.matter.value || 'your case';

  if (extractedLabels.includes('jurisdiction') || extractedLabels.includes('state') || extractedLabels.includes('city')) {
    ackParts.push(`Got it — ${state.facts.jurisdiction.value}.`);
  }
  if (extractedLabels.includes('policeStatus')) {
    ackParts.push(state.facts.policeStatus.value === true ? 'Understood — a police complaint has been filed.' : 'Noted — no police complaint filed yet.');
  }
  if (extractedLabels.includes('medicalInjuryEvidence')) {
    ackParts.push('Thank you for clarifying the injury/threat details.');
  }
  if (extractedLabels.includes('evidence')) {
    ackParts.push(`Thanks for mentioning ${state.facts.evidence.value?.join(' and ') || 'that evidence'}.`);
  }
  if (extractedLabels.includes('clientObjective')) {
    ackParts.push(`Understood — you want ${state.facts.clientObjective.value?.toLowerCase() || 'that outcome'}.`);
  }
  if (extractedLabels.includes('possessionDueDate')) {
    ackParts.push(`Understood — possession was promised as of ${state.facts.possessionDueDate?.value ?? 'the date you mentioned'}.`);
  }
  if (extractedLabels.includes('incidentDate')) {
    ackParts.push(`Noted — incident date recorded.`);
  }
  if (extractedLabels.includes('matter')) {
    ackParts.push(`I understand this is a ${matter.toLowerCase()}.`);
  }

  const ack = ackParts.length ? ackParts.join(' ') + ' ' : '';

  if (state.discoveryStatus === 'READY_FOR_RECOMMENDATION' && state.readinessScore >= 80) {
    return `${ack}Your case readiness is now ${state.readinessScore}% (${state.readinessStage}). Based on your ${matter.toLowerCase()} in ${state.facts.jurisdiction.value}, I have matched verified Advocates with relevant High Court precedent experience.`;
  }

  return `${ack}${nextQuestion}`;
}
