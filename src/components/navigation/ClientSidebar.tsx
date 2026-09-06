import React from 'react';
import { Home, FolderKanban, Sparkles, FileText, Search, Bookmark, Calendar, Settings, Headphones, ArrowRight } from 'lucide-react';

interface ClientSidebarProps {
  currentPath: string;
}

export const ClientSidebar: React.FC<ClientSidebarProps> = ({ currentPath }) => {

  const navItems = [
    { label: 'Home', path: '#/client', icon: Home },
    { label: 'My Cases', path: '#/client/cases', icon: FolderKanban },
    { label: 'AI Assistant', path: '#/client/copilot', icon: Sparkles },
    { label: 'Documents', path: '#/client/documents', icon: FileText },
    { label: 'Find an Advocate', path: '#/client/advocates', icon: Search },
    { label: 'Saved Advocates', path: '#/client/saved-advocates', icon: Bookmark },
    { label: 'Consultations', path: '#/client/bookings', icon: Calendar },
    { label: 'Settings', path: '#/client/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#F8F5EE] border-r border-[#0B1024]/10 flex flex-col justify-between shrink-0 min-h-screen z-20 py-6 px-4">
      
      {/* BRAND & NAVIGATION SECTION */}
      <div className="space-y-6">
        
        {/* LOGO */}
        <div className="px-2 pt-1 pb-3">
          <a href="#/" className="flex items-center select-none group">
            <img
              src="/assets/nyayai-logo.png"
              alt="NYAYAI - Justice, Made Clear"
              className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </a>
        </div>

        {/* WORKSPACE NAV LABEL */}
        <div className="px-3 text-[10px] font-bold tracking-[0.2em] uppercase text-[#4F586B] font-sans">
          WORKSPACE
        </div>

        {/* NAV ITEMS */}
        <nav className="space-y-1">
          {navItems.map((item, idx) => {
            const isActive = currentPath === item.path || (item.path === '#/client' && currentPath === '#/client');
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.path}
                className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0B1024] text-white shadow-xs'
                    : 'text-[#4F586B] hover:bg-[#F4EFE6] hover:text-[#0B1024]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C88A32]' : 'text-[#4F586B]'}`} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

      </div>

      {/* SUPPORT BOX & BOTTOM FOOTER */}
      <div className="space-y-6 pt-6">
        
        {/* NEED HELP CARD */}
        <div className="p-4 bg-[#F4EFE6] rounded-2xl border border-[#D7B47A]/30 space-y-3">
          <div className="w-8 h-8 rounded-full bg-white border border-[#D7B47A]/40 flex items-center justify-center text-[#C88A32]">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0B1024]">Need Help?</h4>
            <p className="text-[11px] text-[#4F586B] leading-tight mt-0.5">
              Our team is here to support you.
            </p>
          </div>
          <button
            onClick={() => window.location.hash = '#/client/copilot'}
            className="text-xs font-bold text-[#C88A32] hover:text-[#B77A28] inline-flex items-center space-x-1 pt-1 cursor-pointer"
          >
            <span>Contact Support</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* BOTTOM SLOGAN */}
        <div className="px-2 space-y-1">
          <div className="w-6 h-[1.5px] bg-[#C88A32]/60" />
          <span className="text-[8px] font-bold tracking-[0.2em] text-[#C88A32] uppercase font-sans block">
            A MORE ACCESSIBLE JUSTICE SYSTEM
          </span>
        </div>

      </div>

    </aside>
  );
};
