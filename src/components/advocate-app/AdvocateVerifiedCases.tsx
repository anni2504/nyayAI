import React, { useState, useEffect } from 'react';
import type { AdvocateCaseRecord } from '../../data/mockCaseHistories';
import { CheckCircle2, ShieldCheck, Award } from 'lucide-react';

export const AdvocateVerifiedCases: React.FC = () => {
  const [verifiedList, setVerifiedList] = useState<AdvocateCaseRecord[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nyayai_advocate_case_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        setVerifiedList(parsed.filter((r: AdvocateCaseRecord) => r.verificationStatus === 'VERIFIED'));
      }
    } catch {
      setVerifiedList([]);
    }
  }, []);

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Precedent Verification</span>
          <h1 className="text-2xl font-extrabold text-white">Verified Court Precedents</h1>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-950 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-800 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{verifiedList.length} Verified Records</span>
        </div>
      </div>

      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-1">
        <strong className="text-amber-400 block font-bold">Verification Standards:</strong>
        Submitted case precedents undergo record verification against official court order databases before appearing in verified public records.
      </div>

      {verifiedList.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center space-y-3 max-w-md mx-auto my-12">
          <Award className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-extrabold text-white">No verified cases yet.</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Case precedents submitted through Case History will appear here once verified.
          </p>
          <a
            href="#/advocate/case-history"
            className="inline-block mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-smooth"
          >
            Go to Case History
          </a>
        </div>
      ) : (
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
                Court Outcome: {rec.outcome}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
