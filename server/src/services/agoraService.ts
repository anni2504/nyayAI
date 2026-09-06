import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { logger } from '../utils/logger.js';

const AGORA_APP_ID = (process.env.AGORA_APP_ID || '').trim();
const AGORA_APP_CERTIFICATE = (process.env.AGORA_APP_CERTIFICATE || '').trim();

export interface GeneratedAgoraToken {
  token: string;
  channelName: string;
  appId: string;
  uid: number;
  expiresInSeconds: number;
}

export function generateAgoraRtcToken(
  bookingId: string,
  userId: string,
  numericUid: number
): GeneratedAgoraToken {
  if (!AGORA_APP_ID) {
    throw new Error('Agora credentials (AGORA_APP_ID) are missing on the backend.');
  }
  if (!AGORA_APP_CERTIFICATE) {
    throw new Error('Agora credentials (AGORA_APP_CERTIFICATE) are missing on the backend.');
  }

  // Create deterministic channel name for booking
  const channelName = `nyayai-consultation-${bookingId}`;
  
  // 1 hour token expiration
  const expiresInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expiresInSeconds;

  // Generate publisher token for 1-to-1 video stream (requires 7 params)
  const token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    numericUid,
    RtcRole.PUBLISHER,
    expiresInSeconds,
    privilegeExpiredTs
  );

  logger.info(`Generated Agora RTC token for channel ${channelName}, numericUid ${numericUid}, user ${userId}`);

  return {
    token,
    channelName,
    appId: AGORA_APP_ID,
    uid: numericUid,
    expiresInSeconds
  };
}
