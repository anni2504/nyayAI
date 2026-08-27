import React from 'react';
import { mockMatchesForCase } from '../../data/mockAdvocates';
import type { AdvocateMatch } from '../../data/types';
import { ShieldCheck, ArrowUpRight, Calendar } from 'lucide-react';
import { useCaseContext } from '../../context/CaseContext';

export const ClientSavedAdvocates: React.FC = () => {
  const { openMatchEvidenceModal } = useCaseContext();
  const savedAdvocates = mockMatchesForCase.slice(0, 2);

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
            Bookmarked Counsel
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Saved Advocates</h1>
        </div>
        <div className="text-xs font-bold text-slate-500">
          Showing {savedAdvocates.length} Saved Profiles
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {savedAdvocates.map((adv: AdvocateMatch) => (
          <div key={adv.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={adv.avatar}
                  alt={adv.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-900/10"
                />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-base font-bold text-slate-900">{adv.name}</h3>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{adv.title}</p>
                  <p className="text-xs text-slate-400 font-medium">{adv.jurisdiction}</p>
                </div>
              </div>

              <div className="bg-indigo-950 text-amber-400 px-3 py-1 rounded-xl text-xs font-black">
                {adv.matchScore}% Match
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-900 text-[10px] uppercase">Why Bookmarked:</span>
              <p className="text-slate-600 italic">"{adv.whyMatch[0]}"</p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => openMatchEvidenceModal(adv)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-subtle transition-smooth flex items-center justify-center space-x-1"
              >
                <span>View Evidence</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
              </button>

              <button
                onClick={() => {
                  window.location.hash = '#/client/bookings';
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow transition-smooth flex items-center space-x-1"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Consult</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
