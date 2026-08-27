import React from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { HelpCircle, CheckCircle2, AlertCircle, ShieldCheck, Award, ArrowUpRight, FileCheck } from 'lucide-react';

export const IntelligencePanel: React.FC = () => {
  const { activeCase, setIsReadinessModalOpen, openMatchEvidenceModal, setCurrentView } = useCaseContext();

  if (!activeCase) return null;

  const score = activeCase.readinessScore;
  const legalDomainDisplay = activeCase.practiceArea && activeCase.practiceArea !== 'Awaiting case details'
    ? activeCase.practiceArea
    : activeCase.legalDomain || 'Awaiting case details';

  const stageText = score >= 90 ? 'HIGH INFORMATION COMPLETENESS'
    : score >= 80 ? 'COUNSEL-READY'
    : score >= 65 ? 'SUBSTANTIAL CASE UNDERSTANDING'
    : score >= 45 ? 'CASE CONTEXT DEVELOPING'
    : score >= 25 ? 'BASIC CONTEXT'
    : 'INITIAL INTAKE';

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-white border-l border-slate-200 h-full overflow-y-auto p-4 sm:p-5 space-y-6 shrink-0">
      
      {/* PANEL HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-indigo-900" />
          <span>Case Intelligence</span>
        </h3>
        <span className="text-[10px] font-bold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
          {stageText}
        </span>
      </div>

      {/* SECTION 1: READINESS GAUGE */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-subtle space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Case Readiness Score</span>
          <button
            onClick={() => setIsReadinessModalOpen(true)}
            className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 underline transition-smooth"
          >
            <span>Score Details</span>
            <HelpCircle className="w-3 h-3 text-amber-400" />
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-black tracking-tight">{score}%</span>
          <span className="text-[11px] font-bold uppercase text-amber-400">
            {stageText}
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-400 font-medium pt-1">
          {score >= 80
            ? 'Case context is sufficiently detailed for advocate engagement.'
            : score >= 25
            ? 'Case context is developing. Provide jurisdiction or documents to increase readiness.'
            : 'Initial intake phase (0-24%). Share details of your legal concern to begin scoring.'}
        </p>
      </div>

      {/* SECTION 2: WHAT WE KNOW / CASE UNDERSTANDING */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>What We Know</span>
          <span className="text-[10px] text-slate-400 lowercase font-normal">(fact status)</span>
        </h4>

        <div className="space-y-2 bg-warm-white p-3.5 rounded-xl border border-slate-200 text-xs">
          {activeCase.caseUnderstanding.map((item, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  item.status === 'verified' ? 'text-emerald-600' : 'text-slate-300'
                }`}
              />
              <div className="flex-1 overflow-hidden">
                <span className="font-bold text-slate-900 mr-1">{item.label}:</span>
                <span className="text-slate-600 font-medium">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: WHAT'S MISSING */}
      {activeCase.missingInformation.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>What's Missing</span>
          </h4>
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5 text-xs text-amber-900 font-medium">
            {activeCase.missingInformation.map((info, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                <span>{info}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: DOCUMENTS VAULT SUMMARY */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-indigo-900" />
          <span className="font-bold text-slate-700">Documents Vault</span>
        </div>
        <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
          {activeCase.documents.length} Uploaded
        </span>
      </div>

      {/* SECTION 5: LEGAL DOMAIN */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Legal Domain</span>
        <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
          {legalDomainDisplay}
        </span>
      </div>

      {/* SECTION 6: ADVOCATE MATCH RECOMMENDATIONS */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Precedent Advocate Matches
          </h4>
          <span className="text-[11px] font-bold text-indigo-900">
            {activeCase.recommendations.length} Available
          </span>
        </div>

        {activeCase.recommendations.length > 0 ? (
          <div className="space-y-4">
            {activeCase.recommendations.map((adv) => (
              <div
                key={adv.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-subtle space-y-3 transition-smooth"
              >
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-amber-400 px-2 py-0.5 rounded">
                    {adv.matchScore}% Match Confidence
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">{adv.jurisdiction}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <img
                    src={adv.avatar}
                    alt={adv.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-900/10"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <span>{adv.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </h5>
                    <p className="text-[11px] text-slate-600 font-medium leading-tight">{adv.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{adv.experienceYears} Years Experience</p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-700 space-y-1 border border-slate-200">
                  <div className="font-bold text-slate-900 text-[10px] uppercase">Why Matched:</div>
                  <p className="italic text-slate-600">"{adv.whyMatch[0]}"</p>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => openMatchEvidenceModal(adv)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] py-2 px-3 rounded-lg shadow-xs transition-smooth text-center flex items-center justify-center gap-1"
                  >
                    <span>View Match Evidence</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>

                  <button
                    onClick={() => setCurrentView('advocates')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-smooth"
                  >
                    Profile
                  </button>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2 text-xs">
            <p className="text-slate-600 font-medium">
              We'll surface advocate matches once we understand enough about your case (Score &ge; 80%).
            </p>
            <p className="text-[11px] text-slate-400">
              Provide jurisdiction or agreement details to unlock recommendations.
            </p>
          </div>
        )}
      </div>

    </aside>
  );
};
