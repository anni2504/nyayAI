import type {
  CaseFacts,
  FactValue,
  ExtractedFacts
} from '../types/index.js';
import { callGroqStructuredJSON } from './groqService.js';
import { logger } from '../utils/logger.js';

// Generalized Indian city-to-state mapping for jurisdiction extraction.
// Used when the user provides a city name; we reliably map it to a state
// without inventing uncertain mappings.
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
  noida: 'Uttar Pradesh',
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
  nagpur: 'Maharashtra',
  nashik: 'Maharashtra',
  thane: 'Maharashtra',
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
  warangal: 'Telangana',
  vijayawada: 'Andhra Pradesh',
  visakhapatnam: 'Andhra Pradesh',
  vizag: 'Andhra Pradesh',
  vijayanagar: 'Andhra Pradesh',
  guntur: 'Andhra Pradesh',
  bhubaneswar: 'Odisha',
  cuttack: 'Odisha',
  puri: 'Odisha',
  kolkata: 'West Bengal',
  howrah: 'West Bengal',
  siliguri: 'West Bengal',
  bilaspur: 'Chhattisgarh',
  raipur: 'Chhattisgarh',
  durg: 'Chhattisgarh',
  bhilai: 'Chhattisgarh',
  korba: 'Chhattisgarh',
  ranchi: 'Jharkhand',
  jamshedpur: 'Jharkhand',
  dhanbad: 'Jharkhand',
  bokaro: 'Jharkhand',
  patna: 'Bihar',
  gaya: 'Bihar',
  muzaffarpur: 'Bihar',
  bhagalpur: 'Bihar',
  dehradun: 'Uttarakhand',
  haridwar: 'Uttarakhand',
  nainital: 'Uttarakhand',
  rishikesh: 'Uttarakhand',
  shimla: 'Himachal Pradesh',
  dharamshala: 'Himachal Pradesh',
  manali: 'Himachal Pradesh',
  kullu: 'Himachal Pradesh',
  srinagar: 'Jammu and Kashmir',
  jammu: 'Jammu and Kashmir',
  guwahati: 'Assam',
  silchar: 'Assam',
  dibrugarh: 'Assam',
  panaji: 'Goa',
  margao: 'Goa',
  vasco: 'Goa',
  ahmedabad: 'Gujarat',
  surat: 'Gujarat',
  vadodara: 'Gujarat',
  rajkot: 'Gujarat',
  kochi: 'Kerala',
  thiruvananthapuram: 'Kerala',
  kozhikode: 'Kerala'
};

const STATE_CANONICAL_MAP: Record<string, string> = {
  maharashtra: 'Maharashtra',
  karnataka: 'Karnataka',
  delhi: 'Delhi',
  rajasthan: 'Rajasthan',
  'tamil nadu': 'Tamil Nadu',
  telangana: 'Telangana',
  'andhra pradesh': 'Andhra Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  'madhya pradesh': 'Madhya Pradesh',
  punjab: 'Punjab',
  chandigarh: 'Chandigarh',
  odisha: 'Odisha',
  'west bengal': 'West Bengal',
  gujarat: 'Gujarat',
  kerala: 'Kerala',
  haryana: 'Haryana',
  bihar: 'Bihar',
  jharkhand: 'Jharkhand',
  chhattisgarh: 'Chhattisgarh',
  chattisgarh: 'Chhattisgarh',
  uttarakhand: 'Uttarakhand',
  'himachal pradesh': 'Himachal Pradesh',
  'jammu and kashmir': 'Jammu and Kashmir',
  ladakh: 'Ladakh',
  goa: 'Goa',
  assam: 'Assam',
  sikkim: 'Sikkim',
  'arunachal pradesh': 'Arunachal Pradesh',
  meghalaya: 'Meghalaya',
  mizoram: 'Mizoram',
  nagaland: 'Nagaland',
  manipur: 'Manipur',
  tripura: 'Tripura'
};

// Helper: extract city and state from a lowercased text snippet.
function extractCityStateFromText(clean: string): { city: string | null; state: string | null } {
  let city: string | null = null;
  let state: string | null = null;

  // 1. Explicit "City, State" or "City State" pattern (e.g. "Bilaspur Chhattisgarh", "Jaipur, Rajasthan")
  const words = clean.split(/[,\s]+/).map(w => w.trim()).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const singleWord = words[i];
    const twoWords = i < words.length - 1 ? `${words[i]} ${words[i + 1]}` : null;
    const threeWords = i < words.length - 2 ? `${words[i]} ${words[i + 1]} ${words[i + 2]}` : null;

    if (threeWords && STATE_CANONICAL_MAP[threeWords]) {
      state = STATE_CANONICAL_MAP[threeWords];
    } else if (twoWords && STATE_CANONICAL_MAP[twoWords]) {
      state = STATE_CANONICAL_MAP[twoWords];
    } else if (STATE_CANONICAL_MAP[singleWord]) {
      state = STATE_CANONICAL_MAP[singleWord];
    }

    if (CITY_TO_STATE_MAP[singleWord]) {
      city = singleWord.charAt(0).toUpperCase() + singleWord.slice(1);
      if (!state) {
        state = CITY_TO_STATE_MAP[singleWord];
      }
    } else if (twoWords && CITY_TO_STATE_MAP[twoWords]) {
      city = twoWords.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!state) {
        state = CITY_TO_STATE_MAP[twoWords];
      }
    }
  }

  // 2. City-only: check if any known city appears in text
  if (!city) {
    for (const [knownCity, knownState] of Object.entries(CITY_TO_STATE_MAP)) {
      const cityRegex = new RegExp(`\\b${knownCity}\\b`, 'i');
      if (cityRegex.test(clean)) {
        city = knownCity.charAt(0).toUpperCase() + knownCity.slice(1);
        if (!state) state = knownState;
        break;
      }
    }
  }

  // 3. State-only: check for explicit state names in text
  if (!state) {
    for (const [stateKey, canonical] of Object.entries(STATE_CANONICAL_MAP)) {
      const stateRegex = new RegExp(`\\b${stateKey}\\b`, 'i');
      if (stateRegex.test(clean)) {
        state = canonical;
        break;
      }
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
  const recordCorrection = (field: keyof CaseFacts, value: any) => { out.correction![field] = value; };

  // Detect explicit corrections: "Actually X", "No, X", "Correction: X", "It was X"
  const isCorrection = /^actually\b|^no,?\s|^correction:?\s|^it was\s/i.test(clean);
  const correctionTarget = clean.replace(/^(actually|no|correction)\b,?\s*/i, '').trim();

  // --- GENERALIZED CITY/STATE EXTRACTION ---
  const { city: extractedCity, state: extractedState } = extractCityStateFromText(clean);
  if (extractedCity || extractedState) {
    if (isCorrection && correctionTarget) {
      if (extractedState) recordCorrection('state', extractedState);
      if (extractedCity) recordCorrection('city', extractedCity);
      if (extractedState || extractedCity) {
        const s = extractedState || 'Unknown State';
        const c = extractedCity || 'Unknown City';
        recordCorrection('jurisdiction', `${s} (${c})`);
      }
    } else {
      recordCityState(out, extractedCity, extractedState, existing);
    }
  }

  const last = lastAssistantMsg ? lastAssistantMsg.toLowerCase() : '';

  // --- 1. LEGAL ROLE DETECTION ---
  if (/\b(i saw|i noticed|witnessed|spotted|observed|people were|someone was|there were people|i witnessed)\b/i.test(clean)) {
    out.userRole = 'observer';
  } else if (/\b(hit me|punched me|assaulted me|attacked me|cheated me|threatened me|stole my|harassed me|delayed my flat|delayed handover)\b/i.test(clean)) {
    out.userRole = 'victim';
  } else if (/\b(accused of|police filed.*against me|case against me|fir against me|i was arrested|i received a notice|bail)\b/i.test(clean)) {
    out.userRole = 'accused';
  }

  // --- 2. ANSWER VALIDATION & SEMANTIC COMPATIBILITY ---
  // A) Negative responses to previous questions (e.g. "nopee", "nope", "no", "nah", "not yet")
  const isNegative = /^(no|no\.|nopee|nope|nah|not yet|not really|haven't|havent|no fir|no complaint|not reported)\b/i.test(clean);
  if (isNegative) {
    const isPoliceQuestion = /police|csr|fir|complaint|reported|forest department|authorities/i.test(last);
    if (isPoliceQuestion) {
      out.policeStatus = 'NONE';
      return out;
    }
  }

  // B) Ambiguous responses (e.g. "yeah medical reports" without injury details)
  const isMedicalMention = /medical(\s+reports?|\s+certificate|\s+records?)?/i.test(clean);
  if (isMedicalMention && (/^(yeah|ya|yes|yup)\s+medical/i.test(clean) || clean === 'medical reports' || clean === 'yeah medical reports')) {
    // If the case is NOT an assault/injury case, or user did NOT state anyone was injured:
    // Do NOT set injury = true! Treat as ambiguous and prompt for clarification.
    out.isAmbiguous = true;
    out.clarificationPrompt = 'Do you mean that someone was injured and you have medical reports related to it? If so, please tell me what happened.';
    return out;
  }

  // C) Pure affirmative short answers ("yes", "ya", "yup", "yeah")
  if (/^(yes|yes\.|ya|yup|yeah)$/i.test(clean)) {
    const isPoliceQuestion = /police|csr|fir|complaint|reported/i.test(last);
    const isInjuryQuestion = /injured|injur|assault|hit|medical|hurt|violence/i.test(last);
    const isAgreementQuestion = /agreement|contract|possession|sale/i.test(last);
    if (isPoliceQuestion) out.policeStatus = true;
    if (isInjuryQuestion) out.medicalInjuryEvidence = 'Physical violence / injuries occurred';
    if (isAgreementQuestion) out.agreementDetails = 'Sale / Possession Agreement documented';
    return out;
  }

  // --- 3. MATTER DETECTION ---
  if (/\b(tree|trees|forest|forests|timber|deforestation|woodcutting|cutting trees|tree cutting|wildlife|national park|sanctuary|felling)\b/i.test(clean)) {
    out.matter = 'Tree Cutting / Environmental Offence';
    if (!existing.incidentDescription?.value) {
      out.incidentDescription = text;
    }
  } else if (/\b(theft|stole|stolen|robbery|burglary|snatching|pickpocket|thief)\b/i.test(clean)) {
    out.matter = 'Theft / Stolen Property';
    if (!existing.incidentDescription?.value) {
      out.incidentDescription = text;
    }
  } else if (/fight|assault|neighbour|neighbor|dispute|boundary|altercation|hit me|punched|slapped|physical|road|walking/.test(clean)) {
    out.matter = 'Neighbour Dispute / Physical Altercation';
    if (/hit me|punched|slapped|struck|physical|assault/.test(clean)) {
      out.medicalInjuryEvidence = 'Physical violence / injuries occurred';
    }
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
  } else if (/\b(arrest|bail|anticipatory bail|quashing|charge sheet|cognizable)\b/.test(clean)) {
    out.matter = 'Criminal Matter';
  }

  // --- 4. INJURY/THREAT DETECTION (Explicit only) ---
  if (/minor injur/.test(clean)) {
    out.medicalInjuryEvidence = 'Minor injuries';
  } else if (/severe injur|hospitalized|fracture|bleeding wound/.test(clean)) {
    out.medicalInjuryEvidence = 'Severe physical injuries occurred';
  } else if (/hit me|punched me|slapped me|struck me|physically attacked me/.test(clean)) {
    out.medicalInjuryEvidence = 'Physical violence / injuries occurred';
  }

  // --- 5. OPPOSING PARTY EXTRACTION ---
  if (!out.opposingParty) {
    if (/insurer|insurance company|insurance/.test(clean)) out.opposingParty = 'Insurance Company';
    else if (/employer|company|boss|manager|hr|organization/.test(clean)) out.opposingParty = 'Employer / Company';
    else if (/landlord|owner|landlady/.test(clean)) out.opposingParty = 'Landlord';
    else if (/builder|developer|contractor|vendor/.test(clean)) out.opposingParty = 'Builder / Contractor';
    else if (/bank|financial institution|nbfc/.test(clean)) out.opposingParty = 'Bank / Financial Institution';
    else if (/seller|vendor|merchant|shop|store|e-commerce|platform/.test(clean)) out.opposingParty = 'Seller / Vendor';
    else if (/neighbour|neighbor/.test(clean)) out.opposingParty = 'Neighbour';
    else if (/spouse|husband|wife|partner|family/.test(clean)) out.opposingParty = 'Spouse / Family Member';
    else if (/doctor|hospital|clinic/.test(clean)) out.opposingParty = 'Medical Professional / Hospital';
  }

  // --- 6. POLICE / REPORTING STATUS ---
  const policeStatusPattern = /\b(fir|csr|police complaint|complaint)\b[^.!?]*\bfiled\b|\bfiled\b[^.!?]*\b(fir|csr|police complaint)\b|reported (it )?to police|reported to police/i;
  if (policeStatusPattern.test(clean)) {
    out.policeStatus = true;
  } else if (/no police|havent? reported|haven't reported|no fir|not reported/i.test(clean)) {
    out.policeStatus = 'NONE';
  }

  // --- 7. EVIDENCE DETECTION (Explicit only) ---
  if (/\b(cctv|video footage|witness|witnesses|photographs?|photos?)\b/i.test(clean)) {
    const list: string[] = [];
    if (/cctv|video/.test(clean)) list.push('CCTV footage');
    if (/witness/.test(clean)) list.push('Witness');
    if (/photo/.test(clean)) list.push('Photographs');
    if (list.length) out.evidence = list;
  }

  // --- 8. TIMELINE & DATES ---
  if (/yesterday|last week|last (sunday|monday|tuesday|wednesday|thursday|friday|saturday)|today|2 years|months ago|days ago|2024|2025|2026|three months|four months|five months|six months|one month|two months|\d+\s*(months?|years?|weeks?|days?)\s*(ago|back)/.test(clean)) {
    out.incidentDate = clean.match(/\d{4}|yesterday|last \w+|today|2 years|[\w ]+ ago|three months|four months|five months|six months|one month|two months|\d+\s*(months?|years?|weeks?|days?)\s*(ago|back)/)?.[0] || 'Timeline & dates recorded';
  }

  // --- 9. POSSESSION DATE (Builder matters) ---
  if (/possession (was )?due|promised possession|handover (was )?due/.test(clean)) {
    const match = clean.match(/(june|july|august|september|october|november|december|january|february|march|april|may)\s+\d{4}|\d{4}|june|july|august|september|october|november|december/i);
    out.possessionDueDate = match ? match[0] : 'Possession date mentioned';
  }

  // --- 10. CLIENT OBJECTIVE ---
  if (/refund|interest/i.test(clean)) out.clientObjective = 'Full refund + delay interest';
  else if (/want to take legal action|sue|file a case|legal action|compensation|court/i.test(clean)) out.clientObjective = 'Legal protection & remedy';
  else if (/stop.*cutting|protect.*forest|report.*forest department|action against timber/i.test(clean)) out.clientObjective = 'Forest Department complaint & immediate intervention';

  return out;
}

/**
 * Builds the Groq prompt for structured fact extraction.
 */
function buildExtractionPrompt(
  existing: CaseFacts,
  userMessage: string,
  lastAssistantMsg: string | undefined,
  missingInformation: string[]
): string {
  const currentState = {
    matter: existing.matter?.value,
    userRole: existing.userRole?.value,
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

  return `You extract structured legal case facts from a client's chat message under Indian law.

VALID MATTER TYPES (select the most specific, DO NOT default non-violent or regulatory matters to "Criminal Matter"):
- "Tree Cutting / Environmental Offence"
- "Theft / Stolen Property"
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
- "FIR / Police Complaint Matter"
- "Criminal Matter"

VALID USER ROLES:
- "observer" (e.g. "I saw people cutting trees", bystander, third-party observer)
- "witness"
- "victim" / "complainant" (e.g. attacked, cheated, delayed property)
- "property_owner"
- "accused" / "respondent" (ONLY if explicit: e.g. "police filed FIR against me", "I received a summons")
- "unknown"

SCHEMA — return ONLY a JSON object:
{
  "matter": string|null,
  "userRole": "observer"|"witness"|"victim"|"property_owner"|"accused"|"unknown"|null,
  "incidentDescription": string|null,
  "country": string|null,
  "state": string|null,
  "city": string|null,
  "incidentDate": string|null,
  "parties": string[]|null,
  "opposingParty": string|null,
  "relationship": string|null,
  "keyFacts": string[]|null,
  "financialImpact": string|null,
  "policeStatus": true|"NONE"|null,
  "proceedingsStatus": string|null,
  "proceduralStage": string|null,
  "noticesOrders": string|null,
  "evidence": string[]|null,
  "courtInvolvement": string|null,
  "urgency": string|null,
  "clientObjective": string|null,
  "medicalInjuryEvidence": string|null,
  "agreementDetails": string|null,
  "possessionDueDate": string|null,
  "newCriminalLaws": boolean|null,
  "correction": null | {"field": value, ...},
  "confidence": number 0.0-1.0,
  "isQuestion": boolean,
  "isAmbiguous": boolean,
  "clarificationPrompt": string|null
}

CURRENT KNOWN STATE:
${JSON.stringify(currentState)}

PREVIOUS ASSISTANT QUESTION:
${lastAssistantMsg || 'none'}

RULES:
1. Message: "${userMessage}"
2. NEVER infer injuries, medical evidence, bail, quashing, or accused status from ambiguous messages like "yeah medical reports" or "nopee".
3. If an answer is ambiguous or semantically mismatched to the question, set "isAmbiguous": true and provide a "clarificationPrompt".
4. If the message is a negative answer ("nopee", "nope", "no") to an FIR question, set policeStatus="NONE".
5. Confidence should be high (0.8+) only when the user directly stated the fact.`;
}

export function factsFromExtraction(raw: any): ExtractedFacts {
  if (!raw || typeof raw !== 'object') {
    return { confidence: 0 };
  }
  const allowed = new Set([
    'matter', 'userRole', 'incidentDescription', 'country', 'state', 'city', 'incidentDate',
    'parties', 'opposingParty', 'relationship', 'keyFacts', 'financialImpact',
    'policeStatus', 'proceedingsStatus', 'proceduralStage', 'noticesOrders',
    'evidence', 'courtInvolvement', 'urgency', 'clientObjective',
    'medicalInjuryEvidence', 'agreementDetails', 'possessionDueDate',
    'newCriminalLaws', 'correction', 'isQuestion', 'isAmbiguous', 'clarificationPrompt'
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
  let extracted: ExtractedFacts;

  if (raw) {
    const fromLlm = factsFromExtraction(raw);
    if ((fromLlm.confidence ?? 0) >= 0.5 && !fromLlm.isQuestion) {
      logger.info('[EXTRACT] LLM extraction succeeded', {
        state: fromLlm.state ?? null,
        city: fromLlm.city ?? null,
        matter: fromLlm.matter ?? null,
        userRole: fromLlm.userRole ?? null
      });
      extracted = fromLlm;
    } else {
      logger.info('[EXTRACT] LLM extraction too uncertain, using deterministic fallback');
      extracted = deterministicExtract(userMessage, existing, lastAssistantMsg);
    }
  } else {
    logger.info('[EXTRACT] LLM extraction unavailable, using deterministic fallback');
    extracted = deterministicExtract(userMessage, existing, lastAssistantMsg);
  }

  // Ensure explicit police status mentions (FIR/CSR) are never lost
  if (extracted.policeStatus === undefined || extracted.policeStatus === null) {
    if (/\b(filed (a |an )?csr|filed (a |an )?fir|csr filed|fir filed|reported (it )?to police)\b/i.test(userMessage)) {
      extracted.policeStatus = true;
    } else if (/\b(no fir|no csr|havent reported|haven't reported|not reported to police)\b/i.test(userMessage)) {
      extracted.policeStatus = 'NONE';
    }
  }

  // Ensure descriptive messages capture incident description if not populated
  if (!extracted.incidentDescription && userMessage.length >= 10 && !extracted.isQuestion && !extracted.isAmbiguous) {
    if (/\b(hit me|punched|assault|walking|cutting|cut.*tree|stole|fraud|delayed|dispute)\b/i.test(userMessage)) {
      extracted.incidentDescription = userMessage;
    }
  }

  return extracted;
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
 */
export function mergeExtractedFacts(existing: CaseFacts, extracted: ExtractedFacts): CaseFacts {
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
    medicalInjuryEvidence: ensureFact(existing.medicalInjuryEvidence, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] }),
    userRole: ensureFact(existing.userRole, { value: null, source: 'client_chat', confidence: 0, completeness: 0, sourcesList: [] })
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

  // 2. Merge structured fields that are not a question or unverified ambiguous answer.
  if (!extracted.isQuestion && !extracted.isAmbiguous) {
    const simpleStringFields: Array<keyof CaseFacts> = [
      'matter', 'incidentDescription', 'country', 'incidentDate', 'opposingParty',
      'relationship', 'timeline', 'financialImpact', 'proceedingsStatus',
      'proceduralStage', 'noticesOrders', 'courtInvolvement', 'urgency',
      'clientObjective', 'medicalInjuryEvidence', 'agreementDetails',
      'possessionDueDate', 'userRole'
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

  // 3. State/city/jurisdiction coordination
  let formedState = merged.state?.value ?? extracted.state ?? null;
  const formedCity = merged.city?.value ?? extracted.city ?? null;

  if (!formedState && formedCity) {
    const mapped = CITY_TO_STATE_MAP[formedCity.toLowerCase()];
    if (mapped) {
      formedState = mapped;
    }
  }

  if (formedState && !merged.state?.value) {
    merged.state = makeFact(formedState, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
  }
  if (formedCity && !merged.city?.value) {
    merged.city = makeFact(formedCity, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
  }
  if (!merged.jurisdiction?.value || merged.jurisdiction.value.includes('Unknown State')) {
    if (formedState || formedCity) {
      merged.jurisdiction = makeFact(`${formedState || 'Unknown State'} (${formedCity || 'Unknown City'})`, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
    } else if (typeof extracted.jurisdiction === 'string' && extracted.jurisdiction) {
      merged.jurisdiction = makeFact(extracted.jurisdiction, 'client_chat', 1.0 as 0 | 0.25 | 0.5 | 0.75 | 1.0);
    }
  }

  return merged;
}
