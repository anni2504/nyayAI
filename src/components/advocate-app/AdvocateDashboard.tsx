import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Video,
  Calendar,
  BookOpen,
  Users,
  Folder,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { fetchAdvocateWorkspaceStats } from '../../services/api';

export const AdvocateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingRequests: 0,
    upcomingConsultations: 0,
    activeClients: 0,
    verifiedCaseRecords: 0,
    totalConsultations: 0,
    totalMatters: 0
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    async function loadData() {
      try {
        const res = await fetchAdvocateWorkspaceStats();
        if (!disposed) {
          setStats(res.stats || stats);
          setRecentRequests(res.recentRequests || []);
          setUpcoming(res.upcoming || []);
        }
      } catch (err) {
        console.warn('Error loading advocate dashboard data:', err);
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    loadData();
    return () => { disposed = true; };
  }, []);

  const statCards = [
    { label: 'Active Cases', value: stats.activeClients + stats.totalMatters, sub: 'Ongoing matters', href: '#/advocate/clients', icon: Folder },
    { label: 'Upcoming Consultations', value: stats.upcomingConsultations, sub: 'Scheduled this week', href: '#/advocate/clients', icon: Calendar },
    { label: 'Verified Cases', value: stats.verifiedCaseRecords, sub: 'Court-verified matters', href: '#/advocate/case-history/verified', icon: ShieldCheck },
    { label: 'Client Requests', value: stats.pendingRequests, sub: 'New requests', href: '#/advocate/leads', icon: Users }
  ];

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">

      {/* HERO BANNER SECTION (ADVOCATE PRACTICE SUITE) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FAF6EE] via-[#F6F0E4] to-[#EFE7D8] border border-[#0B1024]/8 p-6 sm:p-8 min-h-[200px] flex items-center justify-between shadow-2xs">

        {/* RIGHT SIDE PHOTOGRAPHIC BACKGROUND GRAPHIC */}
        <div className="absolute top-0 right-0 bottom-0 w-1/2 sm:w-2/5 overflow-hidden pointer-events-none rounded-r-3xl">
          <img
            src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80"
            alt="Legal Justice Pillars"
            className="w-full h-full object-cover opacity-20 mix-blend-multiply filter contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF6EE] via-[#FAF6EE]/70 to-transparent" />
          <div className="absolute top-6 right-6 text-right hidden sm:block">
            <span className="font-serif italic text-xs text-[#C88A32] font-semibold block tracking-wide">
              "Justice Strengthens Society."
            </span>
            <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-[#0B1024]/40 uppercase mt-0.5 block">
              सत्यमेव जयते
            </span>
            <div className="w-8 h-[1px] bg-[#C88A32]/50 ml-auto mt-1" />
          </div>
        </div>

        {/* LEFT CONTENT */}
        <div className="relative z-10 space-y-3 max-w-xl">
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#C88A32] font-sans">
            ADVOCATE PRACTICE SUITE
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1024] tracking-tight font-sans">
            Good afternoon, <span className="font-serif text-[#C88A32] italic font-normal">{user?.name || 'Advocate.'}</span>
          </h1>

          <p className="text-xs sm:text-sm font-medium text-[#4F586B]">
            Your verified legal practice, organized around your cases and clients.
          </p>

          <div className="flex items-center space-x-3 pt-2">
            <a
              href="#/advocate/ai-assistant"
              className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs inline-flex items-center space-x-2 transition-all duration-150 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#0B1024]" />
              <span>AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0B1024]" />
            </a>

            <a
              href="#/advocate/case-history"
              className="bg-white hover:bg-[#FAF6EE] text-[#0B1024] border border-[#0B1024]/15 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-2xs inline-flex items-center space-x-2 transition-all duration-150 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#0B1024]" />
              <span>Case History</span>
            </a>
          </div>
        </div>

      </div>

      {/* STAT CARDS ROW (4 CARDS GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <a
              key={card.label}
              href={card.href}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-[#0B1024]/8 shadow-2xs hover:shadow-xs hover:border-[#D89947]/40 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FAF6EE] border border-[#0B1024]/5 flex items-center justify-center text-[#C88A32] group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F586B] block">
                    {card.label}
                  </span>
                  <span className="text-xl font-black text-[#0B1024] font-serif leading-tight block">
                    {card.value}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                    {card.sub}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#D89947] group-hover:translate-x-1 transition-transform shrink-0" />
            </a>
          );
        })}
      </div>

      {/* FEATURE BANNERS ROW (3 CARDS GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="#/advocate/ai-assistant"
          className="bg-white rounded-2xl p-5 border border-[#0B1024]/8 shadow-2xs hover:shadow-xs hover:border-[#D89947]/40 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
                AI Legal Assistant
              </h3>
              <p className="text-xs text-[#4F586B] leading-relaxed">
                Draft legal notices, bail petitions, and analyze case documents.
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full border border-[#0B1024]/10 flex items-center justify-center text-[#0B1024] group-hover:bg-[#0B1024] group-hover:text-white transition-colors shrink-0 ml-3">
            <ArrowRight className="w-4 h-4" />
          </div>
        </a>

        <a
          href="#/advocate/clients"
          className="bg-white rounded-2xl p-5 border border-[#0B1024]/8 shadow-2xs hover:shadow-xs hover:border-[#D89947]/40 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Folder className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
                My Cases & Clients
              </h3>
              <p className="text-xs text-[#4F586B] leading-relaxed">
                Manage your cases, clients, and consultations.
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full border border-[#0B1024]/10 flex items-center justify-center text-[#0B1024] group-hover:bg-[#0B1024] group-hover:text-white transition-colors shrink-0 ml-3">
            <ArrowRight className="w-4 h-4" />
          </div>
        </a>

        <a
          href="#/advocate/case-history"
          className="bg-white rounded-2xl p-5 border border-[#0B1024]/8 shadow-2xs hover:shadow-xs hover:border-[#D89947]/40 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
                Precedent Repository
              </h3>
              <p className="text-xs text-[#4F586B] leading-relaxed">
                Search and organize past judgments and court orders.
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full border border-[#0B1024]/10 flex items-center justify-center text-[#0B1024] group-hover:bg-[#0B1024] group-hover:text-white transition-colors shrink-0 ml-3">
            <ArrowRight className="w-4 h-4" />
          </div>
        </a>
      </div>

      {/* UPCOMING CONSULTATIONS SECTION */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0B1024] font-serif flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C88A32]" />
            <span>Upcoming Consultations</span>
          </h2>
          <a href="#/advocate/clients" className="text-xs font-bold text-[#0B1024] hover:text-[#C88A32] transition-colors flex items-center gap-1">
            <span>View All ({upcoming.length})</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#0B1024]" />
          </a>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#4F586B] bg-white rounded-2xl border border-[#0B1024]/8">
            Loading consultations...
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#0B1024]/8 p-10 text-center flex flex-col items-center justify-center space-y-2.5 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF6EE] text-[#4F586B] flex items-center justify-center mb-1 border border-[#0B1024]/5">
              <Calendar className="w-6 h-6 text-[#C88A32]" />
            </div>
            <h3 className="text-sm font-extrabold text-[#0B1024] font-serif">No upcoming consultations.</h3>
            <p className="text-xs text-[#4F586B] max-w-sm leading-relaxed">
              Confirmed consultation requests will appear here once you accept them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((bk) => (
              <div key={bk.id} className="bg-white rounded-2xl p-5 sm:p-6 border border-[#0B1024]/8 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#FAF6EE] border border-[#C88A32]/30 flex items-center justify-center text-[#C88A32] font-bold shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#0B1024] font-serif">{bk.clientName}</h3>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider border border-emerald-200">
                        CONFIRMED
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#4F586B]">{bk.matterTitle}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#4F586B] pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#C88A32]" />
                        <span>{bk.date} · {bk.timeSlot}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 font-bold text-[#0B1024]">Fee: {bk.fee}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#0B1024]/5">
                  <a
                    href={`#/advocate/consultation/${bk.id}`}
                    className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-xs inline-flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-[#0B1024]" />
                    <span>Join Consultation</span>
                    <ArrowUpRight className="w-4 h-4 text-[#0B1024]" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CURRENT CLIENT REQUESTS SECTION */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0B1024] font-serif flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C88A32]" />
            <span>Current Client Requests</span>
          </h2>
          <a href="#/advocate/leads" className="text-xs font-bold text-[#0B1024] hover:text-[#C88A32] transition-colors flex items-center gap-1">
            <span>View All ({recentRequests.length})</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#0B1024]" />
          </a>
        </div>

        {recentRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#0B1024]/8 p-10 text-center flex flex-col items-center justify-center space-y-2.5 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF6EE] text-[#4F586B] flex items-center justify-center mb-1 border border-[#0B1024]/5">
              <Users className="w-6 h-6 text-[#C88A32]" />
            </div>
            <h3 className="text-sm font-extrabold text-[#0B1024] font-serif">No client requests yet.</h3>
            <p className="text-xs text-[#4F586B] max-w-sm leading-relaxed">
              Inquiries and matter consultation requests will appear here once submitted.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((bk) => (
              <div key={bk.id} className="bg-white rounded-2xl p-5 border border-[#0B1024]/8 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-[#FAF6EE] border border-[#C88A32]/30 flex items-center justify-center text-[#C88A32] font-bold shrink-0">
                    {bk.clientName?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-extrabold text-[#0B1024] font-serif">{bk.clientName}</h3>
                    <p className="text-xs font-medium text-[#4F586B]">{bk.matterTitle}</p>
                    <p className="text-[11px] text-[#4F586B]">{bk.date} · {bk.timeSlot} · Fee: {bk.fee}</p>
                  </div>
                </div>
                <a
                  href="#/advocate/leads"
                  className="bg-[#0B1024] hover:bg-[#1E2540] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs inline-flex items-center space-x-2 transition-all cursor-pointer shrink-0"
                >
                  <span>Review & Respond</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};