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

  public remoteUsers: Map<string | number, IAgoraRTCRemoteUser> = new Map();
  public isScreenSharing = false;

  public onRemoteUserChanged?: (users: IAgoraRTCRemoteUser[]) => void;
  public onConnectionStateChanged?: (state: ConnectionState, reason?: string) => void;
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
        if (this.onConnectionStateChanged) {
          this.onConnectionStateChanged(curState, reason);
        }
      });

      // Handle remote user publication
      this.client.on('user-published', async (user, mediaType) => {
        if (!this.client) return;
        await this.client.subscribe(user, mediaType);
        this.remoteUsers.set(user.uid, user);
        
        if (this.onRemoteUserChanged) {
          this.onRemoteUserChanged(Array.from(this.remoteUsers.values()));
        }

        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      this.client.on('user-unpublished', (_user, _mediaType) => {
        if (this.onRemoteUserChanged) {
          this.onRemoteUserChanged(Array.from(this.remoteUsers.values()));
        }
      });

      this.client.on('user-left', (user, _reason) => {
        this.remoteUsers.delete(user.uid);
        if (this.onRemoteUserChanged) {
          this.onRemoteUserChanged(Array.from(this.remoteUsers.values()));
        }
      });

      // Join Agora channel
      await this.client.join(appId, channelName, token, uid);

      // Create Microphone & Camera Tracks
      const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: 'speech_standard' },
        { encoderConfig: '720p_1' }
      );

      this.localAudioTrack = micTrack;
      this.localVideoTrack = camTrack;

      // Publish local tracks to channel
      await this.client.publish([this.localAudioTrack, this.localVideoTrack]);

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

  public playLocalVideo(element: HTMLElement) {
    if (this.localScreenTrack) {
      this.localScreenTrack.play(element);
    } else if (this.localVideoTrack) {
      this.localVideoTrack.play(element);
    }
  }

  public playRemoteVideo(user: IAgoraRTCRemoteUser, element: HTMLElement) {
    if (user.videoTrack) {
      user.videoTrack.play(element);
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
        });

        const screenTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
        this.localScreenTrack = screenTrack;

        if (this.localVideoTrack) {
          await this.client.unpublish(this.localVideoTrack);
        }

        await this.client.publish(this.localScreenTrack);
        this.isScreenSharing = true;

        // Handle screen share stop via browser native UI
        screenTrack.on('track-ended', async () => {
          await this.stopScreenShare();
        });

        return true;
      } else {
        await this.stopScreenShare();
        return false;
      }
    } catch (err: any) {
      console.error('Screen sharing error:', err);
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
