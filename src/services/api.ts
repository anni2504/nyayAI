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

// Registered by AuthProvider; invoked when any protected API call returns 401,
// so an expired/revoked session is cleared and the user is prompted to re-auth.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function handleUnauthorized(): void {
  setStoredToken(null);
  if (unauthorizedHandler) {
    unauthorizedHandler();
  }
}

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

/**
 * Authenticated request helper for protected endpoints.
 * On HTTP 401 it clears the stored session and notifies the auth provider so the
 * user is signed out everywhere instead of hitting repeated auth failures.
 */
export async function authedRequest<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Your session has expired. Please sign in again.');
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ message: 'API error' }));
    throw new Error(errData.message || `Server error ${res.status}`);
  }
  return await res.json();
}

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'ADVOCATE';
  avatar?: string;
  title?: string;
  barNumber?: string;
  phone?: string;
  preferredLanguage?: string;
  privacyConsent?: boolean;
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
  return authedRequest<ChatResponsePayload>(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ caseId, message, attachment })
  });
}

export async function uploadClientDocument(
  caseId: string,
  file: { name: string; size: string; type: string },
  userMessage?: string,
  options?: { skipChatMessage?: boolean; forceReanalyze?: boolean }
): Promise<ChatResponsePayload> {
  return authedRequest<ChatResponsePayload>(`${API_BASE_URL}/documents/upload`, {
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
}

export async function sendAdvocateAIChat(
  tool: string,
  query: string
): Promise<{ tool: string; output: string }> {
  return authedRequest<{ tool: string; output: string }>(`${API_BASE_URL}/advocate/ai/chat`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ tool, query })
  });
}

export async function getHealthStatus(): Promise<{ status: string; groqConfigured: boolean; model: string }> {
  const res = await fetch(`${API_BASE_URL}/ai/health`);
  return await res.json();
}

// PHASE 1: CLIENT DATA INTEGRITY & PERSISTENCE API ENDPOINTS

// ---- Cases ----
export interface LegalCaseSummary {
  id: string;
  clientId?: string;
  title: string;
  practiceArea: string;
  jurisdiction: string;
  proceduralStage: string;
  lastUpdated: string;
  status: 'Analysis in Progress' | 'Ready for Counsel' | 'In Court' | 'Closed';
  readinessScore: number;
  readinessStage: string;
  readinessBreakdown: {
    matterClarity: number;
    facts: number;
    jurisdiction: number;
    legalDomain: number;
    proceduralStage: number;
    documents: number;
    otherEvidence: number;
  };
  caseUnderstanding: Array<{ key: string; label: string; value: string; status: 'verified' | 'pending' | 'missing' }>;
  missingInformation: string[];
  legalDomain: string;
  documents: any[];
  recommendations: any[];
  messages: Array<{ role: string; content: string; timestamp: string }>;
  collectedFacts?: any;
  establishedFacts?: any[];
  discoveryStatus?: string;
  scoreHistory?: any[];
  quickResponses?: string[];
  legalAuthorities?: string[];
}

export interface CasesResponse {
  success: boolean;
  cases: LegalCaseSummary[];
}

export async function fetchClientCases(): Promise<CasesResponse> {
  return authedRequest<CasesResponse>(`${API_BASE_URL}/cases`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
}

export async function createClientCase(initialPrompt: string): Promise<{ success: boolean; case: LegalCaseSummary }> {
  return authedRequest<{ success: boolean; case: LegalCaseSummary }>(`${API_BASE_URL}/cases`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ initialPrompt })
  });
}

export async function fetchClientCase(caseId: string): Promise<{ success: boolean; case: LegalCaseSummary }> {
  return authedRequest<{ success: boolean; case: LegalCaseSummary }>(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
}

export async function updateClientCaseTitle(caseId: string, title: string): Promise<{ success: boolean; case: LegalCaseSummary }> {
  return authedRequest<{ success: boolean; case: LegalCaseSummary }>(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ title })
  });
}

// ---- Documents (persistence only, no AI analysis in Phase 1) ----
export interface DocumentRecord {
  id: string;
  client_id?: string;
  case_id: string | null;
  name: string;
  size: string;
  type: string;
  category: string;
  document_type: string;
  summary: string;
  upload_date: string;
  analysis_status: string;
  created_at: string;
  updated_at: string;
  analysis?: any;
}

export interface DocumentsResponse {
  success: boolean;
  documents: DocumentRecord[];
}

export async function fetchClientDocuments(): Promise<DocumentsResponse> {
  return authedRequest<DocumentsResponse>(`${API_BASE_URL}/documents`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
}

export async function storeClientDocument(
  file: { name: string; size: string; type: string },
  caseId?: string
): Promise<{ success: boolean; document: DocumentRecord }> {
  return authedRequest<{ success: boolean; document: DocumentRecord }>(`${API_BASE_URL}/documents`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size || '1.2 MB',
      fileType: file.type || 'application/pdf',
      caseId: caseId || null
    })
  });
}

export async function deleteClientDocument(docId: string): Promise<{ success: boolean; message: string }> {
  return authedRequest<{ success: boolean; message: string }>(`${API_BASE_URL}/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ---- Saved Advocates ----
export interface SavedAdvocatesResponse {
  success: boolean;
  advocates: any[];
}

export async function fetchSavedAdvocates(): Promise<SavedAdvocatesResponse> {
  return authedRequest<SavedAdvocatesResponse>(`${API_BASE_URL}/saved-advocates`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
}

export async function saveAdvocateApi(advocate: any): Promise<{ success: boolean; advocate: any }> {
  return authedRequest<{ success: boolean; advocate: any }>(`${API_BASE_URL}/saved-advocates`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ advocate })
  });
}

export async function removeSavedAdvocateApi(advocateId: string): Promise<{ success: boolean; message: string }> {
  return authedRequest<{ success: boolean; message: string }>(`${API_BASE_URL}/saved-advocates/${encodeURIComponent(advocateId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ---- Profile ----
export interface ProfileResponse {
  success: boolean;
  user: AuthUserResponse;
}

export async function fetchClientProfile(): Promise<ProfileResponse> {
  return authedRequest<ProfileResponse>(`${API_BASE_URL}/profile`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
}

export async function updateClientProfile(updates: {
  name?: string;
  phone?: string;
  preferredLanguage?: string;
  privacyConsent?: boolean;
  avatar?: string;
}): Promise<ProfileResponse> {
  return authedRequest<ProfileResponse>(`${API_BASE_URL}/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates)
  });
}

// ---- Bookings ----
export interface CreateBookingInput {
  advocateId: string;
  advocateName?: string;
  matterTitle: string;
  date: string;
  timeSlot: string;
  fee?: string;
  advocateAvatar?: string;
  advocateTitle?: string;
}

export async function createClientBooking(input: CreateBookingInput): Promise<{ success: boolean; booking: any }> {
  return authedRequest<{ success: boolean; booking: any }>(`${API_BASE_URL}/consultations/bookings`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });
}
