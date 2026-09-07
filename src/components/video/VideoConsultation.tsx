import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { joinConsultationApi, endConsultationApi } from '../../services/consultationApi';
import type { JoinConsultationResponse, ConsultationMessage } from '../../services/consultationApi';
import { fetchConsultationMessages, sendConsultationMessageApi } from '../../services/consultationApi';
import { connectChatSocket, disconnectChatSocket, sendChatSocketMessage } from '../../services/chatSocket';
import { AgoraConsultationEngine } from '../../services/agoraService';
import { PreCallDeviceCheck } from './PreCallDeviceCheck';
import { VideoControls } from './VideoControls';
import { PostConsultationSummary } from './PostConsultationSummary';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  User,
  Wifi,
  AlertCircle,
  VideoOff,
  MicOff,
  Monitor,
  MessageSquare,
  Send,
  Lock
} from 'lucide-react';
import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

interface VideoConsultationProps {
  bookingId: string;
  userRole: 'CLIENT' | 'ADVOCATE';
}

export const VideoConsultation: React.FC<VideoConsultationProps> = ({
  bookingId,
  userRole
}) => {
  const { user } = useAuth();
  const [engine] = useState(() => new AgoraConsultationEngine());

  const [step, setStep] = useState<'device_check' | 'connecting' | 'connected' | 'ended'>('device_check');
  const [joinData, setJoinData] = useState<JoinConsultationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Participant & Media states
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [remoteTrackVersion, setRemoteTrackVersion] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('DISCONNECTED');
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Callback refs to guarantee DOM elements are captured as soon as mounted
  const [localVideoElement, setLocalVideoElement] = useState<HTMLDivElement | null>(null);
  const [remoteVideoElement, setRemoteVideoElement] = useState<HTMLDivElement | null>(null);

  // Secure in-session chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatConnected, setChatConnected] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // 1. Fetch backend Agora token & booking info on mount
  useEffect(() => {
    async function loadToken() {
      try {
        const response = await joinConsultationApi(bookingId);
        setJoinData(response);
      } catch (err: any) {
        console.error('Failed to join consultation backend route:', err);
        setErrorMsg(err.message || 'Access Denied: Unable to authorize consultation session.');
      }
    }

    loadToken();
  }, [bookingId]);

  // 2. Call Timer effect
  useEffect(() => {
    if (step !== 'connected') return;

    const timer = setInterval(() => {
      setDurationSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Secure in-session chat: load history + attach realtime socket once connected
  useEffect(() => {
    if (step !== 'connected' || !bookingId) return;

    let disposed = false;

    fetchConsultationMessages(bookingId)
      .then((history) => {
        if (!disposed) setMessages(history || []);
      })
      .catch(() => {
        if (!disposed) setChatError('Unable to load chat history.');
      });

    connectChatSocket(bookingId, {
      onConnected: () => {
        if (!disposed) {
          setChatConnected(true);
          setChatError(null);
        }
      },
      onMessage: (msg) => {
        if (disposed) return;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      },
      onError: (errMsg) => {
        if (!disposed) setChatError(errMsg);
      }
    });

    return () => {
      disposed = true;
      setChatConnected(false);
      disconnectChatSocket();
    };
  }, [step, bookingId]);

  // Also disconnect the chat socket on unmount / call end
  useEffect(() => {
    return () => {
      disconnectChatSocket();
    };
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    // Send via socket when live; otherwise fall back to REST (persists either way)
    sendChatSocketMessage(bookingId, text, (sent) => {
      if (!sent) {
        sendConsultationMessageApi(bookingId, text)
          .then((saved) => setMessages(prev => [...prev, saved]))
          .catch(() => setChatError('Message failed to send. Please try again.'));
      }
    });
    setChatInput('');
  };

  // 3. Setup Agora Call handlers and join channel
  const handleStartConsultation = async () => {
    if (!joinData) return;
    setStep('connecting');

    try {
      engine.onRemoteUserChanged = (users) => {
        setRemoteUsers([...users]);
        setRemoteTrackVersion(v => v + 1);
      };

      engine.onConnectionStateChanged = (state) => {
        setConnectionState(state);
      };

      engine.onScreenShareEnded = () => {
        setIsScreenSharing(false);
        if (localVideoElement) {
          engine.playLocalVideo(localVideoElement);
        }
      };

      engine.onError = (msg) => {
        setErrorMsg(msg);
      };

      await engine.initializeAndJoin(
        joinData.appId,
        joinData.channelName,
        joinData.token,
        joinData.uid
      );

      setStep('connected');
    } catch (err: any) {
      console.error('Error starting consultation session:', err);
      setErrorMsg(err.message || 'Connection failed. Check camera/mic permissions.');
      setStep('device_check');
    }
  };

  // Play local video preview as soon as local DOM container mounts or screen sharing changes
  useEffect(() => {
    if (step === 'connected' && localVideoElement) {
      engine.playLocalVideo(localVideoElement);
    }
  }, [step, localVideoElement, isScreenSharing, engine]);

  // Register remote video container on the engine as soon as it mounts,
  // so user-published can auto-play immediately without waiting for React state updates
  useEffect(() => {
    engine.setRemoteVideoContainer(remoteVideoElement);
  }, [remoteVideoElement, engine]);

  // Play remote video whenever remote container mounts or primary remote user publishes/updates video (camera or screen share)
  const primaryRemoteUser = remoteUsers.length > 0 ? remoteUsers[0] : null;

  useEffect(() => {
    if (
      step === 'connected' &&
      remoteVideoElement &&
      primaryRemoteUser &&
      primaryRemoteUser.hasVideo &&
      primaryRemoteUser.videoTrack
    ) {
      // Also play via React effect as a fallback in case user-published auto-play missed a timing window
      engine.playRemoteVideo(primaryRemoteUser, remoteVideoElement);
    }
  }, [
    step,
    remoteVideoElement,
    primaryRemoteUser,
    primaryRemoteUser?.hasVideo,
    primaryRemoteUser?.videoTrack,
    remoteTrackVersion,
    engine
  ]);

  // Handle Media Toggles
  const handleToggleMic = async () => {
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    await engine.setMicrophoneMuted(nextMuted);
  };

  const handleToggleCamera = async () => {
    const nextMuted = !isCameraMuted;
    setIsCameraMuted(nextMuted);
    await engine.setCameraMuted(nextMuted);
  };

  const handleToggleScreenShare = async () => {
    const active = await engine.toggleScreenShare();
    setIsScreenSharing(active);
    if (localVideoElement) {
      engine.playLocalVideo(localVideoElement);
    }
  };

  const handleEndCall = async () => {
    await engine.leaveAndCleanUp();
    if (joinData) {
      endConsultationApi(joinData.booking.id, durationSeconds).catch(console.error);
    }
    setStep('ended');
  };

  // Clean up WebRTC tracks on unmount
  useEffect(() => {
    return () => {
      engine.leaveAndCleanUp();
    };
  }, [engine]);

  const handleReturnToDashboard = () => {
    if (userRole === 'CLIENT') {
      window.location.hash = '#/client/bookings';
    } else {
      window.location.hash = '#/advocate/clients';
    }
  };

  // Format Duration Timer (mm:ss)
  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // STEP 1: PRE-CALL DEVICE CHECK
  if (step === 'device_check') {
    if (errorMsg && !joinData) {
      return (
        <div className="min-h-screen bg-[#080D1F] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Consultation Access Error</h2>
          <p className="text-sm text-slate-300 max-w-md">{errorMsg}</p>
          <button
            onClick={handleReturnToDashboard}
            className="px-6 py-3 bg-[#29215F] hover:bg-[#382B8C] text-white font-bold text-xs rounded-xl border border-[#5146D8]/40 transition-smooth"
          >
            Return to Workspace
          </button>
        </div>
      );
    }

    if (!joinData) {
      return (
        <div className="min-h-screen bg-[#080D1F] text-white flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#5146D8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400">Verifying JWT Authorization & Booking Token...</p>
        </div>
      );
    }

    return (
      <PreCallDeviceCheck
        booking={joinData.booking}
        userRole={userRole}
        userName={user?.name || joinData.userName}
        onConfirmJoin={handleStartConsultation}
      />
    );
  }

  // STEP 2: CONNECTING AGORA WEBRTC
  if (step === 'connecting') {
    return (
      <div className="min-h-screen bg-[#080D1F] text-white flex flex-col items-center justify-center space-y-6 text-center p-6 select-none">
        <div className="w-24 h-24 rounded-3xl bg-white/10 border border-white/15 p-3 flex items-center justify-center relative shadow-2xl backdrop-blur-md">
          <div className="absolute -inset-3 rounded-3xl border border-[#D89947]/40 animate-ping opacity-30" />
          <img
            src="/assets/nyayai-emblem-light.png"
            alt="NyayAI Emblem"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Connecting Secure Channel...</h2>
          <p className="text-[11px] text-slate-400">Establishing encrypted WebRTC connection with NyayAI</p>
        </div>
      </div>
    );
  }

  // STEP 3: POST-CONSULTATION ENDED SUMMARY
  if (step === 'ended' && joinData) {
    return (
      <PostConsultationSummary
        booking={joinData.booking}
        userRole={userRole}
        durationSeconds={durationSeconds}
        onReturnToDashboard={handleReturnToDashboard}
      />
    );
  }

  // STEP 4: ACTIVE 1-TO-1 WEBRTC VIDEO CONSULTATION ROOM
  const booking = joinData!.booking;
  const counterpartyName = userRole === 'CLIENT' ? booking.advocateName : booking.clientName;

  return (
    <div className="min-h-screen bg-[#060913] text-white flex flex-col justify-between p-3 sm:p-6 overflow-hidden relative select-none font-sans">
      
      {/* TOP CONSULTATION HEADER */}
      <div className="relative z-20 flex items-center justify-between bg-gradient-to-r from-[#080D1F]/90 via-[#121833]/90 to-[#080D1F]/90 p-3.5 sm:px-6 rounded-2xl border border-[#29215F]/80 backdrop-blur-xl shadow-xl">
        
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 p-1.5 flex items-center justify-center shadow-md shrink-0">
            <img
              src="/assets/nyayai-emblem-light.png"
              alt="NyayAI Emblem"
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>NYAYAI Video Consultation</span>
              <Sparkles className="w-3.5 h-3.5 text-[#F4B400] animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
              {booking.matterTitle}
            </p>
          </div>
        </div>

        {/* CENTER STATUS & DURATION TIMER */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-[#080D1F] px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-[#F4B400]" />
            <span className="font-bold text-white tracking-widest">{formatTimer(durationSeconds)}</span>
          </div>

          <div className="hidden md:flex items-center space-x-2 bg-emerald-950/80 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{connectionState.toUpperCase()}</span>
          </div>
        </div>

        {/* RIGHT SECURITY BADGE */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChatOpen(open => !open)}
            className={`text-[11px] font-mono px-3 py-1.5 rounded-full border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
              chatOpen
                ? 'bg-[#F4B400]/20 text-[#F4B400] border-[#F4B400]/50'
                : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Secure Chat</span>
            {chatConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Private Session</span>
          </span>
        </div>

      </div>

      {/* MAIN VIDEO GRID AREA */}
      <div className="relative flex-1 my-3 bg-gradient-to-b from-[#080D1F] to-[#121833] rounded-3xl border border-[#29215F]/80 overflow-hidden shadow-2xl flex items-center justify-center">
        
        {/* DOMINANT REMOTE PARTICIPANT VIEW CONTAINER (PERSISTENTLY MOUNTED FOR WEBRTC CANVAS) */}
        <div
          ref={setRemoteVideoElement}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 [&>div]:!w-full [&>div]:!h-full [&>video]:!object-cover ${
            primaryRemoteUser ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        />

        {/* REMOTE PARTICIPANT LIVE STATUS OVERLAY */}
        {primaryRemoteUser && (
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
            <div className="bg-[#080D1F]/90 backdrop-blur px-3.5 py-1.5 rounded-xl border border-[#29215F] text-xs font-bold text-white flex items-center space-x-2 shadow-lg">
              <User className="w-3.5 h-3.5 text-[#F4B400]" />
              <span>{counterpartyName}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                primaryRemoteUser.videoTrack || primaryRemoteUser.hasVideo
                  ? 'text-emerald-400 bg-emerald-950 border-emerald-500/30'
                  : 'text-amber-400 bg-amber-950 border-amber-500/30'
              }`}>
                {primaryRemoteUser.videoTrack || primaryRemoteUser.hasVideo ? 'ONLINE · IN CONSULTATION' : 'CAMERA PAUSED'}
              </span>
            </div>
          </div>
        )}

        {/* REMOTE USER CAMERA OFF / PAUSED STATE */}
        {primaryRemoteUser && !primaryRemoteUser.hasVideo && (
          <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md select-none">
            <div className="w-20 h-20 rounded-full bg-[#121833] border-2 border-[#29215F] flex items-center justify-center text-indigo-400">
              <VideoOff className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{counterpartyName}</h3>
              <p className="text-xs text-slate-400">Remote participant camera is currently muted or paused</p>
            </div>
          </div>
        )}

        {/* WAITING FOR REMOTE PARTICIPANT TO JOIN STATE */}
        {!primaryRemoteUser && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md select-none">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#29215F] to-[#080D1F] border-2 border-[#F4B400]/60 flex items-center justify-center relative shadow-2xl">
              <div className="absolute -inset-2 rounded-full border border-indigo-500/30 animate-ping" />
              <User className="w-9 h-9 text-[#F4B400]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                Waiting for {counterpartyName} to join...
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The consultation room is ready. Once {userRole === 'CLIENT' ? 'Adv. ' + booking.advocateName : booking.clientName} joins, video and audio will connect automatically.
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-[#080D1F] px-3.5 py-1.5 rounded-full border border-[#29215F] text-[11px] font-mono text-indigo-300">
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Ready · Waiting for connection</span>
            </div>
          </div>
        )}

        {/* FLOATING LOCAL PREVIEW (PICTURE-IN-PICTURE) */}
        <div className="absolute bottom-4 right-4 z-30 w-36 sm:w-48 aspect-video bg-[#060913] rounded-2xl border-2 border-[#5146D8]/60 shadow-2xl overflow-hidden group hover:scale-105 transition-all">
          <div
            ref={setLocalVideoElement}
            className="w-full h-full object-cover transform -scale-x-100 [&>div]:!w-full [&>div]:!h-full [&>video]:!object-cover"
          />
          
          {/* LOCAL ACTIVITY STATUS OVERLAY */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono bg-slate-950/80 px-2 py-1 rounded backdrop-blur border border-slate-800">
            <span className="truncate text-slate-200 font-bold">You ({userRole})</span>
            <div className="flex items-center space-x-1">
              {isMicMuted && <MicOff className="w-3 h-3 text-rose-400" />}
              {isCameraMuted && <VideoOff className="w-3 h-3 text-rose-400" />}
              {isScreenSharing && <Monitor className="w-3 h-3 text-[#F4B400]" />}
            </div>
          </div>
        </div>

        {/* SECURE IN-SESSION CHAT PANEL */}
        {chatOpen && (
          <div className="absolute top-3 right-3 bottom-3 z-40 w-full max-w-xs sm:w-80 bg-[#0A0F24]/95 backdrop-blur-xl border border-[#29215F] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-[#F4B400]" />
                <h3 className="text-xs font-extrabold text-white tracking-wide">Secure Consultation Chat</h3>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${chatConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {chatConnected ? 'Encrypted' : 'Offline'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 min-h-0">
              {chatError && (
                <p className="text-[10px] text-amber-400 font-mono">{chatError}</p>
              )}
              {messages.length === 0 && !chatError && (
                <p className="text-[11px] text-slate-400 text-center py-6 leading-relaxed">
                  No messages yet. Share case notes or questions with {counterpartyName} during this secure consultation.
                </p>
              )}
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      isOwn
                        ? 'bg-[#5146D8]/80 text-white rounded-br-sm'
                        : 'bg-white/10 text-slate-200 rounded-bl-sm border border-white/10'
                    }`}>
                      <p className="text-[9px] font-mono font-bold uppercase tracking-wider opacity-70 mb-0.5">
                        {isOwn ? 'You' : msg.sender_name || 'Participant'}
                      </p>
                      <p className="break-words">{msg.content}</p>
                      <p className="text-[9px] font-mono opacity-50 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="shrink-0 p-2.5 border-t border-white/10 flex items-center space-x-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a secure message..."
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#5146D8] transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-[#5146D8] hover:bg-[#6359E8] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* BOTTOM CONTROLS BAR */}
      <div className="relative z-20 pt-1">
        <VideoControls
          isMicMuted={isMicMuted}
          isCameraMuted={isCameraMuted}
          isScreenSharing={isScreenSharing}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onEndCall={handleEndCall}
        />
      </div>

    </div>
  );
};
