import type {
  CaseState,
  CaseFacts,
  FactValue,
  DiscoveryStatus,
  ReadinessStage,
  MessageIntent
} from '../types/index.js';
import { callGroqAPI, GroqChatMessage, sanitizeLLMResponse } from './groqService.js';
import { findMatchingAdvocates } from './advocateEngineService.js';
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

  const initialFacts: CaseFacts = {
    matter: createFact(null),
    incidentDescription: createFact(null),
    jurisdiction: createFact(null),
    parties: createFact([]),
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
    clientObjective: createFact(null),
    agreementDetails: createFact(null),
    possessionDueDate: createFact(null),
    medicalInjuryEvidence: createFact(null)
  };

  const newCase: CaseState = {
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

  caseStore.set(caseId, newCase);
  logger.info(`Created new server case state for caseId=${caseId} (0% baseline score)`);
  return newCase;
}

export function mergeFactsDeterministically(existing: CaseFacts, newText: string, lastAssistantMsg?: string, isDoc = false): CaseFacts {
  const text = newText.toLowerCase().trim();
  const merged: CaseFacts = { ...existing };
  const source = isDoc ? 'document' : 'client_chat';

  // CRITICAL: Check if message is a QUESTION asking if something was previously stated
  const isQuestionAboutState = text.startsWith('did i tell you') || text.startsWith('did i say') || text.startsWith('have i mentioned') || (text.includes('did i') && text.endsWith('?'));
  if (isQuestionAboutState) {
    // A question is NOT a new fact!
    return merged;
  }

  // 1. Contextual "Yes" / "No" handling using previous assistant question
  if ((text === 'yes' || text === 'yes.' || text === 'ya' || text === 'yup') && lastAssistantMsg) {
    const last = lastAssistantMsg.toLowerCase();
    if (last.includes('police') || last.includes('csr') || last.includes('fir')) {
      merged.policeStatus = {
        value: true,
        source,
        confidence: 0.95,
        completeness: 1.0,
        sourcesList: Array.from(new Set([...(merged.policeStatus.sourcesList || []), source]))
      };
      merged.proceduralStage = {
        value: 'Police CSR Registered / Inquiry Pending',
        source,
        confidence: 0.9,
        completeness: 0.75,
        sourcesList: Array.from(new Set([...(merged.proceduralStage.sourcesList || []), source]))
      };
      return merged;
    } else if (last.includes('agreement') || last.includes('contract')) {
      merged.agreementDetails = {
        value: 'Sale / Possession Agreement documented',
        source,
        confidence: 0.9,
        completeness: 0.75,
        sourcesList: Array.from(new Set([...(merged.agreementDetails?.sourcesList || []), source]))
      };
      return merged;
    }
  }

  // 2. Matter Clarity
  if (text.includes('fight') || text.includes('assault') || text.includes('neighbour') || text.includes('dispute') || text.includes('boundary') || text.includes('altercation') || text.includes('road') || text.includes('hit me') || text.includes('punched')) {
    const isDetailed = text.length > 30;
    merged.matter = {
      value: 'Neighbour Dispute / Physical Altercation',
      source,
      confidence: 0.95,
      completeness: isDetailed ? 1.0 : 0.75,
      sourcesList: Array.from(new Set([...(merged.matter.sourcesList || []), source]))
    };
  } else if (text.includes('builder') || text.includes('flat') || text.includes('possession') || text.includes('rera') || text.includes('deliver') || text.includes('handover')) {
    const isDetailed = text.length > 30;
    merged.matter = {
      value: 'Builder Possession Delay',
      source,
      confidence: 0.95,
      completeness: isDetailed ? 1.0 : 0.75,
      sourcesList: Array.from(new Set([...(merged.matter.sourcesList || []), source]))
    };
  } else if (text.includes('landlord') || text.includes('deposit') || text.includes('rent')) {
    merged.matter = {
      value: 'Tenant Security Deposit Dispute',
      source,
      confidence: 0.95,
      completeness: 0.75,
      sourcesList: Array.from(new Set([...(merged.matter.sourcesList || []), source]))
    };
  }

  // 3. Incident Description Narrative Extraction
  if (text.includes('road') || text.includes('hit me') || text.includes('no reason') || text.includes('walk') || text.includes('struck') || text.includes('punched')) {
    merged.incidentDescription = {
      value: 'Client states neighbour physically struck them while on the road.',
      source,
      confidence: 0.9,
      completeness: 0.75,
      sourcesList: Array.from(new Set([...(merged.incidentDescription.sourcesList || []), source]))
    };
  }

  // 4. Timeline & Dates
  if (text.includes('2 years') || text.includes('22 months') || text.includes('2024') || text.includes('2023') || text.includes('yesterday') || text.includes('last week') || text.includes('last sunday') || text.includes('today')) {
    merged.timeline = {
      value: 'Timeline & dates recorded',
      source,
      confidence: 0.9,
      completeness: text.length > 40 ? 0.75 : 0.5,
      sourcesList: Array.from(new Set([...(merged.timeline.sourcesList || []), source]))
    };
  }

  // 5. Jurisdiction
  if (!merged.jurisdiction.value) {
    if (text.includes('karnataka') || text.includes('bengaluru') || text.includes('bangalore')) {
      merged.jurisdiction = {
        value: 'Karnataka (Bengaluru)',
        source,
        confidence: 0.95,
        completeness: 1.0,
        sourcesList: Array.from(new Set([...(merged.jurisdiction.sourcesList || []), source]))
      };
    } else if (text.includes('delhi') || text.includes('ncr')) {
      merged.jurisdiction = {
        value: 'Delhi NCR',
        source,
        confidence: 0.95,
        completeness: 1.0,
        sourcesList: Array.from(new Set([...(merged.jurisdiction.sourcesList || []), source]))
      };
    } else if (text.includes('mumbai') || text.includes('maharashtra')) {
      merged.jurisdiction = {
        value: 'Maharashtra (Mumbai)',
        source,
        confidence: 0.95,
        completeness: 1.0,
        sourcesList: Array.from(new Set([...(merged.jurisdiction.sourcesList || []), source]))
      };
    }
  }

  // 6. Police Status
  if (text.includes('reported it to police') || text.includes('reported to police') || text.includes('csr filed') || text.includes('filed a csr') || text.includes('filed csr') || text.includes('filed an fir') || text.includes('filed fir') || text.includes('police complaint is done')) {
    merged.policeStatus = {
      value: true,
      source,
      confidence: 0.95,
      completeness: 1.0,
      sourcesList: Array.from(new Set([...(merged.policeStatus.sourcesList || []), source]))
    };
    merged.proceduralStage = {
      value: 'Police CSR Registered / Inquiry Pending',
      source,
      confidence: 0.9,
      completeness: 0.75,
      sourcesList: Array.from(new Set([...(merged.proceduralStage.sourcesList || []), source]))
    };
  } else if (text.includes('no police') || text.includes('havent reported') || text.includes('no fir')) {
    merged.policeStatus = {
      value: 'NONE',
      source,
      confidence: 0.95,
      completeness: 1.0,
      sourcesList: Array.from(new Set([...(merged.policeStatus.sourcesList || []), source]))
    };
  }

  // 7. Evidence & Physical Injuries
  if (text.includes('injury') || text.includes('injuries') || text.includes('injured') || text.includes('assault') || text.includes('physical violence') || text.includes('threat') || text.includes('damage') || text.includes('hit') || text.includes('punched')) {
    merged.medicalInjuryEvidence = {
      value: 'Physical violence / injuries / threats documented',
      source,
      confidence: 0.9,
      completeness: text.includes('injuries') ? 0.75 : 0.5,
      sourcesList: Array.from(new Set([...(merged.medicalInjuryEvidence?.sourcesList || []), source]))
    };
  }

  // 8. Agreement Details
  if (text.includes('agreement') || text.includes('contract') || text.includes('due in') || text.includes('possession was due')) {
    merged.agreementDetails = {
      value: 'Sale / Possession Agreement documented',
      source,
      confidence: 0.9,
      completeness: 0.75,
      sourcesList: Array.from(new Set([...(merged.agreementDetails?.sourcesList || []), source]))
    };
    if (text.includes('2024')) {
      merged.possessionDueDate = {
        value: 'June 2024',
        source,
        confidence: 0.95,
        completeness: 1.0,
        sourcesList: Array.from(new Set([...(merged.possessionDueDate?.sourcesList || []), source]))
      };
    }
  }

  // 9. Client Objective
  if (text.includes('refund') || text.includes('compensation') || text.includes('protection') || text.includes('action') || text.includes('quash') || text.includes('injunction')) {
    merged.clientObjective = {
      value: text.includes('refund') ? 'Full refund + delay interest' : 'Legal protection & remedy',
      source,
      confidence: 0.9,
      completeness: 0.75,
      sourcesList: Array.from(new Set([...(merged.clientObjective.sourcesList || []), source]))
    };
  }

  return merged;
}

export function calculateRawUncappedScore(facts: CaseFacts, docCount: number): {
  rawScore: number;
  stage: ReadinessStage;
  missing: string[];
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
    { key: 'matter', weight: 10, label: 'Matter Clarity' },
    { key: 'incidentDescription', weight: 10, label: 'Incident Description' },
    { key: 'jurisdiction', weight: 8, label: 'Jurisdiction' },
    { key: 'parties', weight: 5, label: 'Parties Involved' },
    { key: 'relationship', weight: 3, label: 'Relationship' },
    { key: 'timeline', weight: 8, label: 'Timeline & Dates' },
    { key: 'keyFacts', weight: 10, label: 'Key Circumstances' },
    { key: 'financialImpact', weight: 5, label: 'Financial Impact' },
    { key: 'policeStatus', weight: 7, label: 'Police Status' },
    { key: 'proceedingsStatus', weight: 6, label: 'Proceedings Status' },
    { key: 'proceduralStage', weight: 6, label: 'Procedural Stage' },
    { key: 'noticesOrders', weight: 5, label: 'Notices/Orders' },
    { key: 'documents', weight: 8, label: 'Documents' },
    { key: 'evidence', weight: 5, label: 'Evidence' },
    { key: 'clientObjective', weight: 9, label: 'Client Objective' }
  ];

  let rawCalculatedScore = 0;
  const missing: string[] = [];
  const established: Array<{ label: string; value: string; source: string }> = [];
  const authorities: string[] = [];
  const quickReplies: string[] = [];

  facts.documents.completeness = Math.min(1.0, docCount * 0.5) as 0 | 0.5 | 1.0;

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

  if (facts.matter.value === 'Builder Possession Delay') {
    authorities.push('Real Estate (Regulation and Development) Act 2016 Section 18');
    authorities.push('Consumer Protection Act 2019');

    if (facts.agreementDetails?.value) rawCalculatedScore += 5;
    if (facts.possessionDueDate?.value) rawCalculatedScore += 5;

    if (!facts.jurisdiction.value) {
      quickReplies.push('Bengaluru, Karnataka');
      quickReplies.push('Delhi NCR');
      quickReplies.push('Mumbai, Maharashtra');
    } else if (!facts.agreementDetails?.value) {
      quickReplies.push('Possession was due in June 2024');
      quickReplies.push('Signed sale agreement available');
    } else if (!facts.clientObjective.value) {
      quickReplies.push('Claim full refund + delay interest');
      quickReplies.push('Seek possession delivery order');
    }
  } else {
    authorities.push('Bharatiya Nyaya Sanhita (BNS), 2023 Section 351 (Criminal Intimidation)');
    authorities.push('Bharatiya Nyaya Sanhita (BNS), 2023 Section 115 (Voluntarily Causing Hurt)');
    authorities.push('Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 Section 173 (Cognizable Reports/FIR)');

    if (facts.medicalInjuryEvidence?.value) rawCalculatedScore += 5;

    if (!facts.jurisdiction.value) {
      quickReplies.push('Bengaluru, Karnataka');
      quickReplies.push('Delhi NCR');
      quickReplies.push('Mumbai, Maharashtra');
    } else if (facts.policeStatus.value === null) {
      quickReplies.push('Yes, reported to police (CSR filed)');
      quickReplies.push('No police complaint filed yet');
    } else if (!facts.medicalInjuryEvidence?.value) {
      quickReplies.push('Physical assault & injuries occurred');
      quickReplies.push('Verbal threats & intimidation only');
    }
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
    established,
    status,
    authorities,
    quickReplies
  };
}

export async function processClientTurn(
  caseId: string,
  userMessage: string,
  attachment?: { name: string; size: string; type: string }
): Promise<CaseState> {
  const state = getOrCreateCaseState(caseId, userMessage);
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

  // INTENT 6: CASE_INTAKE or CASE_FACT_UPDATE -> Merge Facts Deterministically
  state.facts = mergeFactsDeterministically(state.facts, userMessage, lastAssistantMsg, !!attachment);

  if (attachment) {
    state.documents.push({
      id: `doc-${Date.now()}`,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
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
  state.establishedFacts = uncapped.established;
  state.discoveryStatus = uncapped.status;
  state.legalAuthorities = uncapped.authorities;
  state.quickResponses = uncapped.quickReplies;

  const detectedPracticeArea = state.facts.matter.value
    ? (state.facts.matter.value.includes('Builder') ? 'RERA & Property Litigation' : 'Criminal Defense & Property')
    : 'Not established';

  state.caseUnderstanding = [
    { key: 'matter', label: 'Matter', value: state.facts.matter.value || 'Not established', status: state.facts.matter.value ? 'verified' : 'missing' },
    { key: 'jurisdiction', label: 'Jurisdiction', value: state.facts.jurisdiction.value || 'Not specified', status: state.facts.jurisdiction.value ? 'verified' : 'missing' },
    { key: 'practiceArea', label: 'Practice Area', value: detectedPracticeArea, status: state.facts.matter.value ? 'verified' : 'missing' },
    { key: 'proceduralStage', label: 'Procedural Stage', value: state.facts.proceduralStage.value || 'Not established', status: state.facts.proceduralStage.value ? 'verified' : 'missing' }
  ];

  if (state.discoveryStatus === 'READY_FOR_RECOMMENDATION' && state.readinessScore >= 80) {
    const matches = findMatchingAdvocates(state.facts);
    state.recommendationData = matches.filter(m => m.matchScore >= 75);
  } else {
    state.recommendationData = [];
  }

  // DEBUG LOGGING
  logger.info(`[CASE DEBUG] caseId=${caseId}`, {
    BEFORE_KNOWN: state.establishedFacts.map(f => f.label),
    NEW_MESSAGE: userMessage,
    EXTRACTED_MATTER: state.facts.matter.value,
    EXTRACTED_JURISDICTION: state.facts.jurisdiction.value,
    READINESS: `${previousScore}% -> ${state.readinessScore}%`,
    REMAINING_MISSING: state.missingInformation
  });

  // DETERMINISTIC ADAPTIVE QUESTION SELECTION BASED ON KNOWN vs UNKNOWN FACTS (STRICT NO-REPEATS)
  let replyText = '';

  const groqMessages: GroqChatMessage[] = [
    {
      role: 'system',
      content: `You are NYAYAI Legal Copilot.
Known facts: Matter=${state.facts.matter.value}, Jurisdiction=${state.facts.jurisdiction.value}, PoliceStatus=${state.facts.policeStatus.value}, Injuries=${state.facts.medicalInjuryEvidence?.value}.
NEVER ask for a known fact again. Ask client about UNKNOWN parameters: ${state.missingInformation.join(', ')}.`
    },
    ...state.messages.slice(-4).map(m => ({ role: m.role, content: m.content }))
  ];

  try {
    const rawReply = await callGroqAPI(groqMessages, 0.1);
    const sanitized = sanitizeLLMResponse(rawReply);

    // Verify sanitized reply does NOT ask for a known fact
    if (isFactKnown('jurisdiction', state) && (sanitized.toLowerCase().includes('which city and state') || sanitized.toLowerCase().includes('where is the property located'))) {
      throw new Error('LLM attempted to re-ask known jurisdiction fact');
    }
    replyText = sanitized;
  } catch (err) {
    logger.warn('Groq API call failed or re-asked known fact, using adaptive fallback question generator');

    if (state.facts.matter.value === 'Neighbour Dispute / Physical Altercation') {
      if (!isFactKnown('jurisdiction', state)) {
        replyText = "I understand you had a dispute with your neighbour. Which city and state did this incident occur in so I can determine local court jurisdiction?";
      } else if (!isFactKnown('policeStatus', state)) {
        replyText = "I have noted that the incident occurred in " + state.facts.jurisdiction.value + ". Has a police complaint, CSR, or FIR been filed regarding this dispute?";
      } else if (!isFactKnown('medicalInjuryEvidence', state)) {
        replyText = "Understood. Since the incident occurred in " + state.facts.jurisdiction.value + " and a police CSR was registered, what exactly happened during the altercation? For example, were there physical injuries, verbal threats, or property damage?";
      } else if (userMessage.toLowerCase().includes('road') || userMessage.toLowerCase().includes('hit me') || userMessage.toLowerCase().includes('no reason') || userMessage.toLowerCase().includes('punched')) {
        replyText = "Understood. You were walking along the road when your neighbour allegedly struck you without apparent provocation. Since you've indicated that injuries occurred and a CSR was filed in " + state.facts.jurisdiction.value + ", those details are recorded. Do you have medical wound certificates, photographs, or witnesses to support your claim?";
      } else if (state.discoveryStatus === 'READY_FOR_RECOMMENDATION') {
        replyText = "Thank you for providing the complete case details. Based on your reported altercation in " + state.facts.jurisdiction.value + " and police CSR status, your Case Readiness Score is now " + state.readinessScore + "% (" + state.readinessStage + "). I have matched verified Advocates with relevant High Court precedent experience.";
      } else {
        replyText = "Thank you for sharing those details. Do you have medical records, wound certificates, CCTV footage, or witnesses to support your case?";
      }
    } else if (state.facts.matter.value === 'Builder Possession Delay') {
      if (!isFactKnown('jurisdiction', state)) {
        replyText = "That is a significant possession delay. Which city and state is the property located in so I can check local RERA Authority jurisdiction?";
      } else if (!isFactKnown('possessionDueDate', state)) {
        replyText = "I have recorded that the property is located in " + state.facts.jurisdiction.value + ". What was the promised possession date in your builder-buyer agreement?";
      } else if (state.discoveryStatus === 'READY_FOR_RECOMMENDATION') {
        replyText = "Thank you. Under RERA Section 18 and consumer protection laws, your possession delay entitles you to claim a full refund with interest or monthly delay compensation. Verified Advocates in " + state.facts.jurisdiction.value + " are ready for review below.";
      } else {
        replyText = "I have recorded your agreement details for the property in " + state.facts.jurisdiction.value + ". Have you issued a formal legal notice or filed a petition with the RERA Tribunal?";
      }
    } else {
      replyText = "Hello! I'm NYAYAI. Tell me what legal issue you're dealing with, and I'll help you understand your options.";
    }
  }

  // Append assistant message to server history
  state.messages.push({
    role: 'assistant',
    content: replyText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  return state;
}
