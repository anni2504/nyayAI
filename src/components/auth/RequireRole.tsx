import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Scale } from 'lucide-react';

interface RequireRoleProps {
  allowedRoles: ('CLIENT' | 'ADVOCATE')[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading, openAuthModal } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-amber-400 font-extrabold shadow-card animate-bounce">
          <Scale className="w-6 h-6" />
        </div>
        <div className="text-xs font-bold text-slate-600 tracking-wide uppercase">
          Verifying Authenticated Session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center p-8 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-card max-w-md space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-950 mx-auto font-black">
            <Scale className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-950">Authentication Required</h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Please sign in with your <strong className="text-slate-900">{allowedRoles.join(' / ')}</strong> account to access this protected workspace.
            </p>
          </div>
          <button
            onClick={() => openAuthModal(allowedRoles[0], 'signin')}
            className="w-full bg-slate-950 text-white text-xs font-bold py-3.5 rounded-xl shadow-subtle hover:bg-slate-800 transition-smooth"
          >
            Sign In / Register Account
          </button>
        </div>
      </div>
    );
  }

  const currentRole = user.role;
  const isAllowed = allowedRoles.includes(currentRole as 'CLIENT' | 'ADVOCATE');

  if (!isAllowed) {
    const targetHash = currentRole === 'CLIENT' ? '#/client' : '#/advocate';
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center p-8 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-card max-w-md space-y-4">
          <div className="text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block">
            Access Denied (Backend RBAC Protected)
          </div>
          <h2 className="text-xl font-extrabold text-slate-950">Unauthorized Role Access</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your authenticated account is assigned the <strong className="text-slate-900">{currentRole}</strong> role. You cannot access workspaces reserved for {allowedRoles.join(' / ')}.
          </p>
          <a
            href={targetHash}
            className="block w-full bg-slate-950 text-white text-xs font-bold py-3.5 rounded-xl shadow-subtle hover:bg-slate-800 transition-smooth"
          >
            Return to Authorized {currentRole === 'CLIENT' ? 'Client Workspace' : 'Advocate Dashboard'}
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
