import React from 'react';
import { LayoutDashboard, Users, Zap, UserCheck, BookOpen, Award, User, BarChart2, Settings, Cpu, MessageSquare } from 'lucide-react';

interface AdvocateSidebarProps {
  currentPath: string;
}

export const AdvocateSidebar: React.FC<AdvocateSidebarProps> = ({ currentPath }) => {
  const navItems = [
    { label: 'Dashboard', path: '#/advocate', icon: LayoutDashboard },
    { label: 'AI Legal Assistant', path: '#/advocate/ai-assistant', icon: Cpu },
    { label: 'Lead Requests', path: '#/advocate/leads', icon: Users },
    { label: 'Matched Cases', path: '#/advocate/matches', icon: Zap },
    { label: 'My Clients', path: '#/advocate/clients', icon: UserCheck },
    { label: 'Case History', path: '#/advocate/case-history', icon: BookOpen },
    { label: 'Verified Records', path: '#/advocate/case-history/verified', icon: Award },
    { label: 'Colleague Network', path: '#/advocate/colleagues', icon: MessageSquare },
    { label: 'Profile Manager', path: '#/advocate/profile', icon: User },
    { label: 'Analytics', path: '#/advocate/analytics', icon: BarChart2 },
    { label: 'Settings', path: '#/advocate/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      
      {/* QUICK ACTION */}
      <div className="p-4 border-b border-slate-800">
        <a
          href="#/advocate/ai-assistant"
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow transition-smooth"
        >
          <Cpu className="w-4 h-4" />
          <span>AI Legal Drafting Assistant</span>
        </a>
      </div>

      {/* NAV LINKS */}
      <div className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Advocate Workspace
        </div>

        {navItems.map((item, idx) => {
          const isActive = currentPath === item.path || (item.path === '#/advocate' && currentPath === '#/advocate');
          const Icon = item.icon;
          return (
            <a
              key={idx}
              href={item.path}
              className={`flex items-center space-x-3 p-3 rounded-xl text-xs font-semibold transition-smooth ${
                isActive
                  ? 'bg-indigo-950 text-amber-400 border border-indigo-800/80 shadow-xs font-extrabold'
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
        <div className="text-slate-200 font-bold">Advocate Workspace</div>
        <div>Verified Lawyer Suite</div>
      </div>

    </aside>
  );
};
