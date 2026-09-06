import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Shield, CheckCircle2, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchClientProfile, updateClientProfile } from '../../services/api';

export const ClientSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    preferredLanguage: 'English (India)',
    privacyConsent: true
  });

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const res = await fetchClientProfile();
        const u = res.user;
        setForm({
          name: u.name || '',
          phone: u.phone || '',
          preferredLanguage: u.preferredLanguage || 'English (India)',
          privacyConsent: u.privacyConsent !== undefined ? u.privacyConsent : true
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load profile.');
        setForm({
          name: user?.name || '',
          phone: '',
          preferredLanguage: 'English (India)',
          privacyConsent: true
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await updateClientProfile({
        name: form.name,
        phone: form.phone,
        preferredLanguage: form.preferredLanguage,
        privacyConsent: form.privacyConsent
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (refreshUser) refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
            Client Account Settings
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Profile & Privacy Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Email: <span className="font-semibold text-slate-700">{user?.email || '—'}</span> &middot; Role: <span className="font-semibold text-slate-700">Client</span>
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Account settings updated!
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" /> {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3 shadow-card max-w-xl mx-auto">
          <RefreshCw className="w-6 h-6 text-slate-400 mx-auto animate-spin" />
          <p className="text-xs font-bold text-slate-600">Loading profile...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-900" />
              <span>Personal Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full border border-slate-200 rounded-xl p-3 text-slate-500 bg-slate-50 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Email cannot be changed here.</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Preferred Legal Copilot Language</label>
                <select
                  value={form.preferredLanguage}
                  onChange={e => setForm({ ...form, preferredLanguage: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-900"
                >
                  <option>English (India)</option>
                  <option>Hindi (हिंदी)</option>
                  <option>Kannada (ಕನ್ನಡ)</option>
                  <option>Tamil (தமிழ்)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Data Privacy & Encrypted Vault</span>
            </h3>

            <label className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.privacyConsent}
                onChange={e => setForm({ ...form, privacyConsent: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-indigo-900"
              />
              <div>
                <strong className="block text-slate-900 font-bold">Client Data Privacy & Protection</strong>
                Your uploaded court documents and case history are kept strictly private and never shared with advocates without your explicit authorization during consultation booking.
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-7 py-3.5 rounded-xl shadow-subtle transition-smooth flex items-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
