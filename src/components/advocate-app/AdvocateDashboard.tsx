import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Zap, Eye, Award, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { mockLeadsList } from '../../data/mockLeads';

export const AdvocateDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-8">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-floating flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold border border-amber-400/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Bar Council Advocate</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-1">
            Good afternoon, {user?.name || 'Advocate Varma'}.
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Here is your professional activity overview.
          </p>
        </div>

        <a
          href="#/advocate/case-history"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-3.5 rounded-xl shadow transition-smooth flex items-center space-x-2"
        >
          <span>Add Verified Precedent</span>
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>

      {/* PRIMARY OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Leads</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">12</div>
          <div className="text-[11px] text-amber-400 font-semibold">+3 new today</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Matches</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">7</div>
          <div className="text-[11px] text-emerald-400 font-semibold">High precedent fit</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Profile Views</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">84</div>
          <div className="text-[11px] text-slate-400">Past 30 days</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verified Cases</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">42</div>
          <div className="text-[11px] text-slate-400">Karnataka High Court</div>
        </div>

      </div>

      {/* SECONDARY METRICS & PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Scheduled Consultations</span>
          <span className="text-sm font-bold text-white">5 Upcoming</span>
        </div>
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Response Rate</span>
          <span className="text-sm font-bold text-emerald-400">91% (Fast)</span>
        </div>
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Average Precedent Fit</span>
          <span className="text-sm font-bold text-amber-400">87% Match Quality</span>
        </div>
      </div>

      {/* RECENT ELIGIBLE LEADS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Eligible Client Lead Requests</span>
          </h2>
          <a href="#/advocate/leads" className="text-xs font-bold text-amber-400 hover:underline">
            Manage All Leads ({mockLeadsList.length})
          </a>
        </div>

        <div className="space-y-3">
          {mockLeadsList.map((lead) => (
            <div
              key={lead.id}
              className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-smooth space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold bg-amber-400/10 text-amber-400 px-2.5 py-0.5 rounded border border-amber-400/20">
                    {lead.matchScore}% Precedent Fit
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{lead.jurisdiction}</span>
                </div>
                <span className="text-[11px] text-slate-500">{lead.receivedAt}</span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">{lead.matterTitle}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{lead.summary}</p>
                </div>
                <a
                  href="#/advocate/leads"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-smooth shrink-0"
                >
                  Review Lead
                </a>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {lead.matchReasons.map((r, i) => (
                  <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    ✓ {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
