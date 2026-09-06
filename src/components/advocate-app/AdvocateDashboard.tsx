import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, ArrowUpRight, Video, Calendar, Clock, Cpu, BookOpen, Users, FolderKanban } from 'lucide-react';
import { fetchUserBookings } from '../../services/consultationApi';
import type { BookingData } from '../../services/consultationApi';

export const AdvocateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const bks = await fetchUserBookings();
        setBookings(bks || []);
      } catch (err) {
        console.warn('Error loading advocate dashboard data:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const upcomingConsultations = bookings.filter(b => b.status === 'upcoming');

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-8">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-floating flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold border border-amber-400/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Advocate Practice Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-1">
            Good afternoon, {user?.name || 'Advocate'}.
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Welcome to your verified legal practice dashboard.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="#/advocate/ai-assistant"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-5 py-3 rounded-xl shadow transition-smooth flex items-center space-x-2"
          >
            <Cpu className="w-4 h-4" />
            <span>AI Assistant</span>
          </a>
          <a
            href="#/advocate/case-history"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-3 rounded-xl border border-slate-700 transition-smooth flex items-center space-x-2"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Case History</span>
          </a>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="#/advocate/ai-assistant"
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-400/50 transition-smooth space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold text-white group-hover:text-amber-400 transition-smooth">
            AI Legal Assistant
          </h3>
          <p className="text-xs text-slate-400">
            Draft legal notices, bail petitions, and analyze case documents.
          </p>
        </a>

        <a
          href="#/advocate/clients"
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-indigo-400/50 transition-smooth space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold text-white group-hover:text-indigo-400 transition-smooth">
            My Cases & Clients
          </h3>
          <p className="text-xs text-slate-400">
            Manage client relationships and active case consultations.
          </p>
        </a>

        <a
          href="#/advocate/case-history"
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-emerald-400/50 transition-smooth space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold text-white group-hover:text-emerald-400 transition-smooth">
            Precedent Repository
          </h3>
          <p className="text-xs text-slate-400">
            Record and organize past judgments and court orders.
          </p>
        </a>
      </div>

      {/* UPCOMING CONSULTATIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Upcoming Consultations</span>
          </h2>
          <a href="#/advocate/clients" className="text-xs font-bold text-amber-400 hover:underline">
            View All ({upcomingConsultations.length})
          </a>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading consultations...</div>
        ) : upcomingConsultations.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-300">No upcoming consultations.</p>
            <p className="text-[11px] text-slate-500">Scheduled video appointments with clients will be displayed here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingConsultations.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-extrabold text-white">{c.clientName}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                      READY
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{c.matterTitle}</p>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-amber-400" /> {c.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> {c.timeSlot}</span>
                    <span>• Fee: {c.fee}</span>
                  </div>
                </div>

                <a
                  href={`#/advocate/consultation/${c.id}`}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-smooth flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Video className="w-4 h-4 text-slate-950" />
                  <span>Join Consultation</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-950" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLIENT REQUESTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Current Client Requests</span>
          </h2>
          <a href="#/advocate/leads" className="text-xs font-bold text-amber-400 hover:underline">
            Client Requests (0)
          </a>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-300">No client requests yet.</p>
          <p className="text-[11px] text-slate-500">Inquiries and matter consultation requests will appear here once submitted.</p>
        </div>
      </div>

    </div>
  );
};
