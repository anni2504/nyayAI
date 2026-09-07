import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, getStoredToken } from './api.js';
import type { ConsultationMessage } from './consultationApi.js';

function socketBaseUrl(): string {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.length > 0) {
    return envUrl;
  }
  const base = API_BASE_URL.replace(/\/api\/v\d+$/, '').replace(/\/api$/, '');
  return base.replace(/^http/, 'ws');
}

export interface ChatSocketHandlers {
  onMessage: (message: ConsultationMessage) => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
}

let activeSocket: Socket | null = null;

export function connectChatSocket(bookingId: string, handlers: ChatSocketHandlers): () => void {
  disconnectChatSocket();

  const token = getStoredToken();
  if (!token) return () => {};

  const socket = io(socketBaseUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 6,
    timeout: 10000
  });
  activeSocket = socket;

  socket.on('connect', () => {
    socket.emit('consultation:join', { bookingId }, (res: any) => {
      if (res && res.ok && handlers.onConnected) handlers.onConnected();
      if (!res || !res.ok) {
        socket.disconnect();
        if (handlers.onError) handlers.onError((res && res.error) || 'Could not join consultation chat.');
      }
    });
  });

  socket.on('consultation:message', (message: ConsultationMessage) => {
    if (message && message.booking_id === bookingId) handlers.onMessage(message);
  });

  socket.on('connect_error', () => {
    if (handlers.onError) handlers.onError('Realtime chat unavailable. Messages will still be saved.');
  });

  return () => {
    disconnectChatSocket();
  };
}

export function disconnectChatSocket(): void {
  if (activeSocket) {
    activeSocket.removeAllListeners();
    activeSocket.disconnect();
    activeSocket = null;
  }
}

export function sendChatSocketMessage(bookingId: string, content: string, onSent?: (ok: boolean) => void): void {
  if (!activeSocket || !activeSocket.connected) {
    if (onSent) onSent(false);
    return;
  }
  activeSocket.emit('consultation:message', { bookingId, content }, (res: any) => {
    if (onSent) onSent(!!(res && res.ok));
  });
}

export function isChatSocketConnected(): boolean {
  return !!(activeSocket && activeSocket.connected);
}