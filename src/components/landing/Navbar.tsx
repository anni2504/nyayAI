import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Scale, UserCheck, Briefcase } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { loginAsRole } = useAuth();

  const handleScrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO */}
          <a href="#/" className="flex items-center space-x-3 select-none">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">NYAY<span className="text-indigo-900">AI</span></span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider bg-amber-100 text-amber-800 rounded border border-amber-200 uppercase">
                  v1.0
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide -mt-1">Legal Copilot & Advocate Discovery</span>
            </div>
          </a>

          {/* PUBLIC NAVIGATION */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-smooth">
              Product
            </a>
            <button
              onClick={handleScrollToHowItWorks}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-smooth"
            >
              How It Works
            </button>
            <a
              href="#/client"
              onClick={() => loginAsRole('CLIENT')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-smooth flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-900" />
              <span>For Clients</span>
            </a>
            <a
              href="#/advocate"
              onClick={() => loginAsRole('ADVOCATE')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-smooth flex items-center gap-1"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-700" />
              <span>For Advocates</span>
            </a>
          </nav>

          {/* RIGHT DIRECT ENTRY BUTTONS */}
          <div className="flex items-center space-x-3">
            <a
              href="#/client"
              onClick={() => loginAsRole('CLIENT')}
              className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold px-3.5 py-2 rounded-xl border border-indigo-200 transition-smooth"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-700" />
              <span>Client Portal</span>
            </a>

            <a
              href="#/advocate"
              onClick={() => loginAsRole('ADVOCATE')}
              className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-smooth"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Advocate Workspace</span>
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
