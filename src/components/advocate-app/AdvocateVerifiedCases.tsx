import React from 'react';
import { mockAdvocateCaseRecords } from '../../data/mockCaseHistories';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export const AdvocateVerifiedCases: React.FC = () => {
  const verifiedList = mockAdvocateCaseRecords.filter(r => r.verificationStatus === 'VERIFIED');

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">NYAYAI Verification Engine</span>
          <h1 className="text-2xl font-extrabold text-white">Verified High Court Precedent Records</h1>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-950 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-800 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{verifiedList.length} Verified Orders</span>
        </div>
      </div>

      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-1">
        <strong className="text-amber-400 block font-bold">Matching Algorithm Transparency:</strong>
        Only verified records contribute to your platform matching score (87% confidence rating). Unverified submissions remain pending until public judgment record validation.
      </div>

      <div className="space-y-4">
        {verifiedList.map((rec) => (
          <div key={rec.id} className="bg-slate-900 p-6 rounded-2xl border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded">
                  {rec.court} ({rec.year})
                </span>
                <span className="text-xs font-bold text-amber-400">{rec.practiceArea}</span>
              </div>
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950 px-3 py-1 rounded border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Platform Verified
              </span>
            </div>

            <h3 className="text-base font-extrabold text-white">{rec.caseTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{rec.caseSummary}</p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-emerald-300 font-mono">
              ★ Outcome Ratio: {rec.outcome}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
