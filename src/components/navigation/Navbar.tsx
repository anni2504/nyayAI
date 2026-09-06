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
    <header className="sticky top-0 z-40 bg-[#F8F5EE]/95 backdrop-blur-md border-b border-[#0B1024]/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO BRAND MARK */}
          <a href="#/" className="flex items-center space-x-3.5 select-none group">
            <div className="w-10 h-10 rounded-xl bg-[#0B1024] flex items-center justify-center shadow-xs border border-[#C88A32]/40 group-hover:border-[#C88A32] transition-smooth">
              <Scale className="w-5 h-5 text-[#C88A32]" />
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-[#0B1024] font-sans">
                NYAY<span className="text-[#0B1024]">AI</span>
              </span>
              <span className="text-[9px] font-semibold text-[#4F586B] tracking-[0.2em] uppercase -mt-0.5">
                JUSTICE, MADE CLEAR
              </span>
            </div>
          </a>

          {/* CENTER NAVIGATION LINKS */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#product"
              onClick={(e) => handleScrollToSection('product', e)}
              className="text-sm font-medium text-[#4F586B] hover:text-[#0B1024] transition-colors"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleScrollToSection('how-it-works', e)}
              className="text-sm font-medium text-[#4F586B] hover:text-[#0B1024] transition-colors"
            >
              How It Works
            </a>
            <button
              onClick={handleClientClick}
              className="text-sm font-medium text-[#4F586B] hover:text-[#0B1024] transition-colors cursor-pointer"
            >
              For Clients
            </button>
            <button
              onClick={handleAdvocateClick}
              className="text-sm font-medium text-[#4F586B] hover:text-[#0B1024] transition-colors cursor-pointer"
            >
              For Advocates
            </button>
            <a
              href="#about"
              onClick={(e) => handleScrollToSection('about', e)}
              className="text-sm font-medium text-[#4F586B] hover:text-[#0B1024] transition-colors"
            >
              About
            </a>
          </nav>

          {/* RIGHT AUTH BUTTONS */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <a
                  href={user.role === 'CLIENT' ? '#/client' : '#/advocate'}
                  className="flex items-center space-x-2 bg-[#0B1024] hover:bg-[#161D3B] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-smooth"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#C88A32]" />
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
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => openAuthModal('CLIENT', 'signin')}
                  className="text-sm font-medium text-[#0B1024] hover:text-slate-600 px-2 py-2 transition-colors cursor-pointer"
                >
                  Client Sign In
                </button>

                <button
                  onClick={() => openAuthModal('ADVOCATE', 'signin')}
                  className="bg-[#0B1024] hover:bg-[#182042] text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center space-x-2 cursor-pointer group"
                >
                  <span>Advocate Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C88A32] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
