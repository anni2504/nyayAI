import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Briefcase } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { loginAsRole } = useAuth();

  const handleScrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* PREMIER DISTINCTIVE LOGO MARK (NO V1.0 BADGE) */}
          <a href="#/" className="flex items-center space-x-3 select-none group">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-card border border-amber-400/40 relative overflow-hidden group-hover:scale-[1.02] transition-smooth">
              <div className="flex flex-col items-center justify-center space-y-0.5">
                <div className="w-4 h-0.5 bg-amber-400 rounded-full" />
                <div className="flex items-center space-x-1">
                  <div className="w-0.5 h-3 bg-amber-400" />
                  <div className="w-1.5 h-1.5 rounded-full border border-amber-300" />
                  <div className="w-0.5 h-3 bg-amber-400" />
                </div>
                <div className="w-5 h-0.5 bg-amber-400 rounded-full" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-950">
                NYAY<span className="text-indigo-950">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase -mt-1">
                Legal Intelligence Engine
              </span>
            </div>
          </a>

          {/* PUBLIC LANDING NAVBAR LINKS */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#/" className="text-sm font-semibold text-slate-700 hover:text-slate-950 transition-smooth">
              Product
            </a>
            <button
              onClick={handleScrollToHowItWorks}
              className="text-sm font-semibold text-slate-700 hover:text-slate-950 transition-smooth"
            >
              How It Works
            </button>
            <a
              href="#/client"
              onClick={() => loginAsRole('CLIENT')}
              className="text-sm font-semibold text-slate-700 hover:text-indigo-950 transition-smooth flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-indigo-900" />
              <span>For Clients</span>
            </a>
            <a
              href="#/advocate"
              onClick={() => loginAsRole('ADVOCATE')}
              className="text-sm font-semibold text-slate-700 hover:text-amber-700 transition-smooth flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4 text-amber-700" />
              <span>For Advocates</span>
            </a>
            <button
              onClick={handleScrollToHowItWorks}
              className="text-sm font-semibold text-slate-700 hover:text-slate-950 transition-smooth"
            >
              About
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
};
