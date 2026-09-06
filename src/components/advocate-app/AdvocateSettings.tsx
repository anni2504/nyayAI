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
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 font-sans">
      
      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Professional Preferences
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">Advocate Settings & Lead Controls</h1>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#0B1024]/8 space-y-6 shadow-2xs">
        
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-[#C88A32] uppercase tracking-wider flex items-center gap-2 font-serif">
            <Bell className="w-4 h-4 text-[#C88A32]" />
            <span>Lead Request Notifications</span>
          </h3>

          <div className="space-y-3 text-xs text-[#0B1024]">
            <label className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/8 cursor-pointer hover:border-[#D89947]/30 transition-colors">
              <span className="font-medium">Notify immediately when high-precedent fit lead arrives (&gt;80% match)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#D89947] rounded cursor-pointer" />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/8 cursor-pointer hover:border-[#D89947]/30 transition-colors">
              <span className="font-medium">Receive weekly analytics summary report</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#D89947] rounded cursor-pointer" />
            </label>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#0B1024]/8">
          <h3 className="text-sm font-extrabold text-[#C88A32] uppercase tracking-wider flex items-center gap-2 font-serif">
            <MapPin className="w-4 h-4 text-[#C88A32]" />
            <span>Jurisdiction Availability</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#0B1024]">
            <label className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/8 cursor-pointer hover:border-[#D89947]/30 transition-colors">
              <span className="font-medium">Karnataka High Court & Subordinate Courts</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#D89947] rounded cursor-pointer" />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/8 cursor-pointer hover:border-[#D89947]/30 transition-colors">
              <span className="font-medium">Supreme Court of India (Appeals)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#D89947] rounded cursor-pointer" />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-[#0B1024]/8 flex justify-end">
          <button
            type="submit"
            className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs px-8 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Save Preferences
          </button>
        </div>

      </form>

    </div>
  );
};
