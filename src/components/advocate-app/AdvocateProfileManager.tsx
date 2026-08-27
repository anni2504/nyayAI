import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, CheckCircle2, Save } from 'lucide-react';

export const AdvocateProfileManager: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || 'Adv. Rajesh Varma',
    title: 'Senior Criminal Defense & High Court Appellate Advocate',
    barNumber: 'KAR/2012/4819',
    experienceYears: 14,
    practiceAreas: 'Criminal Defense, Property Dispute, Civil Appeals, Bail Petitions',
    courts: 'Karnataka High Court, Supreme Court of India, Bengaluru District Court',
    languages: 'English, Kannada, Hindi',
    bio: 'Over 14 years of practice specializing in criminal defense quashing under Section 482 CrPC, property injunction litigation, and High Court appellate advocacy.'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Professional Identity</span>
          <h1 className="text-2xl font-extrabold text-white">Advocate Profile Management</h1>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-950 text-emerald-300 px-3.5 py-1.5 rounded-xl border border-emerald-800 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Bar Registration Verified</span>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        
        <div className="flex items-center space-x-4 pb-4 border-b border-slate-800">
          <img
            src={user?.avatar}
            alt={profile.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-400"
          />
          <div>
            <h3 className="text-base font-extrabold text-white">{profile.name}</h3>
            <p className="text-xs text-amber-400 font-bold">{profile.barNumber}</p>
            <p className="text-xs text-slate-400">{profile.experienceYears} Years Verified Practice</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Full Legal Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Professional Title</label>
            <input
              type="text"
              value={profile.title}
              onChange={e => setProfile({ ...profile, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Bar Council Enrollment Number</label>
            <input
              type="text"
              disabled
              value={profile.barNumber}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-slate-500 font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Bar enrollment verification managed by platform admin.</span>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Years of Practice</label>
            <input
              type="number"
              value={profile.experienceYears}
              onChange={e => setProfile({ ...profile, experienceYears: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-400 font-bold mb-1">Primary Practice Areas</label>
            <input
              type="text"
              value={profile.practiceAreas}
              onChange={e => setProfile({ ...profile, practiceAreas: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-400 font-bold mb-1">Courts & Jurisdictions</label>
            <input
              type="text"
              value={profile.courts}
              onChange={e => setProfile({ ...profile, courts: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-400 font-bold mb-1">Professional Biography</label>
            <textarea
              rows={4}
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400 text-xs leading-relaxed"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-8 py-3 rounded-xl shadow transition-smooth flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Updates</span>
          </button>
        </div>

      </form>

    </div>
  );
};
