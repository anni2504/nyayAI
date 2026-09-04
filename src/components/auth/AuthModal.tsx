import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../auth/rbac';
import { X, Scale, UserCheck, Briefcase, Lock, Mail, User, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalDefaultRole,
    authModalDefaultMode,
    login,
    register
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(authModalDefaultMode);
  const [selectedRole, setSelectedRole] = useState<Role>(authModalDefaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [barNumber, setBarNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync mode and role when modal opens
  React.useEffect(() => {
    setMode(authModalDefaultMode);
    setSelectedRole(authModalDefaultRole);
    setErrorMessage(null);
  }, [authModalDefaultMode, authModalDefaultRole, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleQuickDemoLogin = async (demoRole: Role) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (demoRole === 'CLIENT') {
        await login({ email: 'client@nyayai.demo', password: 'Client123!' });
      } else {
        await login({ email: 'advocate@nyayai.demo', password: 'Advocate123!' });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === 'signin') {
        await login({ email, password });
      } else {
        await register({
          name,
          email,
          password,
          role: selectedRole,
          title: selectedRole === 'ADVOCATE' ? title : undefined,
          barNumber: selectedRole === 'ADVOCATE' ? barNumber : undefined
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-floating border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-950 text-white flex items-start justify-between border-b border-slate-800 relative">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-card">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">NYAYAI Secure Portal</span>
              <h2 className="text-xl font-extrabold tracking-tight">
                {mode === 'signin' ? 'Sign In to NYAYAI' : 'Create Account'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5 bg-warm-white">

          {/* MODE TABS (SIGN IN / SIGN UP) */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-smooth ${
                mode === 'signin'
                  ? 'bg-white text-slate-950 shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-smooth ${
                mode === 'signup'
                  ? 'bg-white text-slate-950 shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* ROLE SELECTOR (FOR SIGN UP) */}
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Select Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('CLIENT')}
                  className={`p-3 rounded-xl border-2 flex items-center space-x-2.5 transition-smooth ${
                    selectedRole === 'CLIENT'
                      ? 'border-indigo-950 bg-indigo-50/60 text-indigo-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-indigo-900" />
                  <span className="text-xs font-bold">Client</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('ADVOCATE')}
                  className={`p-3 rounded-xl border-2 flex items-center space-x-2.5 transition-smooth ${
                    selectedRole === 'ADVOCATE'
                      ? 'border-amber-600 bg-amber-50/60 text-amber-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold">Advocate</span>
                </button>
              </div>
            </div>
          )}

          {/* ERROR DISPLAY */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* AUTH FORM */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder={selectedRole === 'CLIENT' ? 'Rohan Sharma' : 'Adv. Rajesh Varma'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {mode === 'signup' && selectedRole === 'ADVOCATE' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior High Court Appellate Advocate"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State Bar Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. KAR/2012/4819"
                    value={barNumber}
                    onChange={(e) => setBarNumber(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl shadow-subtle transition-smooth flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* SEEDED DEMO ACCOUNTS SECTION */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              <span>Quick Development Demo Logins</span>
              <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Database Authenticated
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('CLIENT')}
                disabled={isSubmitting}
                className="p-2.5 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-950 border border-indigo-200/80 rounded-xl text-left transition-smooth group"
              >
                <div className="text-xs font-bold group-hover:text-indigo-900">Rohan Sharma</div>
                <div className="text-[10px] text-indigo-700 font-medium">Client Account</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ADVOCATE')}
                disabled={isSubmitting}
                className="p-2.5 bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 border border-amber-200/80 rounded-xl text-left transition-smooth group"
              >
                <div className="text-xs font-bold group-hover:text-amber-900">Adv. Rajesh Varma</div>
                <div className="text-[10px] text-amber-800 font-medium">Advocate Account</div>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
