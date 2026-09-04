import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Briefcase, LayoutDashboard, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  const handleScrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClientClick = (e: React.MouseEvent) => {
    if (isAuthenticated && user?.role === 'CLIENT') {
      window.location.hash = '#/client';
    } else {
      e.preventDefault();
      openAuthModal('CLIENT', 'signin');
    }
  };

  const handleAdvocateClick = (e: React.MouseEvent) => {
    if (isAuthenticated && user?.role === 'ADVOCATE') {
      window.location.hash = '#/advocate';
    } else {
      e.preventDefault();
      openAuthModal('ADVOCATE', 'signin');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* PREMIER DISTINCTIVE LOGO MARK */}
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
            <button
              onClick={handleClientClick}
              className="text-sm font-semibold text-slate-700 hover:text-indigo-950 transition-smooth flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-indigo-900" />
              <span>For Clients</span>
            </button>
            <button
              onClick={handleAdvocateClick}
              className="text-sm font-semibold text-slate-700 hover:text-amber-700 transition-smooth flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4 text-amber-700" />
              <span>For Advocates</span>
            </button>
          </nav>

          {/* AUTH ACTION BUTTONS */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <a
                  href={user.role === 'CLIENT' ? '#/client' : '#/advocate'}
                  className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-subtle transition-smooth"
                >
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  <span>Go to {user.role === 'CLIENT' ? 'Client Workspace' : 'Advocate Workspace'}</span>
                </a>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-smooth"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => openAuthModal('CLIENT', 'signin')}
                  className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold px-3.5 py-2 rounded-xl border border-indigo-200 transition-smooth"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-900" />
                  <span>Client Sign In</span>
                </button>

                <button
                  onClick={() => openAuthModal('ADVOCATE', 'signin')}
                  className="flex items-center space-x-1.5 bg-slate-950 hover:bg-slate-800 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl shadow-subtle transition-smooth"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Advocate Sign In</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
