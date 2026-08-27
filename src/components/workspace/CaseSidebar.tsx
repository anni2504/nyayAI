import React from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { Plus, FileText, Users, Settings, Scale, ChevronRight, X } from 'lucide-react';

export const CaseSidebar: React.FC = () => {
  const { cases, activeCaseId, selectCase, startNewCase, currentView, setCurrentView, isMobileSidebarOpen, setIsMobileSidebarOpen } = useCaseContext();

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out
      lg:static lg:translate-x-0
      ${isMobileSidebarOpen ? 'translate-x-0 shadow-floating' : '-translate-x-full lg:translate-x-0'}
    `}>
      
      {/* MOBILE CLOSE HEADER */}
      <div className="p-4 lg:hidden border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Scale className="w-5 h-5 text-amber-400" />
          <span className="font-extrabold text-base tracking-tight">NYAYAI Cases</span>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* TOP: + NEW CASE BUTTON */}
      <div className="p-4 border-b border-slate-800/80">
        <button
          onClick={() => startNewCase()}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow transition-smooth hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>New Case Workspace</span>
        </button>
      </div>

      {/* CASES LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Active Case Workspaces ({cases.length})
        </div>

        {cases.map((c) => {
          const isActive = c.id === activeCaseId && currentView === 'copilot';
          return (
            <button
              key={c.id}
              onClick={() => selectCase(c.id)}
              className={`w-full text-left p-3 rounded-xl transition-smooth flex items-start justify-between group ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold shadow-subtle border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <div className="space-y-1 overflow-hidden pr-2">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <span className="text-xs font-bold truncate block">{c.title}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-normal truncate pl-4">
                  {c.practiceArea}
                </div>
                <div className="text-[10px] text-slate-500 font-medium pl-4">
                  Updated {c.lastUpdated}
                </div>
              </div>

              <div className="shrink-0 pt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  c.readinessScore >= 80 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                  c.readinessScore >= 50 ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {c.readinessScore}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* BOTTOM PRODUCTIVITY LINKS */}
      <div className="p-3 border-t border-slate-800/80 space-y-1 text-xs font-medium">
        <button
          onClick={() => {
            setCurrentView('documents');
            setIsMobileSidebarOpen(false);
          }}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-smooth ${
            currentView === 'documents' ? 'bg-indigo-950 text-amber-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center space-x-2.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Document Vault</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        </button>

        <button
          onClick={() => {
            setCurrentView('advocates');
            setIsMobileSidebarOpen(false);
          }}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-smooth ${
            currentView === 'advocates' ? 'bg-indigo-950 text-amber-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center space-x-2.5">
            <Users className="w-4 h-4 text-slate-400" />
            <span>Saved Advocates</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        </button>

        <button
          onClick={() => {
            setCurrentView('settings');
            setIsMobileSidebarOpen(false);
          }}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-smooth ${
            currentView === 'settings' ? 'bg-indigo-950 text-amber-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center space-x-2.5">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        </button>
      </div>

    </aside>
  );
};
