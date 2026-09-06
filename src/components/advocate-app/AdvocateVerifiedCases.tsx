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
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 font-sans">
      
      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Precedent Verification
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">Verified Court Precedents</h1>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{verifiedList.length} Verified Records</span>
        </div>
      </div>

      <div className="p-4 bg-white border border-[#0B1024]/8 rounded-2xl text-xs text-[#4F586B] space-y-1 shadow-2xs">
        <strong className="text-[#C88A32] block font-bold">Verification Standards:</strong>
        Submitted case precedents undergo record verification against official court order databases before appearing in verified public records.
      </div>

      {verifiedList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#0B1024]/8 p-12 text-center space-y-3 max-w-md mx-auto my-12 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#FAF6EE] text-[#C88A32] flex items-center justify-center mx-auto border border-[#0B1024]/5">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-[#0B1024] font-serif">No verified cases yet.</h3>
          <p className="text-xs text-[#4F586B] leading-relaxed">
            Case precedents submitted through Case History will appear here once verified by platform administrators.
          </p>
          <a
            href="#/advocate/case-history"
            className="inline-block mt-2 px-5 py-2.5 bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs rounded-xl shadow-xs transition-all"
          >
            Go to Case History
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {verifiedList.map((rec) => (
            <div key={rec.id} className="bg-white p-6 rounded-2xl border border-emerald-500/30 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#0B1024] bg-[#FAF8F5] px-2.5 py-0.5 rounded border border-[#0B1024]/10">
                    {rec.court} ({rec.year})
                  </span>
                  <span className="text-xs font-bold text-[#C88A32]">{rec.practiceArea}</span>
                </div>
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Platform Verified
                </span>
              </div>

              <h3 className="text-base font-extrabold text-[#0B1024] font-serif">{rec.caseTitle}</h3>
              <p className="text-xs text-[#4F586B] leading-relaxed">{rec.caseSummary}</p>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 text-xs text-emerald-800 font-mono">
                Court Outcome: {rec.outcome}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
