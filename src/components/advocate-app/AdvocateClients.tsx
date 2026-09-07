import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Video, ArrowUpRight, Clock, Folder, Briefcase } from 'lucide-react';
import { fetchUserBookings } from '../../services/consultationApi';
import type { BookingData } from '../../services/consultationApi';
import { fetchClientMatters } from '../../services/api';

export const AdvocateClients: React.FC = () => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mattersByClient, setMattersByClient] = useState<Record<string, any[]>>({});
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [loadingMatters, setLoadingMatters] = useState(false);

  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await fetchUserBookings();
        setBookings((data || []).filter(b => b.status === 'accepted' || b.status === 'upcoming'));
      } catch (err) {
        console.warn('Error loading advocate bookings:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const toggleMatters = useCallback(async (clientId: string) => {
    if (openClient === clientId) {
      setOpenClient(null);
      return;
    }
    setOpenClient(clientId);
    setLoadingMatters(true);
    try {
      const res = await fetchClientMatters(clientId);
      setMattersByClient(prev => ({ ...prev, [clientId]: res.matters || [] }));
    } catch (err) {
      console.warn('Error loading client matters:', err);
      setMattersByClient(prev => ({ ...prev, [clientId]: [] }));
    } finally {
      setLoadingMatters(false);
    }
  }, [openClient]);

  const handleJoinCall = (bookingId: string) => {
    window.location.hash = `#/advocate/consultation/${bookingId}`;
  };

  const uniqueClients = Array.from(new Map(bookings.map(b => [b.clientId, b])).values());

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 select-none font-sans">

      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Case Representation
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">My Cases & Clients</h1>
        </div>
        <div className="text-xs text-[#4F586B] bg-white px-3 py-1.5 rounded-lg border border-[#0B1024]/8 shadow-2xs font-bold">
          Showing {uniqueClients.length} Associated Clients
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-[#4F586B] bg-white rounded-2xl border border-[#0B1024]/8">
          Loading client list...
        </div>
      ) : uniqueClients.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-[#0B1024]/8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#FAF6EE] text-[#C88A32] flex items-center justify-center mx-auto border border-[#0B1024]/5">
            <Folder className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-[#0B1024] font-serif">No active clients found.</h3>
          <p className="text-xs text-[#4F586B]">When clients consult or engage your counsel, they will appear in this workspace.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {uniqueClients.map((booking) => (
            <div key={booking.clientId} className="bg-white rounded-2xl border border-[#0B1024]/8 p-5 space-y-4 shadow-2xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#FAF6EE] border border-[#C88A32]/30 flex items-center justify-center text-[#C88A32] font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0B1024] font-serif">{booking.clientName}</h3>
                    <span className="text-[10px] text-[#4F586B] font-medium block">Client ID: #{booking.clientId}</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="space-y-2">
                {bookings.filter(b => b.clientId === booking.clientId).map((bk) => (
                  <div key={bk.id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#0B1024]">{bk.matterTitle}</p>
                      <span className="text-[10px] font-bold text-[#0B1024]">Fee: {bk.fee}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#4F586B]">
                      <span className="flex items-center gap-1 font-medium"><Clock className="w-3 h-3 text-[#C88A32]" /> {bk.date} · {bk.timeSlot}</span>
                      {bk.status === 'accepted' || bk.status === 'upcoming' ? (
                        <button
                          onClick={() => handleJoinCall(bk.id)}
                          className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-xs inline-flex items-center space-x-1.5 transition-all cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Consultation</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => toggleMatters(booking.clientId)}
                className="w-full bg-white hover:bg-[#FAF8F5] border border-[#0B1024]/10 text-[#0B1024] font-extrabold text-xs py-2.5 rounded-xl inline-flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-[#C88A32]" />
                <span>{openClient === booking.clientId ? 'Hide' : 'View'} Client Matters</span>
              </button>

              {openClient === booking.clientId && (
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 space-y-2">
                  {loadingMatters ? (
                    <p className="text-xs text-[#4F586B] font-medium">Loading matters...</p>
                  ) : (mattersByClient[booking.clientId] || []).length === 0 ? (
                    <p className="text-xs text-[#4F586B] font-medium">No case matters shared with this client yet.</p>
                  ) : (
                    mattersByClient[booking.clientId].map((matter, i) => (
                      <div key={matter.caseId || i} className="bg-white rounded-xl border border-[#0B1024]/5 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#0B1024]">{matter.caseTitle || matter.title || 'Untitled matter'}</p>
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            matter.readinessScore >= 80
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : matter.readinessScore
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {matter.readinessScore != null ? `Ready ${matter.readinessScore}%` : 'In Progress'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#4F586B]">Practice Area: {matter.practiceArea || matter.category || 'General'}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};