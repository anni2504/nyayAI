import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, CheckCircle2, Save } from 'lucide-react';

export const AdvocateProfileManager: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || 'Adv. Rajesh Varma',
    email: user?.email || 'rajesh.varma@nyayai.law',
    title: 'High Court Advocate & Legal Practitioner',
    practiceAreas: 'Civil & Constitutional Disputes, Criminal Defense, Property Injunctions',
    courts: 'High Court of Karnataka & Supreme Court of India',
    languages: 'English, Hindi, Kannada',
    bio: 'Verified Advocate with over 12 years of practice before High Court and Supreme Court. Specialized in commercial disputes, bail petitions, and property litigation.'
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nyayai_advocate_profile');
      if (stored) {
        setProfile(prev => ({ ...prev, ...JSON.parse(stored) }));
      } else if (user) {
        setProfile(prev => ({ ...prev, name: user.name || prev.name, email: user.email || prev.email }));
      }
    } catch {
      // fallback
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('nyayai_advocate_profile', JSON.stringify(profile));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.warn('Failed to save profile locally:', err);
    }
  };

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 font-sans">
      
      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Professional Identity
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">Advocate Profile</h1>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verified Account ({user?.role || 'ADVOCATE'})</span>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Profile preferences saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#0B1024]/8 space-y-6 shadow-2xs">
        
        <div className="flex items-center space-x-4 pb-4 border-b border-[#0B1024]/8">
          <img
            src={user?.avatar || "/assets/advocate-portrait.jpg"}
            alt={profile.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#D89947]"
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-base font-extrabold text-[#0B1024] font-serif">{profile.name}</h3>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
            </div>
            <p className="text-xs text-[#C88A32] font-semibold">{profile.email}</p>
            <p className="text-xs text-[#4F586B]">Verified High Court Advocate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Full Legal Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Professional Title</label>
            <input
              type="text"
              value={profile.title}
              onChange={e => setProfile({ ...profile, title: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Account Email</label>
            <input
              type="text"
              disabled
              value={profile.email}
              className="w-full bg-[#FAF8F5]/60 border border-[#0B1024]/10 rounded-xl p-3 text-[#4F586B] font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-[#4F586B] mt-1 block">Account credentials linked to authenticated session.</span>
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Languages Spoken</label>
            <input
              type="text"
              value={profile.languages}
              onChange={e => setProfile({ ...profile, languages: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[#0B1024] font-bold mb-1.5">Primary Practice Areas</label>
            <input
              type="text"
              value={profile.practiceAreas}
              onChange={e => setProfile({ ...profile, practiceAreas: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[#0B1024] font-bold mb-1.5">Courts & Jurisdictions</label>
            <input
              type="text"
              value={profile.courts}
              onChange={e => setProfile({ ...profile, courts: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[#0B1024] font-bold mb-1.5">Professional Biography</label>
            <textarea
              rows={4}
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] text-xs leading-relaxed font-medium"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#0B1024]/8 flex justify-end">
          <button
            type="submit"
            className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs px-8 py-3 rounded-xl shadow-xs inline-flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#0B1024]" />
            <span>Save Profile Updates</span>
          </button>
        </div>

      </form>

    </div>
  );
};
