function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

  // 1. Use non-localhost explicit env variable if provided
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. Production browser runtime check: any deployed domain (e.g., vercel.app) must use Render API
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://nyayai-q4bc.onrender.com/api/v1';
  }

  // 3. Vite production build check: default to Render API for production bundles
  if (import.meta.env.PROD) {
    return 'https://nyayai-q4bc.onrender.com/api/v1';
  }

  // 4. Local development fallback
  return 'http://localhost:5001/api/v1';
}

export const API_BASE_URL = getApiBaseUrl();

export const TOKEN_KEY = 'nyayai_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('nyayai_token');
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('nyayai_token', token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('nyayai_token');
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
  const targetUrl = `${API_BASE_URL}/auth/login`;
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await res.json().catch(() => ({ message: `Server returned non-JSON response (HTTP ${res.status} ${res.statusText})` }));
    if (!res.ok) {
      throw new Error(data.message || `Authentication failed (HTTP ${res.status} ${res.statusText}).`);
    }

    return data;
  } catch (err: any) {
    console.error(`[NYAYAI Auth Error] POST ${targetUrl} failed:`, err);
    if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message === 'Load failed')) {
      throw new Error(`Unable to connect to authentication server at [${targetUrl}]. Please check network connectivity.`);
    }
    throw err;
  }
}

export async function registerApi(userData: {
  name: string;
  email: string;
  password: string;
  role: 'CLIENT' | 'ADVOCATE';
  title?: string;
  barNumber?: string;
}): Promise<AuthApiResponse> {
  const targetUrl = `${API_BASE_URL}/auth/register`;
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await res.json().catch(() => ({ message: `Server returned non-JSON response (HTTP ${res.status} ${res.statusText})` }));
    if (!res.ok) {
      throw new Error(data.message || `Registration failed (HTTP ${res.status} ${res.statusText}).`);
    }

    return data;
  } catch (err: any) {
    console.error(`[NYAYAI Auth Error] POST ${targetUrl} failed:`, err);
    if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message === 'Load failed')) {
      throw new Error(`Unable to connect to registration server at [${targetUrl}]. Please check network connectivity.`);
    }
    throw err;
  }
}

export async function getMeApi(token?: string): Promise<{ user: AuthUserResponse }> {
  const authToken = token || getStoredToken();
  if (!authToken) {
    throw new Error('No authentication token found.');
  }

  const targetUrl = `${API_BASE_URL}/auth/me`;
  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await res.json().catch(() => ({ message: `Server returned non-JSON response (HTTP ${res.status} ${res.statusText})` }));
    if (!res.ok) {
      throw new Error(data.message || `Session verification failed (HTTP ${res.status}).`);
    }

    return data;
  } catch (err: any) {
    console.error(`[NYAYAI Auth Error] GET ${targetUrl} failed:`, err);
    throw err;
  }
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
