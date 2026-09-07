import React, { useState, useEffect, useCallback } from 'react';
import { Users, ShieldAlert, CheckCircle2, XCircle, Calendar, Clock, Video, ArrowUpRight } from 'lucide-react';
import { fetchUserBookings, updateBookingStatusApi } from '../../services/consultationApi';
import type { BookingData } from '../../services/consultationApi';

export const AdvocateLeads: React.FC = () => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserBookings();
      setBookings(data || []);
    } catch (err) {
      console.warn('Error loading client requests:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const pending = bookings.filter(b => b.status === 'pending');
  const upcoming = bookings.filter(b => b.status === 'accepted' || b.status === 'upcoming');

  const handleStatus = async (booking: BookingData, status: 'accepted' | 'declined') => {
    setBusyId(booking.id);
    try {
      await updateBookingStatusApi(booking.id, status);
      await loadBookings();
    } catch (err: any) {
      console.warn('Status update failed:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleJoinCall = (bookingId: string) => {
    window.location.hash = `#/advocate/consultation/${bookingId}`;
  };

  const renderBooking = (bk: BookingData, showActions: boolean) => (
    <div key={bk.id} className="bg-white rounded-2xl border border-[#0B1024]/8 p-5 space-y-4 shadow-2xs">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-extrabold text-[#0B1024] font-serif">{bk.clientName}</h3>
            <span className="text-[10px] text-[#4F586B] font-medium">#{bk.clientId || 'CL-00'}</span>
          </div>
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mt-1.5 ${
            bk.status === 'pending'
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : bk.status === 'accepted' || bk.status === 'upcoming'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {bk.status}
          </span>
        </div>
        <span className="text-xs font-bold text-[#0B1024]">Fee: {bk.fee}</span>
      </div>

      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 space-y-1">
        <span className="text-[10px] font-bold text-[#C88A32] uppercase tracking-wider block">Legal Matter</span>
        <p className="text-xs font-semibold text-[#0B1024]">{bk.matterTitle}</p>
      </div>

      <div className="flex items-center space-x-4 text-xs text-[#4F586B]">
        <span className="flex items-center gap-1 font-medium"><Calendar className="w-3.5 h-3.5 text-[#C88A32]" /> {bk.date}</span>
        <span className="flex items-center gap-1 font-medium"><Clock className="w-3.5 h-3.5 text-[#C88A32]" /> {bk.timeSlot}</span>
      </div>

      {showActions ? (
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={() => handleStatus(bk, 'accepted')}
            disabled={busyId === bk.id}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs inline-flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Accept Request</span>
          </button>
          <button
            onClick={() => handleStatus(bk, 'declined')}
            disabled={busyId === bk.id}
            className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs py-2.5 rounded-xl border border-rose-200 inline-flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            <span>Decline</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => handleJoinCall(bk.id)}
          className="w-full bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs py-2.5 rounded-xl shadow-xs inline-flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Video className="w-4 h-4" />
          <span>Join Video Consultation</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">

      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Client Intake
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">Client Requests</h1>
        </div>
        <div className="text-xs text-[#4F586B] bg-white px-3 py-1.5 rounded-lg border border-[#0B1024]/8 shadow-2xs font-bold">
          {pending.length} Pending · {upcoming.length} Upcoming
        </div>
      </div>

      <div className="p-4 bg-[#FAF6EE] border border-[#C88A32]/20 rounded-2xl flex items-start space-x-3 text-xs text-[#0B1024] shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-[#C88A32] shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-[#0B1024]">Client Privacy & Matter Protection:</strong>
          Client case descriptions are sanitized for initial evaluation. Full private document access is granted only after client consultation authorization.
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-[#4F586B] bg-white rounded-2xl border border-[#0B1024]/8">
          Loading client requests...
        </div>
      ) : pending.length === 0 && upcoming.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#0B1024]/8 p-12 text-center space-y-3 max-w-md mx-auto my-12 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#FAF6EE] text-[#C88A32] flex items-center justify-center mx-auto border border-[#0B1024]/5">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-[#0B1024] font-serif">No client requests yet.</h3>
          <p className="text-xs text-[#4F586B] leading-relaxed">
            New consultation inquiries and representation requests will appear here once submitted by clients.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-extrabold text-[#C88A32] uppercase tracking-wider">Pending Requests</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pending.map(bk => renderBooking(bk, true))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-extrabold text-[#C88A32] uppercase tracking-wider">Confirmed Consultations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map(bk => renderBooking(bk, false))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};