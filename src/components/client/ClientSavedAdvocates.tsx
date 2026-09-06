import React, { useState, useEffect } from 'react';
import type { AdvocateMatch } from '../../data/types';
import { ShieldCheck, Bookmark, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchSavedAdvocates, removeSavedAdvocateApi } from '../../services/api';

export const ClientSavedAdvocates: React.FC = () => {
  const [savedAdvocates, setSavedAdvocates] = useState<AdvocateMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadSaved = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchSavedAdvocates();
      setSavedAdvocates((res.advocates || []) as AdvocateMatch[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load saved advocates.');
      setSavedAdvocates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleRemove = async (advocateId: string) => {
    setRemovingId(advocateId);
    try {
      await removeSavedAdvocateApi(advocateId);
      setSavedAdvocates(prev => prev.filter(a => a.id !== advocateId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove advocate.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
            Your Shortlist
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Saved Advocates</h1>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {savedAdvocates.length} Saved Profile{savedAdvocates.length === 1 ? '' : 's'}
        </div>
      </div>

      {error && (
        <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={loadSaved} className="ml-auto text-indigo-900 underline">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3 shadow-subtle max-w-xl mx-auto my-8">
          <RefreshCw className="w-6 h-6 text-slate-400 mx-auto animate-spin" />
          <p className="text-xs font-bold text-slate-600">Loading saved advocates...</p>
        </div>
      ) : savedAdvocates.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3 shadow-subtle max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center mx-auto">
            <Bookmark className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-slate-900">
              You haven't saved any advocates yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When you find a recommended advocate that matches your needs, save them here for quick access.
            </p>
          </div>
          <button
            onClick={() => window.location.hash = '#/client/advocates'}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition-smooth"
          >
            Explore Advocate Discovery
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedAdvocates.map((adv: AdvocateMatch) => (
            <div key={adv.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
              
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <img
                    src={adv.avatar}
                    alt={adv.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-900/10"
                  />
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h3 className="text-base font-extrabold text-slate-900">{adv.name}</h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{adv.title}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {adv.experienceYears} Years Exp • {adv.jurisdiction}
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-950 text-amber-400 px-3 py-1.5 rounded-xl text-center shadow-xs">
                  <div className="text-[9px] font-bold uppercase tracking-wider">Match Fit</div>
                  <div className="text-lg font-black">{adv.matchScore}%</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-indigo-950 text-[10px] uppercase">Why Matched:</div>
                <p className="text-slate-700 italic">
                  "{adv.whyMatch ? adv.whyMatch[0] : 'Matches practice area and procedural stage'}"
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => window.location.hash = '#/client/bookings'}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl shadow transition-smooth flex items-center justify-center space-x-1.5"
                >
                  <span>Book Consultation</span>
                </button>

                <button
                  onClick={() => handleRemove(adv.id)}
                  disabled={removingId === adv.id}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs py-3 px-4 rounded-xl border border-rose-200 transition-smooth disabled:opacity-50"
                >
                  {removingId === adv.id ? 'Removing...' : 'Remove'}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
