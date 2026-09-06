import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Scale, ArrowRight, LayoutDashboard, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  const handleScrollToSection = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClientClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && user?.role === 'CLIENT') {
      window.location.hash = '#/client';
    } else {
      openAuthModal('CLIENT', 'signin');
    }
  };

  const handleAdvocateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && user?.role === 'ADVOCATE') {
      window.location.hash = '#/advocate';
    } else {
      openAuthModal('ADVOCATE', 'signin');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-slate-200/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO BRAND MARK */}
          <a href="#/" className="flex items-center space-x-3.5 select-none group">
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center shadow-subtle border border-amber-400/30 group-hover:border-amber-400/60 transition-smooth">
              <Scale className="w-4 h-4 text-amber-400" />
            </div>

            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight text-slate-950 font-sans">
                NYAY<span className="text-indigo-950">AI</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase -mt-1 font-mono">
                Legal Intelligence Engine
              </span>
            </div>
          </a>

          {/* CENTER NAVIGATION LINKS */}
          <nav className="hidden md:flex items-center space-x-9">
            <a
              href="#product"
              onClick={(e) => handleScrollToSection('product', e)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-smooth tracking-wide"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleScrollToSection('how-it-works', e)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-smooth tracking-wide"
            >
              How It Works
            </a>
            <button
              onClick={handleClientClick}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-smooth tracking-wide"
            >
              For Clients
            </button>
            <button
              onClick={handleAdvocateClick}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-smooth tracking-wide"
            >
              For Advocates
            </button>
          </nav>

          {/* RIGHT AUTH BUTTONS */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <a
                  href={user.role === 'CLIENT' ? '#/client' : '#/advocate'}
                  className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-subtle transition-smooth"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
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
                  className="text-xs font-bold text-slate-700 hover:text-slate-950 px-3 py-2 rounded-lg transition-smooth"
                >
                  Client Sign In
                </button>

                <button
                  onClick={() => openAuthModal('ADVOCATE', 'signin')}
                  className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl shadow-subtle transition-smooth flex items-center space-x-1.5"
                >
                  <span>Advocate Sign In</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
