import React, { useState } from 'react';
import { CheckCircle2, Clock, Calendar, User, FileText, ArrowRight, Save, ShieldCheck } from 'lucide-react';
import type { BookingData } from '../../services/consultationApi';
import { saveConsultationNotesApi } from '../../services/consultationApi';

interface PostConsultationSummaryProps {
  booking: BookingData;
  userRole: 'CLIENT' | 'ADVOCATE';
  durationSeconds: number;
  onReturnToDashboard: () => void;
}

export const PostConsultationSummary: React.FC<PostConsultationSummaryProps> = ({
  booking,
  userRole,
  durationSeconds,
  onReturnToDashboard
}) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration = `${minutes}m ${seconds}s`;

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    setIsSaving(true);
    try {
      await saveConsultationNotesApi(booking.id, notes.trim());
      setSavedSuccess(true);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080D1F] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
      
      {/* AMBIENT BACKGROUND LIGHT */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-[#29215F]/40 via-[#5146D8]/20 to-[#F4B400]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-gradient-to-b from-[#0D132D] via-[#080D1F] to-[#060913] p-6 sm:p-8 rounded-3xl border border-[#29215F]/80 border-t-[#5146D8]/40 shadow-2xl space-y-6 relative z-10 backdrop-blur-2xl">
        
        {/* SUCCESS ICON HEADER */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-500/60 text-emerald-400 mx-auto flex items-center justify-center shadow-xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase block">
            SESSION CONCLUDED
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Consultation Completed</h1>
          <p className="text-xs text-slate-400">
            Thank you for using NYAYAI Evidence-Grounded Legal Consultation.
          </p>
        </div>

        {/* CONSULTATION METADATA CARD */}
        <div className="bg-gradient-to-r from-[#080D1F] to-[#121833] p-5 rounded-2xl border border-[#29215F]/70 space-y-4">
          <div className="border-b border-[#29215F]/60 pb-3">
            <span className="text-[9px] font-mono text-[#F4B400] uppercase font-bold tracking-wider">
              Matter Details
            </span>
            <h2 className="text-sm font-extrabold text-white mt-0.5">{booking.matterTitle}</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#080D1F] rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> DURATION
              </span>
              <span className="font-mono font-bold text-white text-sm">{formattedDuration}</span>
            </div>

            <div className="p-3 bg-[#080D1F] rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> DATE
              </span>
              <span className="font-bold text-white">{booking.date}</span>
            </div>

            <div className="p-3 bg-[#080D1F] rounded-xl border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <User className="w-3.5 h-3.5 text-[#F4B400]" /> {userRole === 'CLIENT' ? 'ADVOCATE' : 'CLIENT'}
              </span>
              <span className="font-bold text-indigo-200 truncate block">
                {userRole === 'CLIENT' ? booking.advocateName : booking.clientName}
              </span>
            </div>
          </div>
        </div>

        {/* ADVOCATE CONSULTATION NOTES SECTION */}
        {userRole === 'ADVOCATE' ? (
          <div className="space-y-3 bg-[#080D1F]/90 p-5 rounded-2xl border border-[#29215F]/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#F4B400]" />
                <span>Advocate Consultation Notes</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Optional Legal Memo</span>
            </div>

            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record summary of counsel advice provided, next procedural steps, or required document filings..."
              className="w-full bg-[#060913] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-[#5146D8] transition-all resize-none"
            />

            <div className="flex items-center justify-between pt-1">
              {savedSuccess ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-4 h-4" /> Notes Saved to Case Record
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-mono">
                  Notes are stored securely with the booking record.
                </span>
              )}

              <button
                onClick={handleSaveNotes}
                disabled={isSaving || !notes.trim()}
                className="px-4 py-2 bg-[#29215F] hover:bg-[#382B8C] disabled:opacity-50 text-white font-bold text-xs rounded-xl border border-[#5146D8]/40 transition-smooth flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-[#F4B400]" />
                <span>{isSaving ? 'Saving...' : 'Save Notes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Consultation Verified & Saved to History</span>
            </div>
            <p className="text-[11px] text-emerald-200/80">
              You can review consultation records or book follow-up sessions anytime from your Client Dashboard.
            </p>
          </div>
        )}

        {/* RETURN BUTTON */}
        <button
          onClick={onReturnToDashboard}
          className="w-full bg-gradient-to-r from-[#29215F] via-[#382B8C] to-[#5146D8] hover:from-[#322975] hover:to-[#6154E8] text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-950/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
        >
          <span>Return to Workspace Dashboard</span>
          <ArrowRight className="w-4 h-4 text-[#F4B400]" />
        </button>

      </div>
    </div>
  );
};
