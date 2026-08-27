import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCaseContext } from '../../context/CaseContext';
import { Plus, Cpu, FileText, Search, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { cases, startNewCase, selectCase } = useCaseContext();

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-8">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 text-xs font-bold border border-indigo-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Authenticated Client Session</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight pt-1">
            Good afternoon, {user?.name.split(' ')[0] || 'Rohan'}.
          </h1>
          <p className="text-slate-600 text-sm font-medium">
            What would you like help with today?
          </p>
        </div>

        <button
          onClick={() => {
            window.location.hash = '#/client/copilot';
            startNewCase();
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-card transition-smooth flex items-center space-x-2 hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Start New Case Workspace</span>
        </button>
      </div>

      {/* PRIMARY ACTIONS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div
          onClick={() => {
            window.location.hash = '#/client/copilot';
            startNewCase();
          }}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle hover:border-indigo-900 transition-smooth cursor-pointer group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Plus className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-950 transition-smooth">
              Start New Case
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Describe a new legal issue or dispute.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-indigo-900 pt-1 group-hover:translate-x-1 transition-smooth">
            <span>Open Copilot</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        <div
          onClick={() => window.location.hash = '#/client/copilot'}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle hover:border-indigo-900 transition-smooth cursor-pointer group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-950 transition-smooth">
              Ask NYAYAI
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Grounded legal copilot analysis.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-indigo-900 pt-1 group-hover:translate-x-1 transition-smooth">
            <span>Chat Copilot</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        <div
          onClick={() => window.location.hash = '#/client/documents'}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle hover:border-indigo-900 transition-smooth cursor-pointer group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-950 transition-smooth">
              Upload Document
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Analyze court orders & contracts.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-indigo-900 pt-1 group-hover:translate-x-1 transition-smooth">
            <span>Vault Workspace</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        <div
          onClick={() => window.location.hash = '#/client/advocates'}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle hover:border-indigo-900 transition-smooth cursor-pointer group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center font-bold">
            <Search className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-950 transition-smooth">
              Find an Advocate
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Precedent-ranked counsel directory.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-indigo-900 pt-1 group-hover:translate-x-1 transition-smooth">
            <span>Search Counsel</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

      </div>

      {/* OVERVIEW METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Active Cases</div>
          <div className="text-3xl font-black text-slate-950 mt-1">{cases.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">In progress analysis</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Vault Documents</div>
          <div className="text-3xl font-black text-slate-950 mt-1">12</div>
          <div className="text-[11px] text-emerald-700 mt-1">AES-256 Encrypted</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Saved Advocates</div>
          <div className="text-3xl font-black text-slate-950 mt-1">4</div>
          <div className="text-[11px] text-indigo-900 mt-1">Bookmarked counsel</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Upcoming Consultations</div>
          <div className="text-3xl font-black text-slate-950 mt-1">1</div>
          <div className="text-[11px] text-amber-800 font-bold mt-1">Tomorrow 4:30 PM</div>
        </div>

      </div>

      {/* RECENT CASES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
            Recent Case Workspaces
          </h2>
          <a href="#/client/cases" className="text-xs font-bold text-indigo-900 hover:underline">
            View All Cases ({cases.length})
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                selectCase(c.id);
                window.location.hash = '#/client/copilot';
              }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card hover:border-indigo-900 transition-smooth cursor-pointer group space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                  {c.practiceArea}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  c.readinessScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {c.readinessScore}% Readiness
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-950 transition-smooth">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{c.jurisdiction}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-950">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> Updated {c.lastUpdated}
                </span>
                <ArrowRight className="w-4 h-4 text-indigo-900 group-hover:translate-x-1 transition-smooth" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
