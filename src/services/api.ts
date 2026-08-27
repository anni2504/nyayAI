// Centralized API Service connecting Frontend to NYAYAI Express Backend & Server-Side Groq API

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5001/api/v1');

export interface ChatResponsePayload {
  reply: string;
  caseId: string;
  caseUnderstanding: Array<{ key: string; label: string; value: string; status: 'verified' | 'pending' | 'missing' }>;
  collectedFacts: any;
  establishedFacts: Array<{ label: string; value: string; source: string }>;
  practiceArea: string;
  jurisdiction: string;
  proceduralStage: string;
  caseReadinessScore: number;
  readinessStage: string;
  scoreHistory: any[];
  discoveryStatus: 'NEEDS_INFORMATION' | 'READY_FOR_RECOMMENDATION';
  missingInformation: string[];
  recommendationData: any[];
  quickResponses: string[];
  legalAuthorities: string[];
  documents: any[];
  analysis?: any;
}

export async function sendClientChatMessage(
  caseId: string,
  message: string,
  attachment?: { name: string; size: string; type: string }
): Promise<ChatResponsePayload> {
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-NYAYAI-Role': 'CLIENT'
    },
    body: JSON.stringify({ caseId, message, attachment })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ message: 'API error' }));
    throw new Error(errData.message || `Server error ${res.status}`);
  }

  return await res.json();
}

export async function uploadClientDocument(
  caseId: string,
  file: { name: string; size: string; type: string },
  userMessage?: string
): Promise<ChatResponsePayload> {
  const res = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-NYAYAI-Role': 'CLIENT'
    },
    body: JSON.stringify({
      caseId,
      filename: file.name,
      fileSize: file.size,
      fileType: file.type,
      userMessage
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ message: 'Document upload error' }));
    throw new Error(errData.message || `Upload error ${res.status}`);
  }

  return await res.json();
}

export async function sendAdvocateAIChat(
  tool: string,
  query: string
): Promise<{ tool: string; output: string }> {
  const res = await fetch(`${API_BASE_URL}/advocate/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-NYAYAI-Role': 'ADVOCATE'
    },
    body: JSON.stringify({ tool, query })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ message: 'Advocate AI error' }));
    throw new Error(errData.message || `Advocate AI error ${res.status}`);
  }

  return await res.json();
}

export async function getHealthStatus(): Promise<{ status: string; groqConfigured: boolean; model: string }> {
  const res = await fetch(`${API_BASE_URL}/ai/health`);
  return await res.json();
}
