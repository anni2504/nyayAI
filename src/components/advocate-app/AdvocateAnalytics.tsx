import React from 'react';
import { BarChart2 } from 'lucide-react';

export const AdvocateAnalytics: React.FC = () => {
  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Match Performance & Metrics</span>
          <h1 className="text-2xl font-extrabold text-white">Advocate Analytics Dashboard</h1>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          Last 30 Days Activity
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase">Match Conversion Rate</div>
          <div className="text-3xl font-black text-amber-400">78%</div>
          <p className="text-[11px] text-slate-400">Lead inquiries converted to formal consultations</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase">Average Precedent Fit</div>
          <div className="text-3xl font-black text-emerald-400">87%</div>
          <p className="text-[11px] text-slate-400">Alignment with verified High Court orders</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase">Case History Coverage</div>
          <div className="text-3xl font-black text-indigo-400">42 Records</div>
          <p className="text-[11px] text-slate-400">Verified court precedent citations</p>
        </div>
      </div>

      {/* BREAKDOWN BY PRACTICE AREA */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <span>Match Performance by Practice Area</span>
        </h3>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span>Criminal Defense & Quashing (CrPC 482)</span>
              <span className="text-amber-400">91% Match Quality (42 Verified Cases)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: '91%' }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span>Property & Injunction Litigation</span>
              <span className="text-emerald-400">84% Match Quality (18 Verified Cases)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '84%' }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span>Civil Appeals & Writs</span>
              <span className="text-indigo-400">76% Match Quality (11 Verified Cases)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '76%' }} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
