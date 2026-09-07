import type {
  CaseFacts,
  FactValue,
  ExtractedFacts
} from '../types/index.js';
import { callGroqStructuredJSON } from './groqService.js';
import { logger } from '../utils/logger.js';

// Generalized Indian city-to-state mapping for jurisdiction extraction.
// Used when the user provides a city name; we reliably map it to a state
// without inventing uncertain mappings. Only well-established mappings are included.
const CITY_TO_STATE_MAP: Record<string, string> = {
  jaipur: 'Rajasthan',
  jaipuria: 'Rajasthan',
  ajmer: 'Rajasthan',
  jodhpur: 'Rajasthan',
  udaipur: 'Rajasthan',
  lucknow: 'Uttar Pradesh',
  kanpur: 'Uttar Pradesh',
  varanasi: 'Uttar Pradesh',
  ghaziabad: 'Uttar Pradesh',
  agra: 'Uttar Pradesh',
  gwalior: 'Madhya Pradesh',
  indore: 'Madhya Pradesh',
  jabalpur: 'Madhya Pradesh',
  bhopal: 'Madhya Pradesh',
  chandigarh: 'Chandigarh',
  mohali: 'Punjab',
  ludhiana: 'Punjab',
  amritsar: 'Punjab',
  jalandhar: 'Punjab',
  delhi: 'Delhi',
  ncr: 'Delhi',
  mumbai: 'Maharashtra',
  pune: 'Maharashtra',
  bangalore: 'Karnataka',
  bengaluru: 'Karnataka',
  mysore: 'Karnataka',
  hubballi: 'Karnataka',
  belgaum: 'Karnataka',
  chennai: 'Tamil Nadu',
  coimbatore: 'Tamil Nadu',
  madurai: 'Tamil Nadu',
  trichy: 'Tamil Nadu',
  hyderabad: 'Telangana',
  secunderabad: 'Telangana',
  Vijayawada: 'Andhra Pradesh',
  Visakhapatnam: 'Andhra Pradesh',
  Vijayanagar: 'Andhra Pradesh',
  Bhubaneswar: 'Odisha',
  Cuttack: 'Odisha',
};

// Helper: extract city and state from a lowercased text snippet.
// Returns { city, state } where either may be null.
function extractCityStateFromText(clean: string): { city: string | null; state: string | null } {
  let city: string | null = null;
  let state: string | null = null;

  // 1. Explicit "City, State" pattern (e.g. "Jaipur, Rajasthan" / "jaipur, rajasthan")
  const cityStateMatch = clean.match(
    /^([a-zA-Z\s]+?),\s*([a-zA-Z\s]+?)$/
  );
  if (cityStateMatch) {
    const rawCity = cityStateMatch[1].trim();
    const rawState = cityStateMatch[2].trim();
    // Check if rawState is a known state name
    const knownStates = [
      'maharashtra', 'karnataka', 'delhi', 'rajasthan', 'tamil nadu',
      'telangana', 'andhra pradesh', 'uttar pradesh', 'madhya pradesh',
      'punjab', 'chandigarh', 'odisha', 'west bengal', 'gujarat',
      'kerala', 'west bengal', 'haryana', 'himachal pradesh',
      'jammu and kashmir', 'ladakh', 'chhattisgarh', 'jharkhand',
      'sikkim', 'arunachal pradesh', 'meghalaya', 'mizoram',
      'nagaland', 'manipur', 'Tripura', 'Meghalaya'
    ];
    const stateLower = rawState.toLowerCase();
    if (knownStates.includes(stateLower)) {
      state = rawState;
      // Try to look up city in our mapping
      const mappedState = CITY_TO_STATE_MAP[rawCity.toLowerCase()];
      if (mappedState && mappedState.toLowerCase() !== stateLower) {
        // City maps to a different state than explicitly stated — keep explicit state
        // but record the city mapping for reference; we keep the explicit state
      } else {
        city = rawCity;
      }
    } else if (CITY_TO_STATE_MAP[rawCity.toLowerCase()]) {
      // Known city maps to a state; use the mapped state
      state = CITY_TO_STATE_MAP[rawCity.toLowerCase()];
      city = rawCity;
    } else {
      // Neither city nor state is recognized — return null for both
      city = null;
      state = null;
    }
    return { city, state };
  }

  // 2. City-only: check if any known city appears in the text
  for (const [knownCity, knownState] of Object.entries(CITY_TO_STATE_MAP)) {
    if (clean.includes(knownCity)) {
      city = knownCity;
      state = knownState;
      break;
    }
  }

  // 3. State-only: check for explicit state names in the text
  const statePatterns = [
    /\bmaharashtra\b/, /\bkarnataka\b/, /\bdelhi\b/, /\bdelhi ncr\b/, /\brajasthan\b/,
    /\btamil nadu\b/, /\btelangana\b/, /\bandhra pradesh\b/, /\buttar pradesh\b/,
    /\bmadhya pradesh\b/, /\bpunjab\b/, /\bchandigarh\b/, /\bodisha\b/, /\bwest bengal\b/,
    /\bgujarat\b/, /\bkerala\b/, /\bharyana\b/, /\bbihar\b/, /\bjharkhand\b/,
    /\bchhattisgarh\b/, /\bsikkim\b/, /\bhimachal pradesh\b/, /\bunion territory\b/
  ];
  for (const pattern of statePatterns) {
    if (pattern.test(clean)) {
      // Extract the state name that matched
      const stateMatch = clean.match(pattern);
      if (stateMatch) {
        state = stateMatch[0];
        break;
      }
    }
  }

  // 4. If only city is found (without state) and the city maps to a known state, attach the state
  if (city && !state) {
    const mapped = CITY_TO_STATE_MAP[city.toLowerCase()];
    if (mapped) {
      state = mapped;
    }
  }

  return { city: city || null, state: state || null };
}

// Record city/state into the extraction output, respecting existing values.
function recordCityState(out: ExtractedFacts, city: string | null, state: string | null, existing: CaseFacts) {
  if (city && !existing.city?.value) out.city = city;
  if (state && !existing.state?.value) out.state = state;
  // Always refresh jurisdiction when city or state is set
  if (city || state) {
    const s = (out.state ?? existing.state?.value) || 'Unknown State';
    const c = (out.city ?? existing.city?.value) || 'Unknown City';
    out.jurisdiction = `${s} (${c})`;
  }
}

/**
 * Deterministic fallback used when the LLM extraction service is unavailable
 * (no Groq key, network error, or non-JSON output). Handles the most common
 * short-answer / keyword patterns so the intake never blocks, but keeps the
 * same structured output shape the LLM would produce.
 */
function deterministicExtract(
  text: string,
  existing: CaseFacts,
  lastAssistantMsg?: string
): ExtractedFacts {
  const clean = text.trim().toLowerCase();
  const out: ExtractedFacts = { confidence: 0.6, correction: {} };
  const recordIfNew = (field: keyof CaseFacts, value: any) => { out[field] = value; };
  const recordCorrection = (field: keyof CaseFacts, value: any) => { out.correction![field] = value; };

  // Detect explicit corrections: "Actually X", "No, X", "Correction: X", "It was X"
  const isCorrection = /^actually\b|^no,?\s|^correction:?\s|^it was\s/i.test(clean);
  const correctionTarget = clean.replace(/^(actually|no|correction)\b,?\s*/i, '').trim();

  // --- GENERALIZED CITY/STATE EXTRACTION (runs regardless of matter type) ---
  // This extracts explicit "City, State", known cities, and state names from
  // every incoming user message, independent of the current matter or question.
  // The extracted values respect existing case state (won't overwrite known facts).
  const { city: extractedCity, state: extractedState } = extractCityStateFromText(clean);
  if (extractedCity || extractedState) {
    recordCityState(out, extractedCity, extractedState, existing);
  }

  const markLocation = (stateName: string, cityName: string) => {
    const hasState = !!existing.state?.value;
    const hasCity = !!existing.city?.value;
    if (!hasState) recordIfNew('state', stateName);
    if (!hasCity) recordIfNew('city', cityName);
    if (!existing.jurisdiction?.value) recordIfNew('jurisdiction', `${stateName} (${cityName})`);
  };

  if (/\bpune\b|maharashtra/.test(clean)) {
    if (isCorrection && correctionTarget) {
      recordCorrection('state', 'Maharashtra');
      recordCorrection('city', 'Pune');
      recordCorrection('jurisdiction', 'Maharashtra (Pune)');
    } else {
      out.state = 'Maharashtra';
      out.city = 'Pune';
      if (!existing.jurisdiction?.value) out.jurisdiction = 'Maharashtra (Pune)';
    }
  } else if (/\bbengaluru\b|bangalore|karnataka/.test(clean)) {
    if (isCorrection && correctionTarget) {
      recordCorrection('state', 'Karnataka');
      recordCorrection('city', 'Bengaluru');
      recordCorrection('jurisdiction', 'Karnataka (Bengaluru)');
    } else {
      out.state = 'Karnataka';
      out.city = 'Bengaluru';
      if (!existing.jurisdiction?.value) out.jurisdiction = 'Karnataka (Bengaluru)';
    }
  } else if (/\bdelhi\b|\bncr\b/.test(clean)) {
    if (isCorrection && correctionTarget) {
      recordCorrection('state', 'Delhi');
      recordCorrection('city', 'Delhi');
      recordCorrection('jurisdiction', 'Delhi NCR');
    } else {
      out.state = 'Delhi';
      out.city = /ncr/.test(clean) ? 'NCR' : 'Delhi';
      if (!existing.jurisdiction?.value) out.jurisdiction = 'Delhi NCR';
    }
  } else if (/\bmumbai\b/.test(clean)) {
    if (isCorrection && correctionTarget) {
      recordCorrection('state', 'Maharashtra');
      recordCorrection('city', 'Mumbai');
      recordCorrection('jurisdiction', 'Maharashtra (Mumbai)');
    } else {
      out.state = 'Maharashtra';
      out.city = 'Mumbai';
      if (!existing.jurisdiction?.value) out.jurisdiction = 'Maharashtra (Mumbai)';
    }
  }

  const last = lastAssistantMsg ? lastAssistantMsg.toLowerCase() : '';

  // Handle short answers to previous questions FIRST (context-dependent)
  if (clean === 'yes' || clean === 'yes.' || clean === 'ya' || clean === 'yup' || clean === 'yeah') {
    const isPoliceQuestion = /police|csr|fir|complaint|reported/i.test(last);
    const isInjuryQuestion = /injured|injur|assault|hit|medical|hurt/i.test(last);
    const isAgreementQuestion = /agreement|contract|possession|sale/i.test(last);
    if (isPoliceQuestion) out.policeStatus = true;
    if (isInjuryQuestion) out.medicalInjuryEvidence = 'Physical violence / injuries occurred';
    if (isAgreementQuestion) out.agreementDetails = 'Sale / Possession Agreement documented';
    return out;
  } else if (clean === 'no' || clean === 'no.' || clean === 'not yet' || clean.startsWith('not yet')) {
    const isPoliceQuestion = /police|csr|fir|complaint|reported/i.test(last);
    if (isPoliceQuestion) out.policeStatus = 'NONE';
    return out;
  }

  if (/\bpune\b|maharashtra/.test(clean)) {
    if (isCorrection && correctionTarget) {
      recordCorrection('state', 'Maharashtra');
      recordCorrection('city', 'Pune');
      recordCorrection('jurisdiction', 'Maharashtra (Pune)');
    } else {
      out.state = 'Maharashtra';
      out.city = 'Pune';
      if (!existing.jurisdiction?.value) out.jurisdiction = 'Maharashtra (Pune)';
    }
  } else if (/\bbengaluru\b|bangalore|karnataka/.test(clean)) {
    if (isCorrection && correctionTarget) {
      recordCorrection('state', 'Karnataka');
      recordCorrection('city', 'Bengaluru');
      recordCorrection('jurisdiction', 'Karnataka (Bengaluru)');
    } else {
      out.state = 'Karnataka';
      out.city = 'Bengaluru';
      if (!existing.jurisdiction?.value) out.jurisdiction = 'Karnataka (Bengaluru)';
    }
  } else if (/\bdelhi\b|\bncr\b/.test(clean)) {
    if (isCorrection && correctionTarget) {
      recordCorrection('state', 'Delhi');
      recordCorrection('city', 'Delhi');
      recordCorrection('jurisdiction', 'Delhi NCR');
    } else {
      out.state = 'Delhi';
      out.city = /ncr/.test(clean) ? 'NCR' : 'Delhi';
      if (!existing.jurisdiction?.value) out.jurisdiction = 'Delhi NCR';
    }
  } else if (/\bmumbai\b/.test(clean)) {
    if (isCorrection && correctionTarget) {
      recordCorrection('state', 'Maharashtra');
      recordCorrection('city', 'Mumbai');
      recordCorrection('jurisdiction', 'Maharashtra (Mumbai)');
    } else {
      out.state = 'Maharashtra';
      out.city = 'Mumbai';
      if (!existing.jurisdiction?.value) out.jurisdiction = 'Maharashtra (Mumbai)';
    }
  }

  // Injury/threat detection (works standalone, not just in neighbour context)
  if (/minor injur/.test(clean)) {
    out.medicalInjuryEvidence = 'Minor injuries';
  }
  if (/hit me|punched|slapped|struck|physical|assault|violence/.test(clean)) {
    out.medicalInjuryEvidence = 'Physical violence / injuries occurred';
  }

  // Matter detection — general keyword categories (LLM is primary, this is fallback)
  if (/fight|assault|neighbour|neighbor|dispute|boundary|altercation|hit me|punched|slapped|physical|road|walking/.test(clean)) {
    out.matter = 'Neighbour Dispute / Physical Altercation';
  } else if (/builder|flat|possession|rera|deliver|handover|apartment/.test(clean)) {
    out.matter = 'Builder Possession Delay';
  } else if (/landlord|deposit|rent|tenant|eviction|security deposit/.test(clean)) {
    out.matter = 'Tenant Security Deposit Dispute';
  } else if (/employer|salary|wage|terminat|dismiss|unpaid|overtime|final settlement|pay slip|provident fund|gratuity|notice period|employment|labour|workplace|job/.test(clean)) {
    out.matter = 'Employment / Labour Dispute';
  } else if (/contractor|work|incomplete|unfinished|renovation|construction|paid.*work|advance|material/.test(clean)) {
    out.matter = 'Contractor / Service Dispute';
  } else if (/insurance|claim|denied|rejected|policy|coverage|settlement|premium|insurer/.test(clean)) {
    out.matter = 'Insurance Dispute';
  } else if (/consumer|product|service|refund|warranty|defective|misleading|advertis|e-commerce|online purchase|ordered|damaged|seller|delivered|wrong|received|bought|purchase|fake|counterfeit|faulty|broken|replacement/.test(clean)) {
    out.matter = 'Consumer Dispute';
  } else if (/property|real estate|title|deed|partition|inheritance|will|probate|land|plot/.test(clean)) {
    out.matter = 'Property / Title Dispute';
  } else if (/cheque|bounce|negotiable instrument|ni act|section 138|dishonor/.test(clean)) {
    out.matter = 'Cheque Bounce / NI Act';
  } else if (/domestic violence|dowry|498a|maintenance|divorce|custody|marriage|family/.test(clean)) {
    out.matter = 'Family / Matrimonial Dispute';
  } else if (/cyber|online fraud|phishing|identity theft|data breach|hack|digital/.test(clean)) {
    out.matter = 'Cyber Crime / Digital Fraud';
  } else if (/defamation|reputation|libel|slander|social media/.test(clean)) {
    out.matter = 'Defamation / Reputation';
  } else if (/arbitration|mediation|conciliation|adr/.test(clean)) {
    out.matter = 'Arbitration / ADR';
  } else if (/tax|gst|income tax|penalty|assessment|notice|return/.test(clean)) {
    out.matter = 'Tax / GST Dispute';
  } else if (/criminal|fir|police|arrest|bail|anticipatory|section|ipc|bns|bnss|offence|charge|accused|victim/.test(clean)) {
    out.matter = 'Criminal Matter';
  }

  // Opposing party extraction (based on matter type / keywords)
  if (!out.opposingParty) {
    if (/insurer|insurance company|insurance/.test(clean)) out.opposingParty = 'Insurance Company';
    else if (/employer|company|boss|manager|hr|organization/.test(clean)) out.opposingParty = 'Employer / Company';
    else if (/landlord|owner|landlady/.test(clean)) out.opposingParty = 'Landlord';
    else if (/builder|developer|contractor|contractor|vendor/.test(clean)) out.opposingParty = 'Builder / Contractor';
    else if (/bank|financial institution|nbfc/.test(clean)) out.opposingParty = 'Bank / Financial Institution';
    else if (/seller|vendor|merchant|shop|store|e-commerce|platform/.test(clean)) out.opposingParty = 'Seller / Vendor';
    else if (/neighbour|neighbor/.test(clean)) out.opposingParty = 'Neighbour';
    else if (/spouse|husband|wife|partner|family/.test(clean)) out.opposingParty = 'Spouse / Family Member';
    else if (/police|accused|prosecution/.test(clean)) out.opposingParty = 'State / Prosecution';
    else if (/doctor|hospital|clinic|medical/.test(clean)) out.opposingParty = 'Medical Professional / Hospital';
  }

  // Police status from explicit statements
  const policeStatusPattern = /\b(fir|csr|police complaint|complaint)\b[^.!?]*\bfiled\b|\bfiled\b[^.!?]*\b(fir|csr|police complaint)\b|reported (it )?to police|reported to police/i;
  if (policeStatusPattern.test(clean)) {
    out.policeStatus = true;
  } else if (/no police|havent? reported|no fir|not reported/i.test(clean)) {
    out.policeStatus = 'NONE';
  }

  // Evidence detection
  if (/cctv|medical|witness|photo|video|document|certificate/i.test(clean)) {
    const list: string[] = [];
    if (/cctv|video/.test(clean)) list.push('CCTV footage');
    if (/medical|certificate/.test(clean)) list.push('Medical certificate');
    if (/witness/.test(clean)) list.push('Witness');
    if (/photo/.test(clean)) list.push('Photographs');
    if (list.length) out.evidence = list;
  }

  // Timeline
  if (/yesterday|last week|last (sunday|monday|tuesday|wednesday|thursday|friday|saturday)|today|2 years|months ago|days ago|2024|2025|2026|three months|four months|five months|six months|one month|two months|\d+\s*(months?|years?|weeks?|days?)\s*(ago|back)/.test(clean)) {
    out.incidentDate = clean.match(/\d{4}|yesterday|last \w+|today|2 years|[\w ]+ ago|three months|four months|five months|six months|one month|two months|\d+\s*(months?|years?|weeks?|days?)\s*(ago|back)/)?.[0] || 'Timeline & dates recorded';
  }

  // Possession date (builder matters)
  if (/possession (was )?due|promised possession|handover (was )?due/.test(clean)) {
    const match = clean.match(/(june|july|august|september|october|november|december|january|february|march|april|may)\s+\d{4}|\d{4}|june|july|august|september|october|november|december/i);
    out.possessionDueDate = match ? match[0] : 'Possession date mentioned';
  }

  // Client objective
  if (/refund|interest/i.test(clean)) out.clientObjective = 'Full refund + delay interest';
  else if (/want to take legal action|sue|file a case|legal action|compensation|court/i.test(clean)) out.clientObjective = 'Legal protection & remedy';

  // Possession date extraction (builder matters)
  if (/possession (was )?due|promised possession|handover (was )?due/.test(clean)) {
    const match = clean.match(/(june|july|august|september|october|november|december|january|february|march|april|may)\s+\d{4}|\d{4}|june|july|august|september|october|november|december/i);
    out.possessionDueDate = match?.[0] ?? 'Possession date mentioned';
  }

  // Police status from explicit statements
  if (policeStatusPattern.test(clean)) {
    out.policeStatus = true;
  } else if (/no police|havent? reported|no fir|not reported/i.test(clean)) {
    out.policeStatus = 'NONE';
  }

  // Evidence detection
  if (/cctv|medical|witness|photo|video|document|certificate/i.test(clean)) {
    const list: string[] = [];
    if (/cctv|video/.test(clean)) list.push('CCTV footage');
    if (/medical|certificate/.test(clean)) list.push('Medical certificate');
    if (/witness/.test(clean)) list.push('Witness');
    if (/photo/.test(clean)) list.push('Photographs');
    if (list.length) out.evidence = list;
  }

  return out;
}

/**
 * Builds the Groq prompt for structured fact extraction given the current
 * persisted case state, the latest user message, the previous assistant
 * question (so short answers like "yes"/"pune" resolve against context),
 * and the list of still-missing fields (so the LLM can prefer filling those).
 */
function buildExtractionPrompt(
  existing: CaseFacts,
  userMessage: string,
  lastAssistantMsg: string | undefined,
  missingInformation: string[]
): string {
  const currentState = {
    matter: existing.matter?.value,
    state: existing.state?.value,
    city: existing.city?.value,
    jurisdiction: existing.jurisdiction?.value,
    incidentDate: existing.incidentDate?.value,
    parties: existing.parties?.value,
    opposingParty: existing.opposingParty?.value,
    relationship: existing.relationship?.value,
    policeStatus: existing.policeStatus?.value,
    medicalInjuryEvidence: existing.medicalInjuryEvidence?.value,
    evidence: existing.evidence?.value,
    courtInvolvement: existing.courtInvolvement?.value,
    clientObjective: existing.clientObjective?.value,
    urgency: existing.urgency?.value,
    newCriminalLaws: existing.newCriminalLaws?.value,
    agreementDetails: existing.agreementDetails?.value,
    possessionDueDate: existing.possessionDueDate?.value
  };

  return `You extract structured legal case facts from a client's chat message. The client is describing a legal matter under Indian law.

VALID MATTER TYPES (you MUST choose from this list or set null if uncertain):
- "Neighbour Dispute / Physical Altercation"
- "Builder Possession Delay"
- "Tenant Security Deposit Dispute"
- "Employment / Labour Dispute"
- "Contractor / Service Dispute"
- "Insurance Dispute"
- "Consumer Dispute"
- "Property / Title Dispute"
- "Cheque Bounce / NI Act"
- "Family / Matrimonial Dispute"
- "Cyber Crime / Digital Fraud"
- "Defamation / Reputation"
- "Arbitration / ADR"
- "Tax / GST Dispute"
- "Criminal Matter"

SCHEMA — return ONLY a JSON object with any of these keys, set to null when absent or ambiguous (do not invent values):
{
  "matter": string|null,        // concise legal matter label e.g. "Neighbour Dispute / Physical Altercation", "Builder Possession Delay"
  "incidentDescription": string|null,
  "country": string|null,       // e.g. "India"
  "state": string|null,         // e.g. "Maharashtra"
  "city": string|null,          // e.g. "Pune"
  "incidentDate": string|null,  // only if an actual date/time is stated, else the relative phrase e.g. "2 years ago", "yesterday"
  "parties": string[]|null,
  "opposingParty": string|null, // who is on the other side e.g. "neighbour", "builder"
  "relationship": string|null,
  "keyFacts": string[]|null,    // important new factual circumstances
  "financialImpact": string|null,
  "policeStatus": true|"NONE"|null,
  "proceedingsStatus": string|null,
  "proceduralStage": string|null,
  "noticesOrders": string|null,
  "evidence": string[]|null,    // e.g. "CCTV footage", "medical certificate", "witnesses"
  "courtInvolvement": string|null,
  "urgency": string|null,       // "HIGH"/"MEDIUM"/"LOW" only if implied
  "clientObjective": string|null,
  "medicalInjuryEvidence": string|null,
  "agreementDetails": string|null,
  "possessionDueDate": string|null,
  "newCriminalLaws": boolean|null,
  "correction": null | {"field": value, ...}, // ONLY if the user explicitly contradicts a field that currently has a value
  "confidence": number 0.0-1.0,
  "isQuestion": boolean        // true if this message is only a question, not a statement of new facts
}

CURRENT KNOWN STATE (do not re-extract already-known values as new unless the user corrects them):
${JSON.stringify(currentState)}

MISSING INFORMATION WE ARE STILL ASKING ABOUT: ${missingInformation.join(', ') || 'none'}

THE PREVIOUS QUESTION THE ASSISTANT ASKED (use it to interpret short/ambiguous answers like "yes", "pune", "yesterday"):
${lastAssistantMsg || 'none'}

RULES:
1. This new message is: "${userMessage}"
2. If the message is only a question, set isQuestion=true and extract no facts.
3. If it is a SHORT answer ("yes", "no", "pune", "yesterday", "he hit me", "I have CCTV"), resolve it against the previous question and fill the relevant field.
4. Do NOT overwrite a known value unless the user explicitly corrects it; in that case set "correction" to the corrected field(s).
5. Never hallucinate facts not supported by the message.
6. Confidence should be high (0.8+) when the message directly states a fact, lower when inferred.`;
}

export function factsFromExtraction(raw: any): ExtractedFacts {
  if (!raw || typeof raw !== 'object') {
    return { confidence: 0 };
  }
  const allowed = new Set([
    'matter', 'incidentDescription', 'country', 'state', 'city', 'incidentDate',
    'parties', 'opposingParty', 'relationship', 'keyFacts', 'financialImpact',
    'policeStatus', 'proceedingsStatus', 'proceduralStage', 'noticesOrders',
    'evidence', 'courtInvolvement', 'urgency', 'clientObjective',
    'medicalInjuryEvidence', 'agreementDetails', 'possessionDueDate',
    'newCriminalLaws', 'correction', 'isQuestion'
  ]);
  const out: any = { confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8 };
  for (const key of Object.keys(raw)) {
    if (allowed.has(key)) out[key] = raw[key];
  }
  return out as ExtractedFacts;
}

/**
 * Primary extraction path: call the LLM for structured facts. Falls back to the
 * deterministic extractor when the LLM is unavailable or low-confidence. Never
 * throws.
 */
export async function extractFacts(
  existing: CaseFacts,
  userMessage: string,
  lastAssistantMsg: string | undefined,
  missingInformation: string[]
): Promise<ExtractedFacts> {
  const prompt = buildExtractionPrompt(existing, userMessage, lastAssistantMsg, missingInformation);
  const raw = await callGroqStructuredJSON(prompt, 0.0, 700);
  if (raw) {
    const extracted = factsFromExtraction(raw);
    if ((extracted.confidence ?? 0) >= 0.5 && !extracted.isQuestion) {
      logger.info('[EXTRACT] LLM extraction succeeded', {
        state: extracted.state ?? null,
        city: extracted.city ?? null,
        matter: extracted.matter ?? null
      });
      return extracted;
    }
    logger.info('[EXTRACT] LLM extraction too uncertain, using deterministic fallback');
  } else {
    logger.info('[EXTRACT] LLM extraction unavailable, using deterministic fallback');
  }
  return deterministicExtract(userMessage, existing, lastAssistantMsg);
}

function makeFact<T>(
  val: T,
  source: 'client_chat' | 'document' | 'corroborated',
  completeness: 0 | 0.25 | 0.5 | 0.75 | 1.0
): FactValue<T> {
  return {
    value: val,
    source,
    confidence: val !== null && val !== undefined && (Array.isArray(val) ? val.length > 0 : true) ? 0.9 : 0,
    completeness,
    sourcesList: val !== null ? [source] : []
  };
}

function assignFact(merged: CaseFacts, key: keyof CaseFacts, value: any) {
  if (value === null || value === undefined) return;
  const current = merged[key] as FactValue<any> | undefined;
  if (current && current.value !== null && current.value !== undefined && !(Array.isArray(current.value) && current.value.length === 0)) {
    return; // never overwrite an existing value
  }
  (merged as any)[key] = makeFact(value, 'client_chat', 0.9 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
}

/**
 * Deterministically merges extracted facts into the existing case state.
 * Rules:
 *  - Coordinates a new city/state/jurisdiction from the smallest available pieces.
 *  - Never replaces an existing value except via an explicit "correction".
 *  - A user correction replaces the previous value (client is source of truth).
 */
export function mergeExtractedFacts(existing: CaseFacts, extracted: ExtractedFacts): CaseFacts {
  // Helper to ensure a FactValue is fully defined (not partial from optional fields)
  const ensureFact = <T>(fv: FactValue<T> | undefined, fallback: FactValue<T>): FactValue<T> =>
    fv && fv.value !== undefined ? fv : fallback;

  const merged: CaseFacts = {
    ...existing,
    matter: ensureFact(existing.matter, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    incidentDescription: ensureFact(existing.incidentDescription, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    country: ensureFact(existing.country, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    state: ensureFact(existing.state, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    city: ensureFact(existing.city, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    jurisdiction: ensureFact(existing.jurisdiction, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    incidentDate: ensureFact(existing.incidentDate, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    parties: Array.isArray(existing.parties.value) ? { ...existing.parties, value: [...existing.parties.value] } : { ...existing.parties },
    opposingParty: ensureFact(existing.opposingParty, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    relationship: ensureFact(existing.relationship, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    timeline: ensureFact(existing.timeline, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    keyFacts: Array.isArray(existing.keyFacts.value) ? { ...existing.keyFacts, value: [...existing.keyFacts.value] } : { ...existing.keyFacts },
    financialImpact: ensureFact(existing.financialImpact, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    policeStatus: ensureFact(existing.policeStatus, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    proceedingsStatus: ensureFact(existing.proceedingsStatus, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    proceduralStage: ensureFact(existing.proceduralStage, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    noticesOrders: ensureFact(existing.noticesOrders, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    documents: { ...existing.documents },
    evidence: Array.isArray(existing.evidence.value) ? { ...existing.evidence, value: [...existing.evidence.value] } : { ...existing.evidence },
    courtInvolvement: ensureFact(existing.courtInvolvement, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    urgency: ensureFact(existing.urgency, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    clientObjective: ensureFact(existing.clientObjective, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    newCriminalLaws: ensureFact(existing.newCriminalLaws, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    agreementDetails: ensureFact(existing.agreementDetails, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    possessionDueDate: ensureFact(existing.possessionDueDate, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    medicalInjuryEvidence: ensureFact(existing.medicalInjuryEvidence, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] })
  };

  // 1. Apply explicit corrections (client is the source of truth).
  if (extracted.correction && typeof extracted.correction === 'object') {
    for (const field of Object.keys(extracted.correction)) {
      const value = (extracted.correction as any)[field];
      if (value === null || value === undefined) continue;
      if ((merged as any)[field]) {
        (merged as any)[field] = makeFact(value, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
      }
      // If a correction is applied to state/city, also refresh jurisdiction label.
      if (field === 'state' || field === 'city') {
        const st = merged.state?.value || 'Unknown State';
        const ct = merged.city?.value || 'Unknown City';
        merged.jurisdiction = makeFact(`${st} (${ct})`, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
      }
    }
  }

  // 2. Merge structured fields that are not a question.
  if (!extracted.isQuestion) {
    const simpleStringFields: Array<keyof CaseFacts> = [
      'matter', 'incidentDescription', 'country', 'incidentDate', 'opposingParty',
      'relationship', 'timeline', 'financialImpact', 'proceedingsStatus',
      'proceduralStage', 'noticesOrders', 'courtInvolvement', 'urgency',
      'clientObjective', 'medicalInjuryEvidence', 'agreementDetails',
      'possessionDueDate'
    ];
    for (const field of simpleStringFields) {
      const value = (extracted as any)[field];
      if (typeof value === 'string' && value) assignFact(merged, field, value);
    }

    if (typeof extracted.newCriminalLaws === 'boolean') {
      assignFact(merged, 'newCriminalLaws', extracted.newCriminalLaws);
    }

    if (extracted.policeStatus !== undefined && extracted.policeStatus !== null) {
      if (merged.policeStatus.value === null) {
        merged.policeStatus = makeFact(extracted.policeStatus, 'client_chat', 1.0 as 0 | 0.5 | 1.0);
      }
    }

    if (Array.isArray(extracted.parties) && extracted.parties.length) {
      const prev = Array.isArray(merged.parties.value) ? merged.parties.value : [];
      merged.parties = makeFact(Array.from(new Set([...prev, ...extracted.parties])), 'client_chat', 0.9 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
    }

    if (Array.isArray(extracted.keyFacts) && extracted.keyFacts.length) {
      const prev = Array.isArray(merged.keyFacts.value) ? merged.keyFacts.value : [];
      merged.keyFacts = makeFact(Array.from(new Set([...prev, ...extracted.keyFacts])), 'client_chat', 0.9 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
    }

    if (Array.isArray(extracted.evidence) && extracted.evidence.length) {
      const prev = Array.isArray(merged.evidence.value) ? merged.evidence.value : [];
      merged.evidence = makeFact(Array.from(new Set([...prev, ...extracted.evidence])), 'client_chat', 0.9 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
    }
  }

  // 3. State/city/jurisdiction coordination (from the smallest available pieces).
  const formedState = merged.state?.value ?? extracted.state ?? null;
  const formedCity = merged.city?.value ?? extracted.city ?? null;

  if (formedState && !merged.state?.value) {
    merged.state = makeFact(formedState, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
  }
  if (formedCity && !merged.city?.value) {
    merged.city = makeFact(formedCity, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
  }
  if (!merged.jurisdiction?.value) {
    if (typeof extracted.jurisdiction === 'string' && extracted.jurisdiction) {
      merged.jurisdiction = makeFact(extracted.jurisdiction, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
    } else if (formedState || formedCity) {
      merged.jurisdiction = makeFact(`${formedState || 'Unknown State'} (${formedCity || 'Unknown City'})`, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
    }
  }

  return merged;
}
