import React, { useState } from 'react';
import { User, Shield, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [name, setName] = useState('Rohan Sharma');
  const [email, setEmail] = useState('rohan@sharmatech.io');
  const [phone, setPhone] = useState('+91 98765 12345');
  const [language, setLanguage] = useState('English');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 bg-warm-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="border-b border-slate-200 pb-6">
          <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Account Preferences
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 mt-2 tracking-tight">
            Settings & Profile
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Manage your personal profile, notification preferences, and legal privacy controls.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-card space-y-6">
          
          {saved && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" /> Preferences saved successfully.
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-900" /> Profile Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-indigo-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-indigo-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone (+91)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-indigo-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preferred Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-indigo-900"
                >
                  <option>English</option>
                  <option>Hindi (हिन्दी)</option>
                  <option>Kannada (ಕನ್ನಡ)</option>
                  <option>Marathi (मराठी)</option>
                  <option>Tamil (தமிழ்)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-900" /> Data Protection & Confidentiality
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              NYAYAI encrypts all uploaded legal document briefs with AES-256. Case data is strictly accessible only to you and matched Advocates you approve.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-subtle transition-smooth"
            >
              Save Settings
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
