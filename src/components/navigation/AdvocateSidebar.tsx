import React from 'react';
import { Home, Sparkles, Users, Folder, FileText, ShieldCheck, User, Settings, Headphones, ArrowRight, ArrowUpRight, Scale } from 'lucide-react';

interface AdvocateSidebarProps {
  currentPath: string;
}

export const AdvocateSidebar: React.FC<AdvocateSidebarProps> = ({ currentPath }) => {
  const navItems = [
    { label: 'Dashboard', path: '#/advocate', icon: Home },
    { label: 'AI Assistant', path: '#/advocate/ai-assistant', icon: Sparkles },
    { label: 'Client Requests', path: '#/advocate/leads', icon: Users, badge: '0' },
    { label: 'My Cases', path: '#/advocate/clients', icon: Folder },
    { label: 'Case History', path: '#/advocate/case-history', icon: FileText },
    { label: 'Verified Cases', path: '#/advocate/case-history/verified', icon: ShieldCheck },
    { label: 'Profile', path: '#/advocate/profile', icon: User },
    { label: 'Settings', path: '#/advocate/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0B1024] text-white border-r border-white/10 flex flex-col justify-between shrink-0 h-full z-20 py-6 px-4 overflow-y-auto">
      
      {/* BRAND & NAVIGATION SECTION */}
      <div className="space-y-6">
        
        {/* LOGO */}
        <div className="px-2 pt-1 pb-1">
          <a href="#/" className="flex items-center space-x-3 select-none group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D89947] to-[#C88A32] flex items-center justify-center shadow-md shadow-amber-900/30 group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5 text-[#0B1024]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold tracking-wider text-white leading-tight">
                NYAY<span className="text-[#D89947]">AI</span>
              </span>
              <span className="text-[9px] font-bold tracking-[0.18em] text-slate-400 uppercase">
                JUSTICE, MADE CLEAR
              </span>
            </div>
          </a>
        </div>

        {/* FEATURED CTA: AI LEGAL DRAFTING ASSISTANT */}
        <a
          href="#/advocate/ai-assistant"
          className="block p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-[#D7B47A]/30 transition-all duration-200 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FAF6EE] text-[#0B1024] flex items-center justify-center font-bold shadow-2xs">
                <Scale className="w-3.5 h-3.5 text-[#0B1024]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#D89947] transition-colors leading-tight">
                  AI Legal Drafting Assistant
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                  Draft. Review. Deliver.
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#D89947] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </div>
        </a>

        {/* WORKSPACE NAV LABEL */}
        <div className="px-3 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 font-sans">
          ADVOCATE WORKSPACE
        </div>

        {/* NAV ITEMS */}
        <nav className="space-y-1">
          {navItems.map((item, idx) => {
            const isActive = currentPath === item.path || (item.path === '#/advocate' && currentPath === '#/advocate');
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.path}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D89947]' : 'text-slate-400'}`} />
                  <span className={isActive ? 'text-[#D89947] font-bold' : ''}>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

      </div>

      {/* SUPPORT BOX & BOTTOM FOOTER */}
      <div className="space-y-5 pt-6">
        
        {/* NEED SUPPORT CARD */}
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[#D89947]">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Need Support?</h4>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
              Our team is here to help.
            </p>
          </div>
          <button
            onClick={() => window.location.hash = '#/advocate/ai-assistant'}
            className="text-xs font-bold text-[#D89947] hover:text-amber-300 inline-flex items-center space-x-1 pt-0.5 cursor-pointer"
          >
            <span>Contact Support</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* BOTTOM SLOGAN */}
        <div className="px-2 space-y-1 pb-1">
          <div className="w-6 h-[1.5px] bg-[#C88A32]/60" />
          <span className="text-[8px] font-bold tracking-[0.2em] text-[#C88A32] uppercase font-sans block">
            A MORE ACCESSIBLE JUSTICE SYSTEM
          </span>
        </div>

      </div>

    </aside>
  );
};
