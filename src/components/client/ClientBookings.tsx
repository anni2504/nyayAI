import React, { useState, useEffect, useCallback } from 'react';
import { fetchUserBookings, updateBookingStatusApi } from '../../services/consultationApi';
import type { BookingData } from '../../services/consultationApi';
import { Calendar, Video, Clock, ArrowUpRight, ShieldCheck, Sparkles, XCircle } from 'lucide-react';

type Tab = 'active' | 'completed' | 'closed';

export const ClientBookings: React.FC = () => {
  const [tab, setTab] = useState<Tab>('active');
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      const apiBookings = await fetchUserBookings();
      setBookings(apiBookings || []);
    } catch (err) {
      console.warn('Error loading bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const active = bookings.filter(b => b.status === 'pending' || b.status === 'accepted' || b.status === 'upcoming');
  const completed = bookings.filter(b => b.status === 'completed');
  const closed = bookings.filter(b => b.status === 'cancelled' || b.status === 'declined');

  const filtered = tab === 'active' ? active : tab === 'completed' ? completed : closed;

  const handleCancel = async (booking: BookingData) => {
    setBusyId(booking.id);
    try {
      await updateBookingStatusApi(booking.id, 'cancelled');
      await loadBookings();
    } catch (err: any) {
      console.warn('Cancel failed:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleJoinCall = (bookingId: string) => {
    window.location.hash = `#/client/consultation/${bookingId}`;
  };

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1.5 w-fit">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Consultations Schedule</span>
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">My Bookings & Consultations</h1>
        </div>

        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-xs">
          <button
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 rounded-lg transition-smooth ${
              tab === 'active' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({active.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-smooth ${
              tab === 'completed' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completed.length})
          </button>
          <button
            onClick={() => setTab('closed')}
            className={`px-3 py-1.5 rounded-lg transition-smooth ${
              tab === 'closed' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Closed ({closed.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-medium">
          Loading consultations...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-subtle">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-900">
            {tab === 'active'
              ? 'No active consultations yet.'
              : tab === 'completed'
                ? 'No completed consultations.'
                : 'No closed consultations.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Find a verified advocate matching your case to book a private video consultation.
          </p>
          {tab === 'active' && (
            <button
              onClick={() => { window.location.hash = '#/client/advocates'; }}
              className="mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-smooth"
            >
              Find an Advocate
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bk) => (
            <div key={bk.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={bk.advocateAvatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'}
                    alt={bk.advocateName}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-900/10"
                  />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{bk.advocateName}</span>
                      {bk.status === 'accepted' || bk.status === 'upcoming' ? (
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          CONFIRMED
                        </span>
                      ) : bk.status === 'pending' ? (
                        <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                          AWAITING ADVOCATE
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-xs text-slate-600 font-semibold">{bk.matterTitle}</p>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 font-medium">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-900" /> {bk.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-900" /> {bk.timeSlot}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                    Fee: {bk.fee}
                  </span>
                </div>
              </div>

              {bk.status === 'accepted' || bk.status === 'upcoming' ? (
                <div className="p-3 bg-gradient-to-r from-indigo-50/90 to-amber-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 font-bold text-indigo-950">
                    <Video className="w-4 h-4 text-indigo-900" />
                    <span>Video Consultation Ready</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Private Session
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoinCall(bk.id)}
                    className="bg-gradient-to-r from-[#29215F] to-[#5146D8] hover:from-[#322975] hover:to-[#6154E8] text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                  >
                    <span>Join Video Consultation</span>
                    <ArrowUpRight className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              ) : bk.status === 'pending' ? (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 font-bold text-amber-900">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Request sent — awaiting the advocate's confirmation.</span>
                  </div>
                  <button
                    onClick={() => handleCancel(bk)}
                    disabled={busyId === bk.id}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold px-4 py-2 rounded-xl border border-rose-200 inline-flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{busyId === bk.id ? 'Cancelling...' : 'Cancel Request'}</span>
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
