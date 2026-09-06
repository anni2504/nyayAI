import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Home, LogOut, CheckCircle2 } from 'lucide-react';

export const AdvocateNavbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#F8F5EE]/95 backdrop-blur-md border-b border-[#0B1024]/8 py-3.5 px-6 shrink-0">
      <div className="flex items-center justify-between">
        
        {/* LEFT SECTION TITLE PILL */}
        <div className="inline-flex items-center px-3 py-1 rounded-lg bg-[#E2E8F0]/70 border border-[#0B1024]/5 text-[11px] font-bold tracking-[0.18em] uppercase text-[#0B1024] font-sans">
          ADVOCATE WORKSPACE
        </div>

        {/* RIGHT TOP ACTIONS & PROFILE */}
        <div className="flex items-center space-x-4">
          
          {/* HOME LANDING LINK */}
          <a
            href="#/"
            className="w-9 h-9 rounded-full bg-white border border-[#0B1024]/10 flex items-center justify-center text-[#0B1024] hover:bg-[#FAF6EE] transition-colors cursor-pointer shadow-2xs"
            title="Return to Public Landing"
          >
            <Home className="w-4 h-4 text-[#0B1024]" />
          </a>

          {/* ADVOCATE PROFILE INFO */}
          <div className="flex items-center space-x-2.5 border-l border-[#0B1024]/10 pl-4">
            <img
              src={user?.avatar || "/assets/advocate-portrait.jpg"}
              alt={user?.name || "Adv. Rajesh Varma"}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-[#0B1024]/15 shadow-2xs"
            />
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-bold text-[#0B1024]">{user?.name || 'Adv. Rajesh Varma'}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
              </div>
              <span className="text-[10px] font-medium text-[#4F586B]">Verified Advocate</span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-[#4F586B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
