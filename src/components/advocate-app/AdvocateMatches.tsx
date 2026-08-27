import React from 'react';
import { mockLeadsList } from '../../data/mockLeads';
import { Zap, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const AdvocateMatches: React.FC = () => {
  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Precedent Matching Engine</span>
          <h1 className="text-2xl font-extrabold text-white">Matched Case Feed</h1>
        </div>
        <div className="text-xs text-amber-400 bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/20 font-bold flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" />
          <span>7 High Precedent Matches</span>
        </div>
      </div>

      <div className="space-y-4">
        {mockLeadsList.map((match) => (
          <div key={match.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded">
                CASE #{match.id.toUpperCase()} • {match.matchScore}% Precedent Fit
              </span>
              <span className="text-xs text-slate-400">{match.jurisdiction}</span>
            </div>

            <h3 className="text-base font-extrabold text-white">{match.matterTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{match.summary}</p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-amber-400 text-[11px] uppercase">Matching Precedents:</div>
              {match.matchReasons.map((r, i) => (
                <div key={i} className="text-slate-300 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <a
                href="#/advocate/leads"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-smooth flex items-center gap-1"
              >
                <span>Accept Lead Request</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
