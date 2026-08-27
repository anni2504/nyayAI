import React, { useState } from 'react';
import { mockBookingsList } from '../../data/mockBookings';
import type { BookingConsultation } from '../../data/mockBookings';
import { Calendar, Video, Clock, ArrowUpRight } from 'lucide-react';

export const ClientBookings: React.FC = () => {
  const [tab, setTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [bookings] = useState<BookingConsultation[]>(mockBookingsList);

  const filtered = bookings.filter(b => b.status === tab);

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
            Consultations Schedule
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">My Bookings & Consultations</h1>
        </div>

        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg transition-smooth ${
              tab === 'upcoming' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming ({bookings.filter(b => b.status === 'upcoming').length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-smooth ${
              tab === 'completed' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({bookings.filter(b => b.status === 'completed').length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((bk) => (
          <div key={bk.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <img
                  src={bk.advocateAvatar}
                  alt={bk.advocateName}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-900/10"
                />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{bk.advocateName}</h3>
                  <p className="text-xs text-slate-600 font-semibold">{bk.matterTitle}</p>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 font-medium">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-900" /> {bk.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-900" /> {bk.timeSlot}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                  Fee: {bk.fee} Paid
                </span>
              </div>
            </div>

            {bk.status === 'upcoming' && (
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 font-bold text-indigo-950">
                  <Video className="w-4 h-4 text-indigo-900" />
                  <span>Secure Video Consultation Link Ready</span>
                </div>
                <a
                  href={bk.videoLink || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-indigo-950 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg transition-smooth flex items-center gap-1"
                >
                  <span>Join Consultation</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};
