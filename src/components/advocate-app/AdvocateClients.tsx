import React, { useState, useEffect } from 'react';
import { UserCheck, Video, Calendar, ArrowUpRight, ShieldCheck, Clock } from 'lucide-react';
import { fetchUserBookings } from '../../services/consultationApi';
import type { BookingData } from '../../services/consultationApi';

export const AdvocateClients: React.FC = () => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await fetchUserBookings();
        setBookings(data || []);
      } catch (err) {
        console.warn('Error loading advocate bookings:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const handleJoinCall = (bookingId: string) => {
    window.location.hash = `#/advocate/consultation/${bookingId}`;
  };

  return (
    <div className="flex-1 bg-[#080D1F] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 select-none font-sans">
      
      <div className="flex items-center justify-between border-b border-[#29215F]/80 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F4B400] bg-[#29215F]/60 px-2.5 py-0.5 rounded border border-[#5146D8]/30">
            Case Representation
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">My Cases & Clients</h1>
        </div>
        <div className="text-xs text-slate-400 bg-[#060913] px-3 py-1.5 rounded-lg border border-[#29215F]">
          Showing {bookings.length} Associated Clients
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-medium">
          Loading client cases...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-[#0D132D] rounded-3xl border border-[#29215F]/80 p-12 text-center space-y-3 shadow-xl max-w-md mx-auto my-12">
          <UserCheck className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-extrabold text-white">No active cases yet.</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Client consultations and active case representations will appear here once scheduled.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="bg-gradient-to-br from-[#0D132D] via-[#080D1F] to-[#060913] p-6 rounded-2xl border border-[#29215F]/80 border-t-[#5146D8]/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#29215F] to-[#080D1F] text-[#F4B400] flex items-center justify-center font-bold border border-[#F4B400]/40">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>{b.clientName}</span>
                      {b.status === 'upcoming' && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          ONLINE · READY TO JOIN
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">{b.matterTitle}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded border ${
                  b.status === 'upcoming'
                    ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50'
                    : 'text-slate-400 bg-slate-900 border-slate-800'
                }`}>
                  {b.status === 'upcoming' ? 'Active Consultation Ready' : b.status}
                </span>
              </div>

              <div className="p-3.5 bg-[#060913] rounded-xl border border-[#29215F]/60 text-xs space-y-1.5">
                <strong className="text-white block font-extrabold">{b.matterTitle}</strong>
                <div className="flex items-center space-x-4 text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#F4B400]" /> {b.date}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#F4B400]" /> {b.timeSlot}</span>
                  <span>•</span>
                  <span>Fee: {b.fee}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2 text-[11px] font-mono text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Client Representation</span>
                </div>

                <div className="flex items-center space-x-3">
                  {b.status === 'upcoming' && (
                    <button
                      onClick={() => handleJoinCall(b.id)}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#F4B400] to-[#E58A00] hover:from-[#FFBF00] hover:to-[#F59E0B] text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                    >
                      <Video className="w-4 h-4 text-slate-950" />
                      <span>Join Video Consultation</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
