import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface RequireRoleProps {
  allowedRoles: ('CLIENT' | 'ADVOCATE')[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  const currentRole = user?.role || 'CLIENT';

  const isAllowed = allowedRoles.includes(currentRole as 'CLIENT' | 'ADVOCATE');

  if (!isAllowed) {
    // RBAC Protection: Redirect unauthorized role access to proper dashboard
    const targetHash = currentRole === 'CLIENT' ? '#/client' : '#/advocate';
    window.location.hash = targetHash;
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center p-8 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-card max-w-md space-y-4">
          <div className="text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block">
            Access Denied (RBAC Protected)
          </div>
          <h2 className="text-xl font-extrabold text-slate-950">Unauthorized Role Access</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your account is assigned the <strong className="text-slate-900">{currentRole}</strong> role. You cannot access tools reserved for other user roles.
          </p>
          <a
            href={targetHash}
            className="block w-full bg-slate-900 text-white text-xs font-bold py-3 rounded-xl shadow-subtle hover:bg-slate-800 transition-smooth"
          >
            Return to Authorized {currentRole === 'CLIENT' ? 'Client Workspace' : 'Advocate Dashboard'}
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
