// Centralized API Service connecting Frontend to NYAYAI Express Backend & Server-Side Groq API

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5001/api/v1');

const TOKEN_KEY = 'nyayai_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  const authHeaders: Record<string, string> = { ...headers };
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }
  return authHeaders;
}

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'ADVOCATE';
  avatar?: string;
  title?: string;
  barNumber?: string;
}

export interface AuthApiResponse {
  token: string;
  user: AuthUserResponse;
}

// AUTH API ENDPOINTS
export async function loginApi(credentials: { email: string; password: string }): Promise<AuthApiResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Invalid email or password.');
  }

  return data;
}

export async function registerApi(userData: {
  name: string;
  email: string;
  password: string;
  role: 'CLIENT' | 'ADVOCATE';
  title?: string;
  barNumber?: string;
}): Promise<AuthApiResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to register account.');
  }

  return data;
}

export async function getMeApi(token?: string): Promise<{ user: AuthUserResponse }> {
  const authToken = token || getStoredToken();
  if (!authToken) {
    throw new Error('No authentication token found.');
  }

  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Session expired or invalid.');
  }

  return data;
}

export async function logoutApi(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' })
    }).catch(() => {});
  }
  setStoredToken(null);
}

// PROTECTED CORE API ENDPOINTS
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
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
  userMessage?: string,
  options?: { skipChatMessage?: boolean; forceReanalyze?: boolean }
): Promise<ChatResponsePayload> {
  const res = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      caseId,
      filename: file.name,
      fileSize: file.size,
      fileType: file.type,
      userMessage,
      skipChatMessage: options?.skipChatMessage,
      forceReanalyze: options?.forceReanalyze
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
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
