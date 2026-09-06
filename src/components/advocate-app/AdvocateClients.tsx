import React, { useState, useEffect } from 'react';
import { UserCheck, Video, Calendar, ArrowUpRight, Clock, Folder } from 'lucide-react';
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
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 select-none font-sans">
      
      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Case Representation
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">My Cases & Clients</h1>
        </div>
        <div className="text-xs text-[#4F586B] bg-white px-3 py-1.5 rounded-lg border border-[#0B1024]/8 shadow-2xs font-bold">
          Showing {bookings.length} Associated Clients
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-[#4F586B] bg-white rounded-2xl border border-[#0B1024]/8">
          Loading client list...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-[#0B1024]/8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#FAF6EE] text-[#C88A32] flex items-center justify-center mx-auto border border-[#0B1024]/5">
            <Folder className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-[#0B1024] font-serif">No active clients found.</h3>
          <p className="text-xs text-[#4F586B]">When clients consult or engage your counsel, they will appear in this workspace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl border border-[#0B1024]/8 p-5 space-y-4 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#FAF6EE] border border-[#C88A32]/30 flex items-center justify-center text-[#C88A32] font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0B1024] font-serif">{booking.clientName}</h3>
                    <span className="text-[10px] text-[#4F586B] font-medium block">Client ID: #{booking.clientId || 'CL-88'}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  booking.status === 'upcoming' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {booking.status}
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 space-y-1">
                <span className="text-[10px] font-bold text-[#C88A32] uppercase tracking-wider block">Legal Matter</span>
                <p className="text-xs font-semibold text-[#0B1024]">{booking.matterTitle}</p>
                <p className="text-[11px] text-[#4F586B]">Civil & Constitutional Litigation • High Court Jurisdiction</p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#4F586B] pt-1">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center gap-1 font-medium"><Calendar className="w-3.5 h-3.5 text-[#C88A32]" /> {booking.date}</span>
                  <span className="flex items-center gap-1 font-medium"><Clock className="w-3.5 h-3.5 text-[#C88A32]" /> {booking.timeSlot}</span>
                </div>
                <span className="font-bold text-[#0B1024]">Fee: {booking.fee}</span>
              </div>

              {booking.status === 'upcoming' && (
                <button
                  onClick={() => handleJoinCall(booking.id)}
                  className="w-full bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs py-2.5 rounded-xl shadow-xs inline-flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Enter Video Room</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
