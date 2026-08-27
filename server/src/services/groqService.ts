import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const LEAKAGE_PATTERNS = [
  /<think>[\s\S]*?<\/think>/gi,
  /<\/?think>/gi,
  /```json[\s\S]*?```/gi,
  /```[\s\S]*?```/gi,
  /the user has confirmed/i,
  /discovery status is/i,
  /according to the (strict )?conversational rules/i,
  /according to the prompt/i,
  /check constraints/i,
  /output matches/i,
  /self-correction/i,
  /final output generation/i,
  /system prompt/i,
  /accumulated case context/i,
  /instructions for assistant/i,
  /readiness score/i
];

/**
 * Validates and sanitizes LLM response string. Returns clean text or throws error if prompt leakage is detected.
 */
export function sanitizeLLMResponse(rawText: string): string {
  if (!rawText) return '';

  let text = rawText.trim();

  // Try parsing JSON if structured JSON output was returned
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.reply && typeof parsed.reply === 'string') {
        text = parsed.reply;
      }
    } catch {
      // Not JSON, continue with string sanitization
    }
  }

  // Check for leakage patterns
  for (const pattern of LEAKAGE_PATTERNS) {
    if (pattern.test(text)) {
      logger.warn(`Prompt leakage detected in LLM response matching pattern: ${pattern}. Discarding response.`);
      throw new Error('Prompt leakage detected in LLM output.');
    }
  }

  // Strip residual JSON wrappers or quotes
  text = text.replace(/^[{"'\s]+reply[":\s]+/, '').replace(/[}"'\s]+$/, '').trim();

  return text;
}

export async function callGroqAPI(
  messages: GroqChatMessage[],
  temperature = 0.1
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

  if (!apiKey) {
    logger.warn('GROQ_API_KEY not configured in server environment');
    throw new Error('Server GROQ_API_KEY missing');
  }

  logger.info(`Groq request started with model=${model}`);

  // Enforce system JSON instructions
  const jsonMessages: GroqChatMessage[] = [
    {
      role: 'system',
      content: `Return ONLY a valid JSON object: {"reply": "your concise user-facing legal copilot answer"}. DO NOT output any thinking, rules, notes, or markdown formatting.`
    },
    ...messages
  ];

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: jsonMessages,
        temperature,
        max_tokens: 512
      })
    });

    if (res.ok) {
      const data = await res.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      logger.info('Groq response received successfully');
      return sanitizeLLMResponse(rawContent);
    } else {
      const errText = await res.text();
      logger.warn(`Groq API primary model ${model} failed: ${res.status} ${errText}`);

      // Fallback model groq/compound-mini
      const fallbackRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'groq/compound-mini',
          messages: jsonMessages,
          temperature,
          max_tokens: 512
        })
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const rawContent = fallbackData.choices?.[0]?.message?.content || '';
        logger.info('Groq response received successfully via fallback model groq/compound-mini');
        return sanitizeLLMResponse(rawContent);
      }
    }
  } catch (err: any) {
    logger.error(`Groq API call error: ${err.message}`);
  }

  throw new Error('Failed to retrieve clean response from Groq API');
}

/**
 * Executes structured Groq Document Intelligence extraction.
 * Returns raw extracted JSON object or null if API key is missing or call fails.
 */
export async function analyzeDocumentWithGroqLLM(
  filename: string,
  fileSize: string,
  fileType: string,
  sampleText?: string
): Promise<any | null> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

  if (!apiKey) {
    logger.warn('GROQ_API_KEY not configured. Falling back to deterministic document classification.');
    return null;
  }

  const prompt = `You are the NYAYAI Document Intelligence LLM engine. Analyze this uploaded file metadata and text snippet under Indian Law:
Filename: "${filename}"
File Size: "${fileSize}"
MIME Type: "${fileType}"
Sample Text Content: "${sampleText || filename}"

Return ONLY a valid JSON object matching this exact schema:
{
  "documentCategory": "IDENTITY" | "CASE_DOCUMENT" | "SUPPORTING_EVIDENCE" | "PERSONAL",
  "documentType": "Aadhaar Card | PAN Card | Passport | FIR | CSR / Police Complaint | Legal Notice | Court Order | Builder Agreement | Property Document | Medical Records | Unrelated Document",
  "isCaseRelevant": boolean,
  "relevanceScore": number (0 to 100),
  "unrelatedReason": string or null,
  "privacyNoticeRequired": boolean (true for Aadhaar, PAN, Passport),
  "maskedIdentifier": string or null (e.g., "XXXX-XXXX-1842"),
  "summary": "Executive summary of document findings",
  "extractedEntities": {
    "parties": string[],
    "personNames": string[],
    "importantDates": string[],
    "firOrCaseNumbers": string[],
    "jurisdiction": string,
    "courtOrPoliceStation": string,
    "legalSections": string[],
    "clauses": string[],
    "obligations": string[],
    "deadlines": string[],
    "monetaryAmounts": string[],
    "importantEvents": string[],
    "potentialRisks": string[],
    "missingInformation": string[]
  },
  "extractedCaseFacts": string[],
  "confidence": number (0.0 to 1.0)
}

RULES:
1. Aadhaar, PAN, Passport MUST be categorized as "IDENTITY". Set privacyNoticeRequired=true. Do NOT treat Aadhaar number as a legal case fact.
2. If the document is an interview handbook, resume, random cheat sheet, or unrelated code/book, set isCaseRelevant=false and documentType="Unrelated Document".
3. Only extract real legal facts if isCaseRelevant is true.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You extract structured JSON for document intelligence. Output ONLY pure valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.0,
        max_tokens: 768
      })
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content || '';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      logger.info(`Groq document intelligence extraction succeeded for ${filename}`);
      return parsed;
    }
  } catch (err: any) {
    logger.warn(`Groq document analysis call failed: ${err.message}. Falling back to deterministic engine.`);
  }

  return null;
}
