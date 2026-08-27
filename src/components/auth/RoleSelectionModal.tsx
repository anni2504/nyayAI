import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, UserCheck, Briefcase, Scale, ArrowRight, ShieldCheck } from 'lucide-react';

export const RoleSelectionModal: React.FC = () => {
  const { isRoleModalOpen, setIsRoleModalOpen, loginAsRole } = useAuth();

  if (!isRoleModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-floating border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">NYAYAI Platform Onboarding</span>
              <h2 className="text-xl font-extrabold tracking-tight">How will you use NYAYAI?</h2>
            </div>
          </div>

          <button
            onClick={() => setIsRoleModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY ROLE CHOICES */}
        <div className="p-6 space-y-4 bg-warm-white">
          
          {/* CLIENT ROLE CHOICE */}
          <div
            onClick={() => loginAsRole('CLIENT')}
            className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-900 shadow-subtle hover:shadow-floating transition-smooth cursor-pointer group flex items-start justify-between"
          >
            <div className="space-y-2 max-w-md">
              <div className="inline-flex items-center space-x-1.5 bg-indigo-50 text-indigo-950 px-2.5 py-1 rounded-lg text-xs font-extrabold border border-indigo-100">
                <UserCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>CLIENT PORTAL</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-950 transition-smooth">
                I'm looking for legal help
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Understand your legal situation, analyze documents, and discover advocates with verified court precedent experience.
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-smooth shrink-0 mt-1">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* ADVOCATE ROLE CHOICE */}
          <div
            onClick={() => loginAsRole('ADVOCATE')}
            className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-600 shadow-subtle hover:shadow-floating transition-smooth cursor-pointer group flex items-start justify-between"
          >
            <div className="space-y-2 max-w-md">
              <div className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-950 px-2.5 py-1 rounded-lg text-xs font-extrabold border border-amber-200">
                <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                <span>ADVOCATE WORKSPACE</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-900 transition-smooth">
                I'm a legal professional
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Manage your professional profile, build your verified High Court precedent case history, and access client opportunities.
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-smooth shrink-0 mt-1">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* DEMO NOTICE FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium px-6">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Demo Auth: Switches session to authenticated role
          </span>
          <span className="text-[11px] text-slate-400">Strict RBAC Enforced</span>
        </div>

      </div>
    </div>
  );
};
