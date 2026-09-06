import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useCaseContext } from '../../context/CaseContext';

export const ClientNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { startNewCase } = useCaseContext();

  return (
    <header className="sticky top-0 z-30 bg-[#F8F5EE]/95 backdrop-blur-md border-b border-[#0B1024]/8 py-3 px-6">
      <div className="flex items-center justify-between">
        
        {/* LEFT SECTION TITLE */}
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#4F586B] font-sans">
          CLIENT PORTAL
        </div>

        {/* RIGHT TOP ACTIONS & PROFILE */}
        <div className="flex items-center space-x-4">
          
          {/* START NEW CASE BUTTON */}
          <button
            onClick={() => {
              window.location.hash = '#/client/copilot';
              startNewCase();
            }}
            className="inline-flex items-center space-x-1.5 bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#0B1024]" />
            <span>Start New Case</span>
          </button>

          {/* NOTIFICATION BELL */}
          <button className="relative w-9 h-9 rounded-full bg-white border border-[#0B1024]/10 flex items-center justify-center text-[#0B1024] hover:bg-[#F4EFE6] transition-colors cursor-pointer">
            <Bell className="w-4 h-4 text-[#0B1024]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C88A32] ring-2 ring-white" />
          </button>

          {/* USER PROFILE INFO */}
          <div className="flex items-center space-x-2 border-l border-[#0B1024]/10 pl-4">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"}
              alt={user?.name || "Client"}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-[#0B1024]/15"
            />
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-bold text-[#0B1024]">{user?.name || 'Client'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#4F586B]" />
              </div>
              <span className="text-[10px] font-medium text-[#4F586B]">Client Account</span>
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
