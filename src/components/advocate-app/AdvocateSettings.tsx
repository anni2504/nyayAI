import React, { useState } from 'react';
import { Bell, MapPin, CheckCircle2 } from 'lucide-react';

export const AdvocateSettings: React.FC = () => {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Professional Preferences</span>
          <h1 className="text-2xl font-extrabold text-white">Advocate Settings & Lead Controls</h1>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span>Lead Request Notifications</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span>Notify immediately when high-precedent fit lead arrives (&gt;80% match)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-amber-400" />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span>Receive weekly analytics summary report</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-amber-400" />
            </label>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Jurisdiction Availability</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span>Karnataka High Court & Subordinate Courts</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-amber-400" />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span>Supreme Court of India (Appeals)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-amber-400" />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-8 py-3 rounded-xl shadow transition-smooth"
          >
            Save Preferences
          </button>
        </div>

      </form>

    </div>
  );
};
