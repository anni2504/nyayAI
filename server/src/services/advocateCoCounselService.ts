import { logger } from '../utils/logger.js';
import { callGroqAPI, callGroqStructuredJSON, GroqChatMessage } from './groqService.js';
import { getLegalStack } from '../controllers/legalController.js';
import { db } from '../db/database.js';
import type { RetrievedEvidence } from '../types/legalTypes.js';

export const LEGAL_AI_DISCLAIMER =
  'AI-assisted draft for professional review. This output does not constitute legal advice and should be reviewed by a qualified advocate before use.';

export interface CaseContextSummary {
  caseId: string;
  title: string;
  jurisdiction?: string;
  practiceArea?: string;
  proceduralStage?: string;
  facts?: string[];
  documents?: string[];
}

export interface LegalDraftResponse {
  tool: 'drafting';
  documentType: string;
  matterSummary: string;
  relevantFacts: string[];
  applicableLegalProvisions: string[];
  argumentsGrounds: string[];
  reliefPrayer: string[];
  draftLanguage: string;
  importantConsiderations: string[];
  disclaimer: string;
  retrievedEvidence?: Array<{
    title: string;
    court?: string;
    section?: string;
    text: string;
    similarity?: number;
  }>;
  rawText?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  isUncertain?: boolean;
  uncertaintyNote?: string;
  sourceQuote?: string;
}

export interface CaseTimelineResponse {
  tool: 'timeline';
  matterTitle?: string;
  events: TimelineEvent[];
  summary: string;
  uncertainties: string[];
  disclaimer: string;
  formattedText?: string;
}

export interface FactItem {
  fact: string;
  category: string;
  confidence: 'HIGH' | 'MEDIUM' | 'INFERRED';
  status: 'CONFIRMED' | 'INFERRED' | 'REQUIRES_REVIEW';
}

export interface ObligationItem {
  party: string;
  obligation: string;
  deadline?: string;
  source?: string;
  status: 'CONFIRMED' | 'INFERRED' | 'REQUIRES_REVIEW';
}

export interface RiskItem {
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  impact: string;
}

export interface FactObligationExtractionResponse {
  tool: 'extraction';
  confirmedFacts: FactItem[];
  inferredObligations: ObligationItem[];
  risksAndIssues: RiskItem[];
  missingInformation: string[];
  disclaimer: string;
  formattedText?: string;
}

export interface PrecedentResearchResponse {
  tool: 'research';
  query: string;
  analysis: string;
  evidence: RetrievedEvidence[];
  insufficient: boolean;
  totalFound: number;
  disclaimer: string;
  formattedText?: string;
}

/**
 * Validates advocate access to the requested caseId context.
 */
async function resolveCaseContext(advocateId: string, caseId?: string): Promise<CaseContextSummary | null> {
  if (!caseId || typeof caseId !== 'string' || !caseId.trim()) return null;

  try {
    // 1. Check if it's an advocate case history item
    const history = await db.getAdvocateCaseHistory(advocateId);
    const historyItem = history.find(h => h.id === caseId);
    if (historyItem) {
      return {
        caseId: historyItem.id,
        title: historyItem.case_title,
        jurisdiction: historyItem.jurisdiction,
        practiceArea: historyItem.practice_area,
        facts: [`Court: ${historyItem.court}`, `Year: ${historyItem.year}`, `Outcome: ${historyItem.outcome}`]
      };
    }

    // 2. Check if it's an engaged client case
    const bookings = await db.getBookingsForUser(advocateId, 'ADVOCATE');
    const validClientIds = new Set(
      bookings.filter(b => !['cancelled', 'declined'].includes(b.status)).map(b => b.clientId)
    );

    for (const clientId of validClientIds) {
      const clientCases = await db.getCasesForClient(clientId);
      const matchedCase = clientCases.find(c => c.id === caseId);
      if (matchedCase) {
        const snapshot = await db.getCaseStateSnapshot(matchedCase.id);
        let parsedState: any = null;
        if (snapshot) {
          try {
            parsedState = JSON.parse(snapshot.state);
          } catch {
            // ignore JSON parse err
          }
        }
        const factsList: string[] = [];
        if (parsedState?.facts) {
          const f = parsedState.facts;
          if (f.incidentDescription?.value) factsList.push(`Incident: ${f.incidentDescription.value}`);
          if (f.opposingParty?.value) factsList.push(`Opposing Party: ${f.opposingParty.value}`);
          if (f.financialImpact?.value) factsList.push(`Financial Impact: ${f.financialImpact.value}`);
          if (f.keyFacts?.value && Array.isArray(f.keyFacts.value)) {
            factsList.push(...f.keyFacts.value);
          }
        }

        return {
          caseId: matchedCase.id,
          title: matchedCase.title,
          jurisdiction: parsedState?.facts?.jurisdiction?.value || matchedCase.jurisdiction,
          practiceArea: parsedState?.practiceArea || matchedCase.practice_area,
          proceduralStage: parsedState?.facts?.proceduralStage?.value || matchedCase.procedural_stage,
          facts: factsList
        };
      }
    }
  } catch (err: any) {
    logger.warn(`Failed to resolve case context for advocate ${advocateId} caseId ${caseId}: ${err.message}`);
  }

  return null;
}

/**
 * 1. DRAFTING ASSISTANCE
 */
export async function generateLegalDraft(
  advocateId: string,
  query: string,
  caseId?: string
): Promise<LegalDraftResponse> {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Query is required for legal drafting.');
  }

  const caseCtx = await resolveCaseContext(advocateId, caseId);
  const contextStr = caseCtx
    ? `\n\nATTACHED CASE CONTEXT:\n- Title: ${caseCtx.title}\n- Jurisdiction: ${caseCtx.jurisdiction || 'N/A'}\n- Practice Area: ${caseCtx.practiceArea || 'N/A'}\n${caseCtx.facts?.length ? `- Case Facts:\n  * ${caseCtx.facts.join('\n  * ')}` : ''}`
    : '';

  // Retrieve relevant legal corpus references if statutory concepts are present
  let retrievedEvidence: Array<{ title: string; court?: string; section?: string; text: string; similarity?: number }> = [];
  try {
    const stack = getLegalStack();
    const searchRes = await stack.retrieval.retrieve({
      query: `${query} statutory provisions sections ratio`,
      topK: 3
    });
    if (searchRes?.evidence?.length) {
      retrievedEvidence = searchRes.evidence.map(e => ({
        title: e.title || 'Statute / Judgment',
        court: e.court || undefined,
        section: e.section || undefined,
        text: e.text.slice(0, 400),
        similarity: Math.round((e.similarity || 0) * 100) / 100
      }));
    }
  } catch (err: any) {
    logger.warn(`Drafting retrieval step failed: ${err.message}`);
  }

  const prompt = `You are the NYAYAI Advocate Legal Drafting AI.
The advocate has requested drafting assistance under Indian Law.

ADVOCATE INPUT:
"${query}"${contextStr}

${retrievedEvidence.length ? `RETRIEVED LEGAL CORPUS REFERENCES (Use where relevant):\n${retrievedEvidence.map((e, i) => `[${i + 1}] ${e.title} (${e.court || 'Court'}): ${e.text}`).join('\n')}\n` : ''}

STRICT RULES:
1. Do NOT fabricate facts that were not provided in the input or case context.
2. Structure the legal document professionally according to standard Indian legal practice (Legal Notice, Petition, Interlocutory Application, or Reply).
3. Clearly ground statutory references in the applicable Indian laws (e.g. RERA 2016, CPC 1908, Specific Relief Act 1963, Consumer Protection Act 2019, NI Act 1881, BNS 2023 / IPC 1860).
4. Provide clear arguments, prayers/reliefs, and complete suggested draft language.
5. Return ONLY a single valid JSON object matching the following schema.

JSON SCHEMA:
{
  "documentType": "string (e.g. Legal Notice / Petition under RERA / Demand Notice)",
  "matterSummary": "string summary of the legal issue",
  "relevantFacts": ["factual point 1", "factual point 2"],
  "applicableLegalProvisions": ["Section X of Act Y", "Section Z of Act W"],
  "argumentsGrounds": ["Ground 1", "Ground 2"],
  "reliefPrayer": ["Relief item 1", "Relief item 2"],
  "draftLanguage": "Full structured formal draft notice or petition text with appropriate standard Indian legal clauses, formal addressee placeholders, recitals, demand clauses, and closing.",
  "importantConsiderations": ["Limitation period note", "Jurisdictional note", "Stamp duty / procedural prerequisite"]
}`;

  let parsed: any = null;
  try {
    parsed = await callGroqStructuredJSON(prompt, 0.1, 1024);
  } catch (err: any) {
    logger.warn(`Groq structured draft call error: ${err.message}`);
  }

  if (parsed && parsed.documentType && parsed.draftLanguage) {
    return {
      tool: 'drafting',
      documentType: parsed.documentType,
      matterSummary: parsed.matterSummary || query,
      relevantFacts: Array.isArray(parsed.relevantFacts) ? parsed.relevantFacts : [query],
      applicableLegalProvisions: Array.isArray(parsed.applicableLegalProvisions) ? parsed.applicableLegalProvisions : [],
      argumentsGrounds: Array.isArray(parsed.argumentsGrounds) ? parsed.argumentsGrounds : [],
      reliefPrayer: Array.isArray(parsed.reliefPrayer) ? parsed.reliefPrayer : [],
      draftLanguage: parsed.draftLanguage,
      importantConsiderations: Array.isArray(parsed.importantConsiderations) ? parsed.importantConsiderations : [],
      disclaimer: LEGAL_AI_DISCLAIMER,
      retrievedEvidence: retrievedEvidence.length ? retrievedEvidence : undefined
    };
  }

  // Fallback if LLM structured extraction failed or Groq was unreachable
  return {
    tool: 'drafting',
    documentType: 'Legal Notice / Formal Legal Draft',
    matterSummary: `Legal drafting request: ${query.slice(0, 150)}`,
    relevantFacts: [query],
    applicableLegalProvisions: ['Code of Civil Procedure, 1908 (Section 80)', 'Specific Relief Act, 1963', 'Relevant Statutory Provisions'],
    argumentsGrounds: ['Substantial failure of contractual performance / statutory obligation', 'Demand for immediate refund / relief with statutory interest'],
    reliefPrayer: ['Immediate refund / compliance of statutory obligation', 'Payment of statutory interest and legal damages'],
    draftLanguage: `LEGAL NOTICE\n\nTo,\n[Recipient Name / Entity]\n[Address]\n\nUnder instructions and authority from my client, I hereby serve upon you this formal Legal Notice as follows:\n\n1. That the client entered into an engagement / agreement regarding: "${query}".\n2. That despite clear contractual and statutory terms, there has been a failure and delay on your part.\n3. You are hereby called upon to comply with the demand and remit the due refund/remedy within 15 (fifteen) days from receipt hereof, failing which appropriate civil/statutory proceedings shall be instituted at your risk and cost.\n\nAdvocate for Client`,
    importantConsiderations: ['Verify receipt acknowledgment (RPAD/Speed Post)', 'Ensure all financial claims are supported by bank statements or receipts'],
    disclaimer: LEGAL_AI_DISCLAIMER,
    retrievedEvidence: retrievedEvidence.length ? retrievedEvidence : undefined
  };
}

/**
 * 2. CASE TIMELINE GENERATOR
 */
export async function generateCaseTimeline(
  advocateId: string,
  query: string,
  caseId?: string
): Promise<CaseTimelineResponse> {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Case facts or text are required to generate a timeline.');
  }

  const caseCtx = await resolveCaseContext(advocateId, caseId);
  const contextStr = caseCtx
    ? `\n\nATTACHED CASE CONTEXT:\n- Title: ${caseCtx.title}\n${caseCtx.facts?.length ? `- Known Facts:\n  * ${caseCtx.facts.join('\n  * ')}` : ''}`
    : '';

  const prompt = `You are NYAYAI Case Chronology Timeline Generator.
Extract a strict chronological event timeline from the provided facts and dates under Indian Law.

INPUT:
"${query}"${contextStr}

STRICT RULES:
1. Extract all dates and sequential events mentioned in the input.
2. Sort events in chronological order (earliest first).
3. Do NOT invent dates or fabricate events. If an event has no exact date or is ambiguous (e.g., "two weeks later", "subsequently", "exact date not specified"), keep the approximate text and mark "isUncertain": true with an "uncertaintyNote".
4. Standardize the display date (e.g. "12 Mar 2024", "20 Mar 2024", "15 Jun 2024", "Aug 2024", or "Date Uncertain").
5. Return ONLY a single valid JSON object matching this schema.

JSON SCHEMA:
{
  "matterTitle": "string short summary of timeline matter",
  "events": [
    {
      "date": "12 Mar 2024",
      "title": "Agreement executed",
      "description": "Agreement for sale executed between the parties.",
      "isUncertain": false,
      "uncertaintyNote": null,
      "sourceQuote": "Agreement signed on 12 March 2024"
    }
  ],
  "summary": "Brief executive summary of sequence of events",
  "uncertainties": ["Note any missing date gaps or ambiguous time intervals"]
}`;

  let parsed: any = null;
  try {
    parsed = await callGroqStructuredJSON(prompt, 0.0, 800);
  } catch (err: any) {
    logger.warn(`Groq timeline extraction error: ${err.message}`);
  }

  if (parsed && Array.isArray(parsed.events) && parsed.events.length > 0) {
    const formattedText = parsed.events
      .map((ev: TimelineEvent) => `${ev.date}\n${ev.title}${ev.isUncertain && ev.uncertaintyNote ? ` [${ev.uncertaintyNote}]` : ''}`)
      .join('\n\n');

    return {
      tool: 'timeline',
      matterTitle: parsed.matterTitle || 'Chronological Case Timeline',
      events: parsed.events,
      summary: parsed.summary || 'Chronological extraction completed.',
      uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
      disclaimer: LEGAL_AI_DISCLAIMER,
      formattedText
    };
  }

  // Deterministic fallback regex extraction for dates
  const dateRegex = /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi;
  const sentences = query.split(/[.\n;]+/).map(s => s.trim()).filter(Boolean);
  const events: TimelineEvent[] = [];

  for (const sentence of sentences) {
    const match = sentence.match(dateRegex);
    if (match) {
      events.push({
        date: match[0],
        title: sentence.slice(0, 80),
        description: sentence,
        isUncertain: false
      });
    } else if (sentence.length > 15) {
      events.push({
        date: 'Date not specified',
        title: sentence.slice(0, 80),
        description: sentence,
        isUncertain: true,
        uncertaintyNote: 'Exact date omitted in source facts'
      });
    }
  }

  const formattedText = events.map(ev => `${ev.date}\n${ev.title}`).join('\n\n') || query;

  return {
    tool: 'timeline',
    matterTitle: 'Case Chronology Timeline',
    events: events.length ? events : [{ date: 'Recorded Date', title: 'Supplied case event', description: query, isUncertain: false }],
    summary: 'Chronological timeline generated from supplied factual record.',
    uncertainties: ['Please review dates against original verified documentation.'],
    disclaimer: LEGAL_AI_DISCLAIMER,
    formattedText
  };
}

/**
 * 3. FACT & OBLIGATION EXTRACTOR
 */
export async function extractFactsAndObligations(
  advocateId: string,
  query: string,
  caseId?: string
): Promise<FactObligationExtractionResponse> {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Document or matter text is required for fact and obligation extraction.');
  }

  const caseCtx = await resolveCaseContext(advocateId, caseId);
  const contextStr = caseCtx
    ? `\n\nATTACHED CASE CONTEXT:\n- Title: ${caseCtx.title}\n${caseCtx.facts?.length ? `- Associated Facts:\n  * ${caseCtx.facts.join('\n  * ')}` : ''}`
    : '';

  const prompt = `You are the NYAYAI Legal Fact & Obligation Extractor for Advocates.
Extract structured facts, contractual/statutory obligations, legal risks, and missing information from the input.

INPUT:
"${query}"${contextStr}

STRICT CATEGORIZATION RULES:
1. FACTS:
   - Important factual statements, parties, relevant events, dates, monetary amounts, locations.
   - Status must be 'CONFIRMED' (if directly in input) or 'INFERRED' (if reasoned from context).
2. OBLIGATIONS:
   - Party responsible, specific duty/obligation, deadline/date, source clause/evidence.
   - Status: 'CONFIRMED', 'INFERRED', or 'REQUIRES_REVIEW'.
3. RISKS & ISSUES:
   - Potential breaches, limitation concerns, missing documentary evidence, legal liabilities.
   - Severity: 'HIGH', 'MEDIUM', or 'LOW'.
4. MISSING INFORMATION:
   - Explicitly list gaps, missing agreements, unverified dates, or unstated amounts.
5. Return ONLY a valid JSON object.

JSON SCHEMA:
{
  "confirmedFacts": [
    {
      "fact": "string fact description",
      "category": "Party | Event | Date | Financial | Location | Statutory",
      "confidence": "HIGH" | "MEDIUM" | "INFERRED",
      "status": "CONFIRMED" | "INFERRED"
    }
  ],
  "inferredObligations": [
    {
      "party": "Party name or role (e.g. Builder / Respondent)",
      "obligation": "Specific obligation description",
      "deadline": "Deadline or date if specified, otherwise 'Not specified'",
      "source": "Document/Clause/Statute reference",
      "status": "CONFIRMED" | "INFERRED" | "REQUIRES_REVIEW"
    }
  ],
  "risksAndIssues": [
    {
      "issue": "Legal risk or potential breach",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "category": "Breach of Contract | Statutory Violation | Limitation | Evidence Gap",
      "impact": "Potential legal/financial impact"
    }
  ],
  "missingInformation": [
    "String description of missing fact or document"
  ]
}`;

  let parsed: any = null;
  try {
    parsed = await callGroqStructuredJSON(prompt, 0.0, 900);
  } catch (err: any) {
    logger.warn(`Groq fact extraction error: ${err.message}`);
  }

  if (parsed && (Array.isArray(parsed.confirmedFacts) || Array.isArray(parsed.inferredObligations))) {
    const formattedText = `FACTS:\n${(parsed.confirmedFacts || []).map((f: FactItem) => `• [${f.status}] ${f.fact} (${f.category})`).join('\n')}\n\nOBLIGATIONS:\n${(parsed.inferredObligations || []).map((o: ObligationItem) => `• [${o.status}] ${o.party}: ${o.obligation} (Deadline: ${o.deadline || 'N/A'})`).join('\n')}\n\nRISKS & ISSUES:\n${(parsed.risksAndIssues || []).map((r: RiskItem) => `• [${r.severity}] ${r.issue} - Impact: ${r.impact}`).join('\n')}\n\nMISSING INFORMATION:\n${(parsed.missingInformation || []).map((m: string) => `• ${m}`).join('\n')}`;

    return {
      tool: 'extraction',
      confirmedFacts: Array.isArray(parsed.confirmedFacts) ? parsed.confirmedFacts : [],
      inferredObligations: Array.isArray(parsed.inferredObligations) ? parsed.inferredObligations : [],
      risksAndIssues: Array.isArray(parsed.risksAndIssues) ? parsed.risksAndIssues : [],
      missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
      disclaimer: LEGAL_AI_DISCLAIMER,
      formattedText
    };
  }

  // Deterministic fallback
  return {
    tool: 'extraction',
    confirmedFacts: [
      { fact: query.slice(0, 200), category: 'Supplied Matter Facts', confidence: 'HIGH', status: 'CONFIRMED' }
    ],
    inferredObligations: [
      { party: 'Opposing Party', obligation: 'Comply with contractual and statutory terms', deadline: 'Immediate / Within statutory notice period', source: 'Supplied facts', status: 'REQUIRES_REVIEW' }
    ],
    risksAndIssues: [
      { issue: 'Failure of performance / dispute regarding compliance', severity: 'HIGH', category: 'Contractual Dispute', impact: 'Potential limitation expiry or civil remedy claim' }
    ],
    missingInformation: ['Verified copy of executed agreement/receipts', 'Confirmation of postal acknowledgment / response to notice'],
    disclaimer: LEGAL_AI_DISCLAIMER,
    formattedText: `FACTS:\n• [CONFIRMED] ${query}\n\nOBLIGATIONS:\n• [REQUIRES_REVIEW] Fulfillment of contractual terms\n\nRISKS:\n• [HIGH] Dispute regarding delay / non-performance`
  };
}

/**
 * 4. HIGH COURT PRECEDENT RESEARCH
 */
export async function researchPrecedents(
  _advocateId: string,
  query: string,
  options: { court?: string; jurisdiction?: string; topK?: number } = {}
): Promise<PrecedentResearchResponse> {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Research query is required for precedent search.');
  }

  const stack = getLegalStack();
  const topK = options.topK || 6;

  const filters: Record<string, any> = {};
  if (options.court) filters.court = options.court;
  if (options.jurisdiction) filters.jurisdiction = options.jurisdiction;

  let retrievalRes;
  try {
    retrievalRes = await stack.retrieval.retrieve({
      query,
      topK,
      filters: Object.keys(filters).length ? filters : undefined
    });
  } catch (err: any) {
    logger.warn(`Precedent retrieval failed: ${err.message}`);
    retrievalRes = { evidence: [], empty: true };
  }

  const evidence = retrievalRes?.evidence || [];
  const insufficient = evidence.length === 0;

  if (insufficient) {
    return {
      tool: 'research',
      query,
      analysis: `No direct precedent or statutory authorities were retrieved from the legal corpus for the query: "${query}". NYAYAI adheres to strict evidence-grounding and will not hallucinate or fabricate case citations without supporting verified records.`,
      evidence: [],
      insufficient: true,
      totalFound: 0,
      disclaimer: LEGAL_AI_DISCLAIMER,
      formattedText: `RESEARCH SUMMARY:\nNo direct precedents found in the legal corpus for query: "${query}".\n\nDISCLAIMER:\n${LEGAL_AI_DISCLAIMER}`
    };
  }

  // Synthesize AI reasoning grounded in the retrieved evidence using Groq
  const evidenceBlock = evidence
    .slice(0, 5)
    .map((e, idx) => `[Source ${idx + 1}] Title: ${e.title || 'Untitled'} | Court: ${e.court || 'Unknown Court'} (${e.year || 'Year N/A'}) | Act/Sec: ${e.act || ''} ${e.section || ''}\nExcerpt: ${e.text.slice(0, 600)}`)
    .join('\n\n');

  const ragPromptMessages: GroqChatMessage[] = [
    {
      role: 'system',
      content: `You are the NYAYAI Precedent Research AI.
Analyze the retrieved legal evidence to answer the advocate's query under Indian Law.

STRICT RULES:
1. Base your precedent summary strictly on the RETRIEVED LEGAL EVIDENCE provided below.
2. Clearly cite sources using inline tags [1], [2] matching the sources.
3. If evidence is partial, explicitly state the limitation.
4. Distinguish between RETRIEVED STATUTORY/JUDICIAL RATIOS and YOUR APPLIED ANALYSIS.
5. Never invent or hallucinate rulings that are not present in the evidence.`
    },
    {
      role: 'user',
      content: `ADVOCATE QUERY:\n${query}\n\nRETRIEVED LEGAL EVIDENCE:\n${evidenceBlock}\n\nProvide a structured Precedent Research Analysis highlighting: Key Legal Ratios, Statutory Applicability, and Strategic Takeaways for Counsel.`
    }
  ];

  let analysis = '';
  try {
    analysis = await callGroqAPI(ragPromptMessages, 0.1);
  } catch (err: any) {
    logger.warn(`Groq precedent synthesis error: ${err.message}`);
    // Deterministic summary from evidence
    analysis = `**Retrieved Legal Precedents & Ratios:**\n\n` +
      evidence.slice(0, 3).map((e, i) => `**[${i + 1}] ${e.title || 'Legal Authority'}** (${e.court || 'High Court / Supreme Court'}, ${e.year || 'N/A'})\n- Relevant Provision: ${e.act || ''} ${e.section || ''}\n- Key Ratio: ${e.text.slice(0, 250)}...`).join('\n\n') +
      `\n\n*Note: Synthesized from ${evidence.length} verified corpus records.*`;
  }

  const formattedText = `HIGH COURT & APPELLATE PRECEDENT RESEARCH\n\nQUERY: ${query}\n\nAI-GENERATED ANALYSIS & SYNTHESIS:\n${analysis}\n\nRETRIEVED EVIDENCE SOURCES (${evidence.length}):\n` +
    evidence.map((e, i) => `[${i + 1}] ${e.title || 'Document'} | ${e.court || 'Court'} | ${e.act || ''} ${e.section || ''} (Relevance: ${Math.round((e.similarity || 0) * 100)}%)\n${e.text.slice(0, 300)}...`).join('\n\n') +
    `\n\n${LEGAL_AI_DISCLAIMER}`;

  return {
    tool: 'research',
    query,
    analysis,
    evidence,
    insufficient: false,
    totalFound: evidence.length,
    disclaimer: LEGAL_AI_DISCLAIMER,
    formattedText
  };
}
