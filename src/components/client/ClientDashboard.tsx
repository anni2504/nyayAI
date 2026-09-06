import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCaseContext } from '../../context/CaseContext';
import { 
  FileText, 
  Sparkles, 
  Users, 
  Folder, 
  Bookmark, 
  Calendar, 
  Clock, 
  ArrowRight, 
  ChevronRight
} from 'lucide-react';
import { fetchUserBookings } from '../../services/consultationApi';
import { fetchSavedAdvocates, fetchClientDocuments } from '../../services/api';

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { cases, startNewCase, selectCase } = useCaseContext();
  const [upcomingCount, setUpcomingCount] = useState<number>(0);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [totalDocuments, setTotalDocuments] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      try {
        const bookings = await fetchUserBookings();
        setUpcomingCount(bookings.filter(b => b.status === 'upcoming').length);
      } catch {
        setUpcomingCount(0);
      }

      try {
        const res = await fetchSavedAdvocates();
        setSavedCount(res.advocates?.length || 0);
      } catch {
        setSavedCount(0);
      }

      try {
        const res = await fetchClientDocuments();
        setTotalDocuments(res.documents?.length || 0);
      } catch {
        setTotalDocuments(0);
      }

      setStatsLoading(false);
    }
    loadStats();
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <div className="flex-1 bg-[#F8F5EE] p-6 sm:p-8 lg:p-10 overflow-y-auto space-y-10 font-sans">
      
      {/* 1. WELCOME HERO */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/90 to-transparent border border-[#0B1024]/8 p-8 sm:p-10 shadow-2xs">
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[55%] h-full pointer-events-none select-none overflow-hidden z-0">
          <img
            src="/assets/supreme-court-hero.jpg"
            alt="Court Architecture"
            className="w-full h-full object-cover object-right opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/80 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#4F586B] font-sans block">
              WELCOME BACK
            </span>
            <h1 className="font-serif font-medium text-4xl sm:text-5xl lg:text-[52px] text-[#0B1024] tracking-tight leading-[1.05]">
              Good afternoon, <span className="font-serif italic text-[#C88A32]">{firstName}.</span>
            </h1>
            <p className="text-sm sm:text-base text-[#4F586B] font-normal leading-relaxed pt-1">
              What would you like help with today?
            </p>
          </div>

          <div className="hidden lg:flex flex-col items-end text-right space-y-1 pr-4">
            <span className="font-serif italic text-base text-[#0B1024] font-medium leading-snug">
              Your <br />
              Rights. <br />
              Our Purpose.
            </span>
            <div className="w-8 h-[1.5px] bg-[#C88A32] mt-2" />
          </div>
        </div>
      </div>

      {/* 2. PRIMARY ACTION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          onClick={() => {
            window.location.hash = '#/client/copilot';
            startNewCase();
          }}
          className="relative rounded-2xl bg-[#0B1024] text-white p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[220px] overflow-hidden border border-[#D7B47A]/30"
        >
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <img src="/assets/supreme-court-hero.jpg" alt="" className="w-36 h-36 object-cover" />
          </div>
          <div className="space-y-3 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-[#FAF6EE] text-[#0B1024] flex items-center justify-center shadow-xs border border-[#D7B47A]/40">
              <FileText className="w-5 h-5 text-[#0B1024]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#D89947] transition-colors">
                Start a New Case
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1 font-normal">
                Describe your legal issue or dispute and get started with guidance.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between relative z-10 border-t border-white/10 mt-3">
            <div className="w-9 h-9 rounded-full bg-[#D89947] text-[#0B1024] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ArrowRight className="w-4 h-4 text-[#0B1024]" />
            </div>
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#C88A32] uppercase">
              EVERY CASE DESERVES CLARITY.
            </span>
          </div>
        </div>

        <div
          onClick={() => window.location.hash = '#/client/copilot'}
          className="rounded-2xl bg-white border border-[#0B1024]/8 p-6 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[220px]"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#F2EEFB] text-[#7C3AED] flex items-center justify-center shadow-2xs">
              <Sparkles className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
                Ask NYAYAI
              </h3>
              <p className="text-xs text-[#4F586B] leading-relaxed mt-1 font-normal">
                Get clear answers and guidance on your legal questions.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
            <span>Chat Now</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => window.location.hash = '#/client/documents'}
          className="rounded-2xl bg-white border border-[#0B1024]/8 p-6 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[220px]"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#EBF9F1] text-[#10B981] flex items-center justify-center shadow-2xs">
              <FileText className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
                Upload a Document
              </h3>
              <p className="text-xs text-[#4F586B] leading-relaxed mt-1 font-normal">
                Store and organize your legal documents securely.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
            <span>Open Vault</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => window.location.hash = '#/client/advocates'}
          className="rounded-2xl bg-white border border-[#0B1024]/8 p-6 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[220px]"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#FEF7EC] text-[#D89947] flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5 text-[#D89947]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
                Find an Advocate
              </h3>
              <p className="text-xs text-[#4F586B] leading-relaxed mt-1 font-normal">
                Discover verified advocates with relevant experience.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
            <span>Search Advocates</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. YOUR ACTIVITY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-xl text-[#0B1024] tracking-tight">
            Your Activity
          </h2>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#8C95A6] font-sans">
            A QUICK OVERVIEW
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-[#0B1024]/8 p-5 sm:p-6 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-[#0B1024]/8">
          <div 
            onClick={() => window.location.hash = '#/client/cases'}
            className="flex items-center justify-between pr-4 cursor-pointer group pt-3 sm:pt-0"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/30 flex items-center justify-center text-[#C88A32] shrink-0">
                <Folder className="w-5 h-5 text-[#C88A32]" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0B1024] leading-none">
                  {cases.length}
                </div>
                <div className="text-xs font-semibold text-[#4F586B] mt-1">
                  Active Case{cases.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C95A6] group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div 
            onClick={() => window.location.hash = '#/client/documents'}
            className="flex items-center justify-between sm:pl-6 pr-4 cursor-pointer group pt-3 sm:pt-0"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/30 flex items-center justify-center text-[#C88A32] shrink-0">
                <FileText className="w-5 h-5 text-[#C88A32]" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0B1024] leading-none">
                  {statsLoading ? '—' : totalDocuments}
                </div>
                <div className="text-xs font-semibold text-[#4F586B] mt-1">
                  Documents
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C95A6] group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div 
            onClick={() => window.location.hash = '#/client/saved-advocates'}
            className="flex items-center justify-between lg:pl-6 pr-4 cursor-pointer group pt-3 sm:pt-0"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/30 flex items-center justify-center text-[#C88A32] shrink-0">
                <Bookmark className="w-5 h-5 text-[#C88A32]" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0B1024] leading-none">
                  {statsLoading ? '—' : savedCount}
                </div>
                <div className="text-xs font-semibold text-[#4F586B] mt-1">
                  Saved Advocates
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C95A6] group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div 
            onClick={() => window.location.hash = '#/client/bookings'}
            className="flex items-center justify-between lg:pl-6 cursor-pointer group pt-3 sm:pt-0"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/30 flex items-center justify-center text-[#C88A32] shrink-0">
                <Calendar className="w-5 h-5 text-[#C88A32]" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0B1024] leading-none">
                  {upcomingCount}
                </div>
                <div className="text-xs font-semibold text-[#4F586B] mt-1">
                  Upcoming Consultation{upcomingCount === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C95A6] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* 4. RECENT CASES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-xl text-[#0B1024] tracking-tight">
            Recent Cases
          </h2>
          <a 
            href="#/client/cases" 
            className="text-xs font-bold text-[#0B1024] hover:text-[#C88A32] inline-flex items-center space-x-1 transition-colors"
          >
            <span>View All Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-3">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                selectCase(c.id);
                window.location.hash = '#/client/copilot';
              }}
              className="bg-white rounded-2xl border border-[#0B1024]/8 p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center space-x-4">
                <div className="w-11 h-11 rounded-xl bg-[#F2EEFB] text-[#7C3AED] flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0B1024] group-hover:text-[#C88A32] transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-[#4F586B] mt-0.5">
                    {c.jurisdiction || c.practiceArea || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#0B1024]/6 pt-3 sm:pt-0">
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#F2EEFB] text-[#6D28D9]">
                  {c.status}
                </span>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#FEF7EC] text-[#D89947] border border-[#D7B47A]/30">
                  {c.readinessScore}% Readiness
                </span>
                <div className="hidden lg:flex items-center space-x-1.5 text-xs text-[#4F586B]">
                  <Clock className="w-3.5 h-3.5 text-[#8C95A6]" />
                  <span>Updated {c.lastUpdated}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#0B1024] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
