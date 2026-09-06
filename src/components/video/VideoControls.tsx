import React from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  ShieldCheck
} from 'lucide-react';

interface VideoControlsProps {
  isMicMuted: boolean;
  isCameraMuted: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isMicMuted,
  isCameraMuted,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall
}) => {
  return (
    <div className="bg-gradient-to-r from-[#080D1F] via-[#121833] to-[#080D1F] p-4 rounded-2xl border border-[#29215F]/80 border-t-[#5146D8]/40 shadow-2xl flex items-center justify-between max-w-xl mx-auto backdrop-blur-xl">
      
      {/* LEFT: SECURITY ENCRYPTION STATUS */}
      <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/40">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="font-bold">E2E ENCRYPTED</span>
      </div>

      {/* CENTER: MEDIA TOGGLES */}
      <div className="flex items-center space-x-3 mx-auto sm:mx-0">
        
        {/* MICROPHONE TOGGLE */}
        <button
          onClick={onToggleMic}
          className={`p-3.5 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center ${
            isMicMuted
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 scale-105'
              : 'bg-[#29215F]/90 hover:bg-[#382B8C] text-slate-200 border border-[#5146D8]/40'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-indigo-300" />}
        </button>

        {/* CAMERA TOGGLE */}
        <button
          onClick={onToggleCamera}
          className={`p-3.5 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center ${
            isCameraMuted
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 scale-105'
              : 'bg-[#29215F]/90 hover:bg-[#382B8C] text-slate-200 border border-[#5146D8]/40'
          }`}
          title={isCameraMuted ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isCameraMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5 text-indigo-300" />}
        </button>

        {/* SCREEN SHARE TOGGLE */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3.5 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center ${
            isScreenSharing
              ? 'bg-[#F4B400] text-slate-950 shadow-lg shadow-amber-500/30 scale-105'
              : 'bg-[#29215F]/90 hover:bg-[#382B8C] text-slate-200 border border-[#5146D8]/40'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* END CALL BUTTON */}
        <button
          onClick={onEndCall}
          className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-rose-950/50 transition-all duration-200 flex items-center space-x-2 active:scale-95"
          title="End Consultation"
        >
          <PhoneOff className="w-4 h-4" />
          <span>End Call</span>
        </button>
      </div>

    </div>
  );
};
