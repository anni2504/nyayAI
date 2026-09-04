import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Scale, UserCheck, Briefcase, LayoutDashboard, LogOut } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO */}
          <a href="#/" className="flex items-center space-x-3 select-none">
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-amber-400 shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">NYAY<span className="text-indigo-900">AI</span></span>
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
            <button
              onClick={handleClientClick}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-smooth flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-900" />
              <span>For Clients</span>
            </button>
            <button
              onClick={handleAdvocateClick}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-smooth flex items-center gap-1"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-700" />
              <span>For Advocates</span>
            </button>
          </nav>

          {/* RIGHT DIRECT ENTRY BUTTONS */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <a
                  href={user.role === 'CLIENT' ? '#/client' : '#/advocate'}
                  className="flex items-center space-x-2 bg-slate-950 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl shadow-subtle transition-smooth"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Workspace</span>
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
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => openAuthModal('CLIENT', 'signin')}
                  className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold px-3.5 py-2 rounded-xl border border-indigo-200 transition-smooth"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Client Portal</span>
                </button>

                <button
                  onClick={() => openAuthModal('ADVOCATE', 'signin')}
                  className="flex items-center space-x-1 bg-slate-950 hover:bg-slate-800 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-smooth"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Advocate Workspace</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
