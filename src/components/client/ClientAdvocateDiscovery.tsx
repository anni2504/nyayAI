import React, { useState, useEffect } from 'react';
import type { AdvocateMatch } from '../../data/types';
import { Search, ShieldCheck, ArrowUpRight, Calendar, Filter, Users, Bookmark, BookmarkCheck } from 'lucide-react';
import { useCaseContext } from '../../context/CaseContext';
import { fetchSavedAdvocates, saveAdvocateApi, removeSavedAdvocateApi } from '../../services/api';

export const ClientAdvocateDiscovery: React.FC = () => {
  const { activeCase, openMatchEvidenceModal } = useCaseContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPractice, setSelectedPractice] = useState('All');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const recommendations: AdvocateMatch[] = (activeCase?.recommendations as AdvocateMatch[]) || [];

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetchSavedAdvocates();
        const ids = new Set((res.advocates || []).map((a: any) => a.id));
        setSavedIds(ids);
      } catch {
        // silently fail — save toggle just won't show as saved
      }
    }
    loadSaved();
  }, []);

  const toggleSave = async (adv: AdvocateMatch) => {
    const isSaved = savedIds.has(adv.id);
    setTogglingId(adv.id);
    try {
      if (isSaved) {
        await removeSavedAdvocateApi(adv.id);
        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(adv.id);
          return next;
        });
      } else {
        await saveAdvocateApi(adv);
        setSavedIds(prev => new Set(prev).add(adv.id));
      }
    } catch {
      // silent — could add toast
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = recommendations.filter((adv: AdvocateMatch) => {
    const matchesSearch = adv.name.toLowerCase().includes(searchTerm.toLowerCase()) || (adv.jurisdiction && adv.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPractice = selectedPractice === 'All' || (adv.practiceArea && adv.practiceArea.includes(selectedPractice));
    return matchesSearch && matchesPractice;
  });

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
            Precedent-Ranked Directory
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Advocate Discovery</h1>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filtered.length} Recommended Advocates
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-subtle max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-slate-900">
              Complete your case details to get advocate recommendations.
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Describe your legal situation or upload relevant court orders in Ask NYAYAI. Once your case facts are assembled, our precedent engine matches qualified advocates.
            </p>
          </div>
          <button
            onClick={() => { window.location.hash = '#/client/copilot'; }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition-smooth"
          >
            Build Case in Ask NYAYAI
          </button>
        </div>
      ) : (
        <>
          {/* SEARCH AND FILTERS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by advocate name, court, or city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-950"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedPractice}
                onChange={e => setSelectedPractice(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-950"
              >
                <option value="All">All Practice Areas</option>
                <option value="Criminal Defense">Criminal Defense</option>
                <option value="Property Dispute">Property Dispute</option>
                <option value="Real Estate & RERA">Real Estate & RERA</option>
              </select>
            </div>
          </div>

          {/* ADVOCATES LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((adv: AdvocateMatch) => {
              const isSaved = savedIds.has(adv.id);
              return (
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
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{adv.experienceYears} Years Exp • {adv.jurisdiction}</p>
                      </div>
                    </div>

                    <div className="bg-indigo-950 text-amber-400 px-3 py-1.5 rounded-xl text-center shadow-xs">
                      <div className="text-[9px] font-bold uppercase tracking-wider">Match Fit</div>
                      <div className="text-lg font-black">{adv.matchScore}%</div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                    <div className="font-bold text-indigo-950 text-[10px] uppercase">Why Matched:</div>
                    <p className="text-slate-700 italic">"{adv.whyMatch ? adv.whyMatch[0] : 'Matches practice area and procedural stage'}"</p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => openMatchEvidenceModal(adv)}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-subtle transition-smooth flex items-center justify-center space-x-1.5"
                    >
                      <span>View Match Evidence</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>

                    <button
                      onClick={() => toggleSave(adv)}
                      disabled={togglingId === adv.id}
                      className={`font-bold text-xs py-3 px-4 rounded-xl shadow transition-smooth flex items-center space-x-1 disabled:opacity-50 ${
                        isSaved
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="w-4 h-4" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>Save</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => window.location.hash = '#/client/bookings'}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl shadow transition-smooth flex items-center space-x-1"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Book</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
};
