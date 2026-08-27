import React from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { Plus, Clock, ArrowRight } from 'lucide-react';

export const CaseHistory: React.FC = () => {
  const { cases, selectCase, startNewCase } = useCaseContext();

  return (
    <div className="flex-1 bg-warm-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Case Archive & History
            </span>
            <h1 className="text-3xl font-extrabold text-slate-950 mt-2 tracking-tight">
              My Legal Case Workspaces
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Select any past case workspace to restore AI conversations, document intelligence, and advocate recommendations.
            </p>
          </div>

          <button
            onClick={() => startNewCase()}
            className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-subtle transition-smooth shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Start a New Case</span>
          </button>
        </div>

        {/* CASES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => selectCase(c.id)}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 space-y-4 cursor-pointer hover:border-indigo-900 hover:shadow-floating transition-smooth group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                    {c.practiceArea}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    c.readinessScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.readinessScore}% Readiness
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-950 transition-smooth">
                  {c.title}
                </h3>

                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Last updated {c.lastUpdated}</span>
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 text-[11px] uppercase">Jurisdiction & Stage</div>
                  <div>{c.jurisdiction} • {c.proceduralStage}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-950 group-hover:translate-x-1 transition-smooth">
                <span>Open Case Workspace</span>
                <ArrowRight className="w-4 h-4 text-indigo-900" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
