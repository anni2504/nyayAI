import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, CheckCircle2, Save, Loader2 } from 'lucide-react';
import { fetchAdvocateProfile, updateAdvocateProfile } from '../../services/api';
import type { AdvocateProfile } from '../../services/api';

const toList = (value?: string[]): string => (Array.isArray(value) ? value.join(', ') : '');

export const AdvocateProfileManager: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<AdvocateProfile>({
    advocateId: '',
    name: user?.name || '',
    avatar: user?.avatar,
    email: user?.email,
    title: '',
    barNumber: '',
    phone: '',
    practiceAreas: [],
    jurisdiction: 'Karnataka',
    court: 'Karnataka High Court',
    experienceYears: 0,
    consultationFee: '',
    bio: '',
    location: '',
    languages: [],
    verificationStatus: 'unverified'
  });

  useEffect(() => {
    let disposed = false;
    async function loadProfile() {
      try {
        const res = await fetchAdvocateProfile();
        if (!disposed && res.profile) setProfile(res.profile);
      } catch (err: any) {
        if (!disposed) setError(err.message || 'Failed to load profile.');
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    loadProfile();
    return () => { disposed = true; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateAdvocateProfile({
        name: profile.name,
        title: profile.title,
        barNumber: profile.barNumber,
        phone: profile.phone,
        practiceAreas: profile.practiceAreas,
        jurisdiction: profile.jurisdiction,
        court: profile.court,
        consultationFee: profile.consultationFee,
        bio: profile.bio,
        location: profile.location,
        languages: profile.languages
      });
      setProfile(res.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#C88A32] animate-spin" />
      </div>
    );
  }

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
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Profile updates saved successfully.
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#0B1024]/8 space-y-6 shadow-2xs">

        <div className="flex items-center space-x-4 pb-4 border-b border-[#0B1024]/8">
          <img
            src={profile.avatar || user?.avatar || "/assets/advocate-portrait.jpg"}
            alt={profile.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#D89947]"
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-base font-extrabold text-[#0B1024] font-serif">{profile.name || user?.name}</h3>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
            </div>
            <p className="text-xs text-[#C88A32] font-semibold">{user?.email || profile.email}</p>
            <p className="text-xs text-[#4F586B]">
              {profile.title || 'Verified Advocate'} · {profile.experienceYears} Years Experience
            </p>
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
              value={profile.title || ''}
              onChange={e => setProfile({ ...profile, title: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Account Email</label>
            <input
              type="text"
              disabled
              value={user?.email || profile.email || ''}
              className="w-full bg-[#FAF8F5]/60 border border-[#0B1024]/10 rounded-xl p-3 text-[#4F586B] font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-[#4F586B] mt-1 block">Account credentials linked to authenticated session.</span>
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Languages Spoken</label>
            <input
              type="text"
              value={toList(profile.languages)}
              onChange={e => setProfile({ ...profile, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[#0B1024] font-bold mb-1.5">Primary Practice Areas</label>
            <input
              type="text"
              value={toList(profile.practiceAreas)}
              onChange={e => setProfile({ ...profile, practiceAreas: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Courts & Jurisdictions</label>
            <input
              type="text"
              value={profile.court || ''}
              onChange={e => setProfile({ ...profile, court: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Primary Jurisdiction</label>
            <input
              type="text"
              value={profile.jurisdiction || ''}
              onChange={e => setProfile({ ...profile, jurisdiction: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Bar Enrollment Number</label>
            <input
              type="text"
              value={profile.barNumber || ''}
              onChange={e => setProfile({ ...profile, barNumber: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div>
            <label className="block text-[#0B1024] font-bold mb-1.5">Consultation Fee (₹)</label>
            <input
              type="text"
              value={profile.consultationFee || ''}
              onChange={e => setProfile({ ...profile, consultationFee: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[#0B1024] font-bold mb-1.5">Professional Biography</label>
            <textarea
              rows={4}
              value={profile.bio || ''}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-xl p-3 text-[#0B1024] focus:outline-none focus:border-[#D89947] text-xs leading-relaxed font-medium"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#0B1024]/8 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs px-8 py-3 rounded-xl shadow-xs inline-flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-[#0B1024]" />
            <span>{saving ? 'Saving...' : 'Save Profile Updates'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};