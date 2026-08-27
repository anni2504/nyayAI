import React from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export const ClientCaseWorkspace: React.FC = () => {
  const { cases, activeCase, selectCase, setIsReadinessModalOpen, openMatchEvidenceModal } = useCaseContext();

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
            Case Context Vault
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">My Active Case Workspaces</h1>
        </div>

        <div className="text-xs font-bold text-slate-500">
          Showing {cases.length} Workspaces
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CASE SELECTION CARDS */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Case</h3>
          {cases.map((c) => {
            const isSelected = activeCase?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => selectCase(c.id)}
                className={`p-5 rounded-2xl border transition-smooth cursor-pointer space-y-3 ${
                  isSelected
                    ? 'bg-white border-indigo-900 shadow-floating ring-2 ring-indigo-950/10'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-subtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {c.practiceArea}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    c.readinessScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.readinessScore}% Readiness
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{c.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.jurisdiction}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ACTIVE CASE DETAILS WORKSPACE */}
        <div className="lg:col-span-8">
          {activeCase ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6">
              
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Case Overview</span>
                  <h2 className="text-xl font-extrabold text-slate-950 mt-1">{activeCase.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{activeCase.jurisdiction} • Status: {activeCase.status}</p>
                </div>

                <button
                  onClick={() => {
                    window.location.hash = '#/client/copilot';
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-subtle transition-smooth flex items-center space-x-1.5"
                >
                  <span>Open Copilot</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>

              {/* READINESS GAUGE */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-subtle">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                      Case Readiness Index
                    </span>
                    <button onClick={() => setIsReadinessModalOpen(true)} className="text-slate-300 hover:text-white underline text-xs">
                      Score Details
                    </button>
                  </div>
                  <div className="text-3xl font-black mt-1">{activeCase.readinessScore}%</div>
                  <p className="text-xs text-slate-400 mt-1">Sufficient context for counsel consultation.</p>
                </div>

                <div className="w-16 h-16 rounded-full bg-slate-800 border-4 border-amber-400 flex items-center justify-center font-black text-amber-300 text-base">
                  {activeCase.readinessScore}%
                </div>
              </div>

              {/* CASE UNDERSTANDING */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Case Understanding Checklist
                </h3>
                <div className="space-y-2 bg-warm-white p-4 rounded-2xl border border-slate-200 text-xs">
                  {activeCase.caseUnderstanding.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircle2 className={`w-4 h-4 ${item.status === 'verified' ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span className="font-bold text-slate-900">{item.label}:</span>
                      <span className="text-slate-600 font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRECEDENT MATCHES */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Advocate Recommendations ({activeCase.recommendations.length})
                </h3>

                {activeCase.recommendations.map((adv) => (
                  <div key={adv.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <img src={adv.avatar} alt={adv.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <span>{adv.name}</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <p className="text-slate-500 text-[11px]">{adv.title}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => openMatchEvidenceModal(adv)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] py-2 px-3 rounded-lg"
                    >
                      Match Evidence ({adv.matchScore}%)
                    </button>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">Select a case to view details</div>
          )}
        </div>

      </div>

    </div>
  );
};
