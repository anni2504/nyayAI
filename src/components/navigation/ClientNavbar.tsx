import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Scale, Plus, Home, LogOut } from 'lucide-react';
import { useCaseContext } from '../../context/CaseContext';

export const ClientNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { startNewCase } = useCaseContext();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center space-x-4">
            <a href="#/" className="flex items-center space-x-3 select-none">
              <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-amber-400 font-extrabold text-xs shadow-xs">
                <Scale className="w-4 h-4" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">NYAY<span className="text-indigo-900">AI</span></span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-100 rounded uppercase">
                  Client Portal
                </span>
              </div>
            </a>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                window.location.hash = '#/client/copilot';
                startNewCase();
              }}
              className="hidden sm:flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-smooth"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Case</span>
            </button>

            <a
              href="#/"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-smooth"
              title="Return to Public Landing"
            >
              <Home className="w-4 h-4" />
            </a>

            <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
              <img
                src={user?.avatar}
                alt={user?.name}
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-950/10"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900">{user?.name || 'Rohan Sharma'}</div>
                <div className="text-[10px] text-slate-500 font-medium">Client Account</div>
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-smooth ml-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
