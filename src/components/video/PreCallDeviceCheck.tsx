import React, { useEffect, useRef, useState } from 'react';
import { Video, Mic, ShieldCheck, Scale, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BookingData } from '../../services/consultationApi';

interface PreCallDeviceCheckProps {
  booking: BookingData;
  userRole: 'CLIENT' | 'ADVOCATE';
  userName: string;
  onConfirmJoin: () => void;
}

export const PreCallDeviceCheck: React.FC<PreCallDeviceCheckProps> = ({
  booking,
  userRole,
  userName,
  onConfirmJoin
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [hasMic, setHasMic] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initPreview() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStream = mediaStream;
        setHasCamera(true);
        setHasMic(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.warn('Device preview permission error:', err);
        setErrorMsg('Camera or Microphone access was denied or device is unavailable. You can still join and test inside.');
        setHasCamera(false);
        setHasMic(false);
      }
    }

    initPreview();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const counterpartyName = userRole === 'CLIENT' ? booking.advocateName : booking.clientName;
  const counterpartyTitle = userRole === 'CLIENT' ? booking.advocateTitle : 'Client Participant';

  return (
    <div className="min-h-screen bg-[#080D1F] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
      
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-[#29215F]/40 via-[#5146D8]/20 to-[#F4B400]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-gradient-to-b from-[#0D132D] via-[#080D1F] to-[#060913] p-6 sm:p-8 rounded-3xl border border-[#29215F]/80 border-t-[#5146D8]/40 shadow-2xl space-y-6 relative z-10 backdrop-blur-2xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#29215F]/60 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#080D1F] to-[#29215F] text-[#F4B400] flex items-center justify-center font-bold border border-[#5146D8]/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>NYAYAI Pre-Call Environment</span>
                <Sparkles className="w-3.5 h-3.5 text-[#F4B400]" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Camera and Microphone Device Check</p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> PRIVATE CONSULTATION
          </span>
        </div>

        {/* MATTER BRIEF */}
        <div className="p-4 bg-gradient-to-r from-[#080D1F] to-[#121833] rounded-2xl border border-[#29215F]/60 text-xs space-y-1">
          <span className="text-[9px] font-mono text-[#F4B400] uppercase font-bold tracking-wider">
            Consultation Case Brief
          </span>
          <h2 className="text-sm font-extrabold text-white">{booking.matterTitle}</h2>
          <p className="text-[11px] text-slate-300">
            Participant: <strong className="text-indigo-200">{counterpartyName}</strong> ({counterpartyTitle})
          </p>
        </div>

        {/* CAMERA PREVIEW & STATUS */}
        <div className="relative w-full aspect-video bg-[#060913] rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />

          {hasCamera === false && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
              <Video className="w-10 h-10 text-slate-600" />
              <p className="text-xs text-slate-400 font-medium">Camera Feed Unavailable or Permission Denied</p>
            </div>
          )}

          {/* OVERLAY BADGES */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono">
            <div className="bg-slate-950/80 text-slate-200 px-3 py-1 rounded-lg backdrop-blur border border-slate-800">
              Preview: {userName}
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${
                hasCamera ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' : 'bg-rose-950 text-rose-300 border-rose-500/40'
              }`}>
                <Video className="w-3 h-3" /> {hasCamera ? 'Camera Ready' : 'Camera Off'}
              </span>

              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${
                hasMic ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' : 'bg-rose-950 text-rose-300 border-rose-500/40'
              }`}>
                <Mic className="w-3 h-3" /> {hasMic ? 'Mic Ready' : 'Mic Off'}
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* JOIN BUTTON */}
        <button
          onClick={onConfirmJoin}
          className="w-full bg-gradient-to-r from-[#29215F] via-[#382B8C] to-[#5146D8] hover:from-[#322975] hover:to-[#6154E8] text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-950/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center space-x-2 text-sm tracking-wide"
        >
          <CheckCircle2 className="w-5 h-5 text-[#F4B400]" />
          <span>Join Secure Consultation Room</span>
        </button>

      </div>
    </div>
  );
};
