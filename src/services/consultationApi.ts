import { API_BASE_URL, getStoredToken } from './api.js';

export interface BookingData {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  advocateId: string;
  advocateName: string;
  advocateAvatar?: string;
  advocateTitle?: string;
  date: string;
  timeSlot: string;
  matterTitle: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  fee: string;
}

export interface JoinConsultationResponse {
  success: boolean;
  token: string;
  channelName: string;
  appId: string;
  uid: number;
  expiresInSeconds: number;
  booking: BookingData;
  userRole: 'CLIENT' | 'ADVOCATE';
  userName: string;
}

export async function fetchUserBookings(): Promise<BookingData[]> {
  const token = getStoredToken();
  if (!token) return [];

  const res = await fetch(`${API_BASE_URL}/consultations/bookings`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch user bookings');
  }

  const data = await res.json();
  return data.bookings || [];
}

export async function joinConsultationApi(bookingId: string): Promise<JoinConsultationResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Consultation Access Error — Authentication required. Please sign in to join consultation.');
  }

  const res = await fetch(`${API_BASE_URL}/consultations/${bookingId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to join consultation.');
  }

  return data;
}

export async function endConsultationApi(bookingId: string, durationSeconds: number) {
  const token = getStoredToken();
  if (!token) return;

  await fetch(`${API_BASE_URL}/consultations/${bookingId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ durationSeconds })
  });
}

export async function saveConsultationNotesApi(bookingId: string, notes: string) {
  const token = getStoredToken();
  if (!token) return;

  const res = await fetch(`${API_BASE_URL}/consultations/${bookingId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ notes })
  });

  if (!res.ok) {
    throw new Error('Failed to save consultation notes');
  }

  return await res.json();
}
