import React from 'react';
import { LayoutDashboard, FolderKanban, Cpu, FileText, Search, Bookmark, Calendar, Settings, Plus } from 'lucide-react';
import { useCaseContext } from '../../context/CaseContext';

interface ClientSidebarProps {
  currentPath: string;
}

export const ClientSidebar: React.FC<ClientSidebarProps> = ({ currentPath }) => {
  const { startNewCase } = useCaseContext();

  const navItems = [
    { label: 'Overview', path: '#/client', icon: LayoutDashboard },
    { label: 'My Cases', path: '#/client/cases', icon: FolderKanban },
    { label: 'Ask NYAYAI', path: '#/client/copilot', icon: Cpu },
    { label: 'Documents', path: '#/client/documents', icon: FileText },
    { label: 'Find Advocates', path: '#/client/advocates', icon: Search },
    { label: 'Saved Advocates', path: '#/client/saved-advocates', icon: Bookmark },
    { label: 'Bookings', path: '#/client/bookings', icon: Calendar },
    { label: 'Settings', path: '#/client/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      
      {/* START CASE BUTTON */}
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={() => {
            window.location.hash = '#/client/copilot';
            startNewCase();
          }}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow transition-smooth"
        >
          <Plus className="w-4 h-4" />
          <span>Start New Case</span>
        </button>
      </div>

      {/* NAV LINKS */}
      <div className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Client Workspace
        </div>

        {navItems.map((item, idx) => {
          const isActive = currentPath === item.path || (item.path === '#/client' && currentPath === '#/client');
          const Icon = item.icon;
          return (
            <a
              key={idx}
              href={item.path}
              className={`flex items-center space-x-3 p-3 rounded-xl text-xs font-semibold transition-smooth ${
                isActive
                  ? 'bg-indigo-950 text-amber-400 border border-indigo-800/80 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>

      {/* FOOTER NOTICE */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 font-medium">
        <div className="text-slate-200 font-bold">Client RBAC Session</div>
        <div>Private & Encrypted Case Vault</div>
      </div>

    </aside>
  );
};
