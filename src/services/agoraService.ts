import AgoraRTC from 'agora-rtc-sdk-ng';
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  IAgoraRTCRemoteUser,
  ConnectionState
} from 'agora-rtc-sdk-ng';

// Disable verbose SDK logs for clean console
AgoraRTC.setLogLevel(2);

export interface RemoteParticipant {
  uid: string | number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
}

export class AgoraConsultationEngine {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private localScreenTrack: ILocalVideoTrack | null = null;
  private remoteVideoContainerElement: HTMLElement | null = null;

  public remoteUsers: Map<string | number, IAgoraRTCRemoteUser> = new Map();
  public isScreenSharing = false;

  public onRemoteUserChanged?: (users: IAgoraRTCRemoteUser[]) => void;
  public onConnectionStateChanged?: (state: ConnectionState, reason?: string) => void;
  public onScreenShareEnded?: () => void;
  public onError?: (errorMsg: string) => void;

  public async initializeAndJoin(
    appId: string,
    channelName: string,
    token: string,
    uid: number
  ) {
    try {
      this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

      // Register connection state listener
      this.client.on('connection-state-change', (curState, _revState, reason) => {
        console.log(`[Agora] Connection state changed: ${curState} (Reason: ${reason || 'normal'})`);
        if (this.onConnectionStateChanged) {
          this.onConnectionStateChanged(curState, reason);
        }
      });

      // Handle remote user publication
      this.client.on('user-published', async (user, mediaType) => {
        if (!this.client) return;
        console.log(`[Agora] Remote user published ${mediaType}. UID: ${user.uid}`);
        try {
          console.log(`[Agora] Subscribing to remote ${mediaType} for UID: ${user.uid}...`);
          await this.client.subscribe(user, mediaType);
          console.log(`[Agora] Remote ${mediaType} subscribed successfully for UID: ${user.uid}`);
          
          this.remoteUsers.set(user.uid, user);
          
          if (mediaType === 'audio') {
            user.audioTrack?.play();
            console.log(`[Agora] Playing remote audio for UID: ${user.uid}`);
          }

          if (mediaType === 'video' && user.videoTrack) {
            console.log(`[Agora] Remote video track available for UID: ${user.uid}`);
            if (this.remoteVideoContainerElement) {
              console.log(`[Agora] Auto-playing remote video into container element for UID: ${user.uid}`);
              user.videoTrack.play(this.remoteVideoContainerElement);
            }
          }

          if (this.onRemoteUserChanged) {
            this.onRemoteUserChanged(Array.from(this.remoteUsers.values()));
          }
        } catch (subErr) {
          console.error(`[Agora] Remote subscription failed for UID ${user.uid} (${mediaType}):`, subErr);
        }
      });

      this.client.on('user-unpublished', (user, mediaType) => {
        console.log(`[Agora] Remote user unpublished ${mediaType}. UID: ${user.uid}`);
        if (mediaType === 'video' && user.videoTrack) {
          try { user.videoTrack.stop(); } catch (_) {}
        }
        if (mediaType === 'audio' && user.audioTrack) {
          try { user.audioTrack.stop(); } catch (_) {}
        }
        this.remoteUsers.set(user.uid, user);
        if (this.onRemoteUserChanged) {
          this.onRemoteUserChanged(Array.from(this.remoteUsers.values()));
        }
      });

      this.client.on('user-left', (user, reason) => {
        console.log(`[Agora] Remote user left channel. UID: ${user.uid}, Reason: ${reason}`);
        if (user.videoTrack) {
          try { user.videoTrack.stop(); } catch (_) {}
        }
        if (user.audioTrack) {
          try { user.audioTrack.stop(); } catch (_) {}
        }
        this.remoteUsers.delete(user.uid);
        if (this.onRemoteUserChanged) {
          this.onRemoteUserChanged(Array.from(this.remoteUsers.values()));
        }
      });

      // Join Agora channel
      await this.client.join(appId, channelName, token, uid);
      console.log(`[Agora] Joined channel: ${channelName} | UID: ${uid}`);

      // Subscribe to any existing remote users who joined before local participant
      if (this.client.remoteUsers && this.client.remoteUsers.length > 0) {
        console.log(`[Agora] Found ${this.client.remoteUsers.length} pre-existing remote user(s) in channel`);
        for (const remoteUser of this.client.remoteUsers) {
          try {
            if (remoteUser.hasAudio) {
              console.log(`[Agora] Subscribing to existing remote audio for UID: ${remoteUser.uid}...`);
              await this.client.subscribe(remoteUser, 'audio');
              remoteUser.audioTrack?.play();
            }
            if (remoteUser.hasVideo) {
              console.log(`[Agora] Subscribing to existing remote video for UID: ${remoteUser.uid}...`);
              await this.client.subscribe(remoteUser, 'video');
              if (this.remoteVideoContainerElement && remoteUser.videoTrack) {
                console.log(`[Agora] Playing existing remote video into container element for UID: ${remoteUser.uid}`);
                remoteUser.videoTrack.play(this.remoteVideoContainerElement);
              }
            }
            this.remoteUsers.set(remoteUser.uid, remoteUser);
          } catch (existingSubErr) {
            console.error(`[Agora] Error subscribing to existing remote user ${remoteUser.uid}:`, existingSubErr);
          }
        }
        if (this.onRemoteUserChanged) {
          this.onRemoteUserChanged(Array.from(this.remoteUsers.values()));
        }
      }

      // Create Microphone & Camera Tracks
      const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: 'speech_standard' },
        { encoderConfig: '720p_1' }
      );

      this.localAudioTrack = micTrack;
      this.localVideoTrack = camTrack;

      // Publish local tracks to channel
      await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
      console.log(`[Agora] Local audio published for UID: ${uid}`);
      console.log(`[Agora] Local video published for UID: ${uid}`);

      return {
        localAudioTrack: this.localAudioTrack,
        localVideoTrack: this.localVideoTrack
      };
    } catch (err: any) {
      console.error('Agora RTC Initialization Error:', err);
      if (this.onError) {
        this.onError(err.message || 'Failed to initialize video devices or connect to Agora channel');
      }
      throw err;
    }
  }

  /**
   * Set the remote video container element early so that user-published
   * can auto-play into it immediately without waiting for React effects.
   */
  public setRemoteVideoContainer(element: HTMLElement | null) {
    this.remoteVideoContainerElement = element;
  }

  public playLocalVideo(element: HTMLElement | null) {
    if (!element) return;
    try {
      if (this.localScreenTrack) {
        this.localScreenTrack.play(element);
      } else if (this.localVideoTrack) {
        this.localVideoTrack.play(element);
      }
    } catch (err) {
      console.error('[Agora Service] Error playing local video track:', err);
    }
  }

  public playRemoteVideo(user: IAgoraRTCRemoteUser | null, element: HTMLElement | null) {
    if (!element || !user) return;
    this.remoteVideoContainerElement = element;
    if (!user.videoTrack) return;
    try {
      user.videoTrack.play(element);
    } catch (err) {
      console.error(`[Agora Service] Error playing remote video track for user ${user.uid}:`, err);
    }
  }

  public async setMicrophoneMuted(muted: boolean) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(!muted);
    }
  }

  public async setCameraMuted(muted: boolean) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(!muted);
    }
  }

  public async toggleScreenShare(): Promise<boolean> {
    if (!this.client) return false;

    try {
      if (!this.isScreenSharing) {
        // Start screen sharing
        const screenTrackResult = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: '1080p_2'
        }, 'auto');

        const screenTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
        this.localScreenTrack = screenTrack;

        if (this.localVideoTrack) {
          await this.client.unpublish(this.localVideoTrack);
        }

        await this.client.publish(this.localScreenTrack);
        this.isScreenSharing = true;

        // Handle screen share stop via browser native floating bar
        screenTrack.on('track-ended', async () => {
          await this.stopScreenShare();
          if (this.onScreenShareEnded) {
            this.onScreenShareEnded();
          }
        });

        return true;
      } else {
        await this.stopScreenShare();
        if (this.onScreenShareEnded) {
          this.onScreenShareEnded();
        }
        return false;
      }
    } catch (err: any) {
      console.error('Screen sharing creation/publish error:', err);
      return false;
    }
  }

  private async stopScreenShare() {
    if (!this.client || !this.isScreenSharing) return;

    try {
      if (this.localScreenTrack) {
        await this.client.unpublish(this.localScreenTrack);
        this.localScreenTrack.stop();
        this.localScreenTrack.close();
        this.localScreenTrack = null;
      }

      if (this.localVideoTrack) {
        await this.client.publish(this.localVideoTrack);
      }

      this.isScreenSharing = false;
    } catch (err) {
      console.error('Error stopping screen share:', err);
    }
  }

  public async leaveAndCleanUp() {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      if (this.localScreenTrack) {
        this.localScreenTrack.stop();
        this.localScreenTrack.close();
        this.localScreenTrack = null;
      }

      if (this.client) {
        await this.client.leave();
        this.client.removeAllListeners();
        this.client = null;
      }

      this.remoteUsers.clear();
      this.isScreenSharing = false;
    } catch (err) {
      console.error('Error leaving Agora consultation channel:', err);
    }
  }
}
