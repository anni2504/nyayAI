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
