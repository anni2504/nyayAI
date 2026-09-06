import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { joinConsultationApi, endConsultationApi } from '../../services/consultationApi';
import type { JoinConsultationResponse } from '../../services/consultationApi';
import { AgoraConsultationEngine } from '../../services/agoraService';
import { PreCallDeviceCheck } from './PreCallDeviceCheck';
import { VideoControls } from './VideoControls';
import { PostConsultationSummary } from './PostConsultationSummary';
import {
  Scale,
  Sparkles,
  ShieldCheck,
  Clock,
  User,
  Wifi,
  AlertCircle,
  VideoOff,
  MicOff,
  Monitor
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
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('DISCONNECTED');
  const [durationSeconds, setDurationSeconds] = useState(0);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

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

  // 3. Setup Agora Call handlers and join channel
  const handleStartConsultation = async () => {
    if (!joinData) return;
    setStep('connecting');

    try {
      engine.onRemoteUserChanged = (users) => {
        setRemoteUsers([...users]);
      };

      engine.onConnectionStateChanged = (state) => {
        setConnectionState(state);
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

      // Play local video preview after DOM render
      setTimeout(() => {
        if (localVideoRef.current) {
          engine.playLocalVideo(localVideoRef.current);
        }
      }, 300);
    } catch (err: any) {
      console.error('Error starting WebRTC session:', err);
      setErrorMsg(err.message || 'WebRTC Connection Failed. Check camera/mic permissions.');
      setStep('device_check');
    }
  };

  // Play remote video when remote user joins or renders
  useEffect(() => {
    if (step === 'connected' && remoteUsers.length > 0 && remoteVideoRef.current) {
      const primaryRemote = remoteUsers[0];
      if (primaryRemote) {
        engine.playRemoteVideo(primaryRemote, remoteVideoRef.current);
      }
    }
  }, [remoteUsers, step, engine]);

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
      <div className="min-h-screen bg-[#080D1F] text-white flex flex-col items-center justify-center space-y-4 text-center p-6 select-none">
        <div className="w-16 h-16 rounded-full bg-indigo-950/80 border-2 border-indigo-500/60 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full border border-amber-400/40 animate-ping" />
          <Scale className="w-8 h-8 text-[#F4B400]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Connecting Secure Consultation Channel...</h2>
          <p className="text-xs font-mono text-indigo-300">Channel: {joinData?.channelName}</p>
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
  const primaryRemoteUser = remoteUsers.length > 0 ? remoteUsers[0] : null;
  const counterpartyName = userRole === 'CLIENT' ? booking.advocateName : booking.clientName;

  return (
    <div className="min-h-screen bg-[#060913] text-white flex flex-col justify-between p-3 sm:p-6 overflow-hidden relative select-none font-sans">
      
      {/* TOP CONSULTATION HEADER */}
      <div className="relative z-20 flex items-center justify-between bg-gradient-to-r from-[#080D1F]/90 via-[#121833]/90 to-[#080D1F]/90 p-3.5 sm:px-6 rounded-2xl border border-[#29215F]/80 backdrop-blur-xl shadow-xl">
        
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#080D1F] to-[#29215F] text-[#F4B400] flex items-center justify-center font-black border border-[#5146D8]/30">
            <Scale className="w-4 h-4 text-[#F4B400]" />
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

        {/* RIGHT ENCRYPTION BADGE */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">E2E ENCRYPTED</span>
          </span>
        </div>

      </div>

      {/* MAIN VIDEO GRID AREA */}
      <div className="relative flex-1 my-3 bg-gradient-to-b from-[#080D1F] to-[#121833] rounded-3xl border border-[#29215F]/80 overflow-hidden shadow-2xl flex items-center justify-center">
        
        {/* DOMINANT REMOTE PARTICIPANT VIEW */}
        {primaryRemoteUser ? (
          <div className="relative w-full h-full">
            <div ref={remoteVideoRef} className="w-full h-full object-cover" />

            {/* REMOTE PARTICIPANT LIVE ACTIVITY STATUS BADGE */}
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
              <div className="bg-[#080D1F]/90 backdrop-blur px-3.5 py-1.5 rounded-xl border border-[#29215F] text-xs font-bold text-white flex items-center space-x-2 shadow-lg">
                <User className="w-3.5 h-3.5 text-[#F4B400]" />
                <span>{counterpartyName}</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  ONLINE · IN CONSULTATION
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* WAITING FOR REMOTE PARTICIPANT TO JOIN STATE */
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
                The session channel is active and secured. Once {userRole === 'CLIENT' ? 'Adv. ' + booking.advocateName : booking.clientName} joins, WebRTC video & audio streams will connect automatically.
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-[#080D1F] px-3.5 py-1.5 rounded-full border border-[#29215F] text-[11px] font-mono text-indigo-300">
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Channel: {joinData?.channelName}</span>
            </div>
          </div>
        )}

        {/* FLOATING LOCAL PREVIEW (PICTURE-IN-PICTURE) */}
        <div className="absolute bottom-4 right-4 z-30 w-36 sm:w-48 aspect-video bg-[#060913] rounded-2xl border-2 border-[#5146D8]/60 shadow-2xl overflow-hidden group hover:scale-105 transition-all">
          <div ref={localVideoRef} className="w-full h-full object-cover transform -scale-x-100" />
          
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
