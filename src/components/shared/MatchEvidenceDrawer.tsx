import React from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { X, ShieldCheck, CheckCircle2, Award, FileText } from 'lucide-react';

export const MatchEvidenceDrawer: React.FC = () => {
  const { selectedAdvocateForMatchModal, closeMatchEvidenceModal } = useCaseContext();

  if (!selectedAdvocateForMatchModal) return null;

  const adv = selectedAdvocateForMatchModal;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-floating overflow-y-auto flex flex-col border-l border-slate-200">
        
        {/* DRAWER HEADER */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={adv.avatar}
              alt={adv.name}
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-indigo-900/10 shadow-sm"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">{adv.name}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Verified Counsel
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">{adv.title}</p>
              <p className="text-[11px] text-slate-500 mt-1">{adv.court} • {adv.experienceYears} Years Practice</p>
            </div>
          </div>

          <button
            onClick={closeMatchEvidenceModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OVERALL MATCH SCORE BANNER */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">NYAYAI Grounded Match Index</span>
            <h4 className="text-2xl font-extrabold mt-0.5 flex items-center gap-2">
              <span>{adv.matchScore}% Match Confidence</span>
            </h4>
            <p className="text-xs text-slate-300 mt-1">Calculated from verified precedent court filings and jurisdiction alignment.</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-amber-400 flex items-center justify-center font-black text-xl text-amber-400">
            {adv.matchScore}%
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* SECTION 1: SCORE BREAKDOWN */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-700" />
              Match Contribution Breakdown
            </h5>
            
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Legal Issue Similarity</span>
                  <span className="text-indigo-900">{adv.breakdown.legalIssueSimilarity}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-900 rounded-full" style={{ width: `${(adv.breakdown.legalIssueSimilarity / 35) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Jurisdiction Match (Karnataka)</span>
                  <span className="text-indigo-900">{adv.breakdown.jurisdiction}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-800 rounded-full" style={{ width: `${(adv.breakdown.jurisdiction / 20) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Practice Area Experience</span>
                  <span className="text-indigo-900">{adv.breakdown.practiceArea}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-700 rounded-full" style={{ width: `${(adv.breakdown.practiceArea / 20) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Court Appellate Experience</span>
                  <span className="text-indigo-900">{adv.breakdown.courtExperience}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(adv.breakdown.courtExperience / 15) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Procedural Stage Alignment</span>
                  <span className="text-indigo-900">{adv.breakdown.proceduralStage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(adv.breakdown.proceduralStage / 10) * 100}%` }} />
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: WHY THIS MATCH */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Grounds for Match Determination
            </h5>
            <ul className="space-y-2">
              {adv.whyMatch.map((reason, i) => (
                <li key={i} className="flex items-start text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION 3: MATCHED PRECEDENT CASES */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-700" />
              Verified Matched Case History ({adv.matchedCases.length})
            </h5>
            <div className="space-y-3">
              {adv.matchedCases.map((mCase, idx) => (
                <div key={idx} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle hover:border-slate-300 transition-smooth">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{mCase.title}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{mCase.year}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2 font-medium">{mCase.court}</p>
                  <div className="p-2 bg-indigo-50/50 rounded-lg text-[11px] text-slate-700 border border-indigo-100">
                    <strong className="text-indigo-900">Why Relevant:</strong> {mCase.relevance}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Outcome:</span>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {mCase.outcome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center space-x-3">
          <button
            onClick={() => {
              closeMatchEvidenceModal();
              alert(`Consultation request dispatched to ${adv.name}. An assistant will contact you via email.`);
            }}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-lg shadow transition-smooth text-center"
          >
            Request Consultation ({adv.consultationFee})
          </button>
          <button
            onClick={closeMatchEvidenceModal}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-smooth"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
