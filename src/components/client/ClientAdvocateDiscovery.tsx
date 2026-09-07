import React, { useState, useEffect, useCallback } from 'react';
import { Search, ShieldCheck, Calendar, Filter, Users, Bookmark, BookmarkCheck, X, IndianRupee, BadgeCheck, Scale, BookOpen } from 'lucide-react';
import { useCaseContext } from '../../context/CaseContext';
import {
  fetchSavedAdvocates,
  saveAdvocateApi,
  removeSavedAdvocateApi,
  fetchCaseRecommendations,
  createClientBooking,
  type DirectoryAdvocateSummary
} from '../../services/api';

interface RecommendationCard {
  id: string;
  name: string;
  avatar: string;
  title: string;
  matchScore: number;
  practiceArea: string;
  jurisdiction: string;
  court: string;
  experienceYears: number;
  whyMatch: string[];
  breakdown?: Record<string, number>;
  matchedCases?: any[];
  consultationFee?: string;
  budgetFit?: 'within' | 'slightly-above' | 'above' | 'unknown';
  verificationStatus?: string;
  verifiedCaseCount?: number;
  location?: string;
  barNumber?: string;
  bio?: string;
}

const BUDGET_LABEL: Record<string, string> = {
  within: 'Within budget',
  'slightly-above': 'Slightly above budget',
  above: 'Above budget',
  unknown: 'Fee on request'
};

function toAvatarUrl(entry: DirectoryAdvocateSummary | undefined): string {
  return entry?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';
}

function advocateIdOf(entry: RecommendationCard | DirectoryAdvocateSummary): string {
  if ('advocateId' in entry) return entry.advocateId;
  return entry.id;
}

function advocatePracticeAreasOf(entry: RecommendationCard | DirectoryAdvocateSummary): string {
  if ('practiceAreas' in entry && Array.isArray(entry.practiceAreas) && entry.practiceAreas.length > 0) {
    return entry.practiceAreas.join(', ');
  }
  if ('practiceArea' in entry && entry.practiceArea) return entry.practiceArea;
  return 'General Legal Practice';
}

function advocateWhyMatchOf(entry: RecommendationCard | DirectoryAdvocateSummary): string[] {
  if ('whyMatch' in entry && Array.isArray(entry.whyMatch)) return entry.whyMatch;
  return [];
}

export const ClientAdvocateDiscovery: React.FC = () => {
  const { activeCase } = useCaseContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [showAllAdvocates, setShowAllAdvocates] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [directory, setDirectory] = useState<DirectoryAdvocateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [profileAdvocate, setProfileAdvocate] = useState<RecommendationCard | DirectoryAdvocateSummary | null>(null);
  const [bookingAdvocate, setBookingAdvocate] = useState<RecommendationCard | DirectoryAdvocateSummary | null>(null);
  const [bookingMatter, setBookingMatter] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('4:30 PM - 5:30 PM');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    const cid = activeCase?.id;
    if (!cid || cid === 'case-1') {
      setRecommendations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const parsedBudget = budget.trim() === '' ? undefined : Number(budget.replace(/[^0-9]/g, ''));
      const parsed = await fetchCaseRecommendations(cid, parsedBudget || undefined);
      setRecommendations(Array.isArray(parsed.recommendations) ? parsed.recommendations : []);
      setDirectory(parsed.allAdvocates || []);
    } catch (err: any) {
      setError(err.message || 'Could not load advocate recommendations.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [activeCase?.id, budget]);

  useEffect(() => { loadRecommendations(); }, [loadRecommendations]);

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetchSavedAdvocates();
        setSavedIds(new Set((res.advocates || []).map((a: any) => a.id)));
      } catch {
        // silently ignore — toggles just won't show as saved
      }
    }
    loadSaved();
  }, []);

  const toggleSave = async (adv: { id: string }) => {
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
      // silent
    } finally {
      setTogglingId(null);
    }
  };

  const submitBooking = async () => {
    if (!bookingAdvocate) return;
    setBookingBusy(true);
    setBookingMessage(null);
    try {
      await createClientBooking({
        advocateId: advocateIdOf(bookingAdvocate),
        matterTitle: bookingMatter,
        date: bookingDate,
        timeSlot: bookingSlot,
        fee: (bookingAdvocate as any).consultationFee || undefined
      });
      setBookingMessage('Consultation request sent! The advocate will confirm shortly.');
      setTimeout(() => {
        setBookingAdvocate(null);
        setBookingMessage(null);
      }, 1600);
    } catch (err: any) {
      setBookingMessage(err.message || 'Could not submit the consultation request.');
    } finally {
      setBookingBusy(false);
    }
  };

  const displayedAdvocates = showAllAdvocates
    ? directory.map(d => ({
        id: d.advocateId,
        name: d.name,
        avatar: toAvatarUrl(d),
        title: d.title || 'Legal Advocate',
        matchScore: 0,
        practiceArea: d.practiceAreas.join(', ') || 'General Legal Practice',
        jurisdiction: d.jurisdiction,
        court: d.court,
        experienceYears: d.experienceYears,
        consultationFee: d.consultationFee,
        verificationStatus: d.verificationStatus,
        verifiedCaseCount: d.verifiedCaseCount,
        location: d.location,
        bio: d.bio,
        whyMatch: [
          (d.verificationStatus === 'verified'
            ? `Verified lawyer with ${d.verifiedCaseCount} verified case record${d.verifiedCaseCount === 1 ? '' : 's'} on file.`
            : 'Registered advocate on the platform.')
        ]
      }))
    : recommendations;

  const filtered = displayedAdvocates.filter((adv: any) => {
    const matchesSearch =
      adv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adv.jurisdiction && adv.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (adv.practiceArea && adv.practiceArea.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0B1024]/10 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#0B1024]/5">
            Recommended Advocates
          </span>
          <h1 className="text-2xl font-extrabold mt-1">Advocate Discovery</h1>
          <p className="text-xs text-[#4F586B] font-medium mt-1">
            Recommendations are generated from verified case records and your case details — never fabricated.
          </p>
        </div>

        <div className="text-xs text-[#4F586B] font-medium">
          {showAllAdvocates ? `Showing ${filtered.length} advocates` : `Showing ${filtered.length} recommended advocates`}
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-[#0B1024]/8 shadow-2xs flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#4F586B] absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by advocate name, court, or practice area..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#0B1024]/10 rounded-xl text-xs focus:outline-none focus:border-[#D89947]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <IndianRupee className="w-4 h-4 text-[#4F586B] shrink-0" />
          <input
            type="number"
            min={0}
            placeholder="Weekly budget (₹)"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            className="bg-[#FAF8F5] border border-[#0B1024]/10 rounded-xl px-3 py-2.5 text-xs w-36 focus:outline-none focus:border-[#D89947]"
          />
          <Filter className="w-4 h-4 text-[#4F586B] shrink-0 ml-2" />
          <button
            onClick={() => {
              setShowAllAdvocates(v => !v);
              if (!showAllAdvocates) loadRecommendations();
            }}
            className={`font-bold text-xs px-4 py-2.5 rounded-xl border transition-colors ${
              showAllAdvocates
                ? 'bg-[#0B1024] text-white border-[#0B1024]'
                : 'bg-white text-[#0B1024] border-[#0B1024]/15 hover:bg-[#FAF6EE]'
            }`}
          >
            {showAllAdvocates ? 'Show Recommendations' : 'Show All Advocates'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-xs text-[#4F586B] bg-white rounded-2xl border border-[#0B1024]/8">
          Loading advocates...
        </div>
      ) : error ? (
        <div className="p-10 text-center text-xs text-[#4F586B] bg-white rounded-2xl border border-[#0B1024]/8">
          <p className="font-bold text-[#0B1024] mb-1">Could not load advocates.</p>
          <p>{error}</p>
        </div>
      ) : displayedAdvocates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#0B1024]/8 p-12 text-center space-y-4 shadow-2xs max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF6EE] text-[#4F586B] flex items-center justify-center mx-auto border border-[#0B1024]/5">
            <Users className="w-7 h-7 text-[#C88A32]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold">
              Complete your case details to get advocate recommendations.
            </h3>
            <p className="text-xs text-[#4F586B] leading-relaxed">
              Describe your legal situation in Ask NYAYAI. Once your case facts are assembled, we match qualified advocates from their verified records.
            </p>
          </div>
          <button
            onClick={() => { window.location.hash = '#/client/copilot'; }}
            className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-bold text-xs px-6 py-3 rounded-xl shadow-2xs transition-all"
          >
            Build Case in Ask NYAYAI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((adv: RecommendationCard) => {
            const isSaved = savedIds.has(adv.id);
            const budgetLabel = adv.budgetFit ? BUDGET_LABEL[adv.budgetFit] : null;
            return (
              <div key={adv.id} className="bg-white p-6 rounded-3xl border border-[#0B1024]/8 shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <img src={adv.avatar} alt={adv.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#D89947]/30" />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-base font-extrabold">{adv.name}</h3>
                        {adv.verificationStatus === 'verified' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <BadgeCheck className="w-4 h-4 text-[#4F586B]/60" />
                        )}
                      </div>
                      <p className="text-xs text-[#4F586B] font-medium">{adv.title}</p>
                      <p className="text-[11px] text-[#4F586B]/70 font-medium mt-0.5">
                        {adv.experienceYears} Years Exp
                        {adv.verificationStatus === 'verified' ? ` • ${adv.verifiedCaseCount ?? 0} verified records` : ' • verification pending'}
                      </p>
                    </div>
                  </div>

                  {adv.matchScore > 0 ? (
                    <div className="bg-[#0B1024] text-amber-400 px-3 py-1.5 rounded-xl text-center shadow-xs">
                      <div className="text-[9px] font-bold uppercase tracking-wider">Match Fit</div>
                      <div className="text-lg font-black">{adv.matchScore}%</div>
                    </div>
                  ) : (
                    <div className="bg-[#FAF6EE] text-[#0B1024] px-3 py-1.5 rounded-xl text-center border border-[#0B1024]/5">
                      <div className="text-[9px] font-bold uppercase tracking-wider">Profile</div>
                      <div className="text-lg font-black">—</div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#0B1024]/5 text-xs space-y-1.5">
                  <div className="font-bold text-[#0B1024] text-[10px] uppercase">Why Recommended:</div>
                  {(adv.whyMatch && adv.whyMatch.length > 0) ? (
                    adv.whyMatch.slice(0, 2).map((why, i) => (
                      <p key={i} className="text-[#4F586B] leading-relaxed">{why}</p>
                    ))
                  ) : (
                    <p className="text-[#4F586B] italic">Registered advocate available for consultation.</p>
                  )}
                </div>

                {(budgetLabel || adv.consultationFee) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border ${
                      adv.budgetFit === 'within' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      adv.budgetFit === 'slightly-above' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      adv.budgetFit === 'above' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      'bg-[#FAF6EE] text-[#4F586B] border-[#0B1024]/5'
                    }`}>
                      {budgetLabel}
                    </span>
                    {adv.consultationFee && (
                      <span className="text-xs font-bold text-[#0B1024]">{adv.consultationFee}<span className="text-[#4F586B]/60 font-medium"> / session</span></span>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => setProfileAdvocate(adv)}
                    className="flex-1 bg-[#0B1024] hover:bg-[#1b2340] text-white font-bold text-xs py-3 px-4 rounded-xl shadow-2xs transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => toggleSave(adv)}
                    disabled={togglingId === adv.id}
                    className={`font-bold text-xs py-3 px-4 rounded-xl shadow-2xs transition-all flex items-center space-x-1 disabled:opacity-50 ${
                      isSaved
                        ? 'bg-[#FAF6EE] text-[#0B1024] border border-[#0B1024]/15'
                        : 'bg-[#D89947] hover:bg-[#C58838] text-[#0B1024]'
                    }`}
                  >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setBookingAdvocate(adv);
                      setBookingMatter(activeCase?.title || 'Legal Consultation');
                      setBookingDate('');
                    }}
                    className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-bold text-xs py-3 px-4 rounded-xl shadow-2xs transition-all flex items-center space-x-1"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PROFILE MODAL */}
      {profileAdvocate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setProfileAdvocate(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <img src={profileAdvocate.avatar} alt={profileAdvocate.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#D89947]/40" />
                <div>
                  <h3 className="text-lg font-extrabold">{profileAdvocate.name}</h3>
                  <p className="text-xs text-[#4F586B] font-medium">{profileAdvocate.title}</p>
                  {profileAdvocate.verificationStatus === 'verified' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED LAWYER
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setProfileAdvocate(null)} className="p-2 text-[#4F586B] hover:bg-[#FAF6EE] rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5">
                <p className="text-[10px] font-bold uppercase text-[#4F586B]">Experience</p>
                <p className="font-bold mt-0.5">{profileAdvocate.experienceYears} years</p>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5">
                <p className="text-[10px] font-bold uppercase text-[#4F586B]">Jurisdiction</p>
                <p className="font-bold mt-0.5">{profileAdvocate.jurisdiction}</p>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5">
                <p className="text-[10px] font-bold uppercase text-[#4F586B]">Courts</p>
                <p className="font-bold mt-0.5">{profileAdvocate.court}</p>
              </div>
              {(profileAdvocate as any).consultationFee && (
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5">
                  <p className="text-[10px] font-bold uppercase text-[#4F586B]">Consultation Fee</p>
                  <p className="font-bold mt-0.5">{(profileAdvocate as any).consultationFee}</p>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#0B1024]/5 text-xs space-y-1.5">
              <div className="font-bold text-[#0B1024] text-[10px] uppercase">Practice Areas</div>
              <div className="flex flex-wrap gap-1.5">
                {advocatePracticeAreasOf(profileAdvocate).split(', ').map((pa, i) => (
                  <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#0B1024]/10">{pa}</span>
                ))}
              </div>
            </div>

            <div className="text-xs text-[#4F586B] leading-relaxed">
              <div className="font-bold text-[#0B1024] text-[10px] uppercase mb-1">Why Recommended</div>
              {advocateWhyMatchOf(profileAdvocate).map((why, i) => (
                <p key={i} className="mb-1">• {why}</p>
              ))}
            </div>

            {(profileAdvocate as any).matchedCases && (profileAdvocate as any).matchedCases.length > 0 && (
              <div className="text-xs text-[#4F586B] leading-relaxed">
                <div className="font-bold text-[#0B1024] text-[10px] uppercase mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#C88A32]" /> Related Past Matters
                </div>
                {(profileAdvocate as any).matchedCases.slice(0, 2).map((mc: any, i: number) => (
                  <p key={i} className="mb-1.5">
                    <span className="font-bold text-[#0B1024]">{mc.title}</span> ({mc.year}) — {mc.relevance || ''}{mc.outcome ? ` Outcome: ${mc.outcome}` : ''}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                const picked = profileAdvocate;
                setProfileAdvocate(null);
                setBookingAdvocate(picked && 'advocateId' in picked ? picked : { ...picked, advocateId: picked!.id });
              }}
              className="w-full bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-bold text-sm py-3 rounded-xl flex items-center justify-center space-x-2 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Consultation</span>
            </button>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {bookingAdvocate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBookingAdvocate(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold">Book Consultation</h3>
                <p className="text-xs text-[#4F586B] font-medium">Request a session with {bookingAdvocate.name}</p>
              </div>
              <button onClick={() => setBookingAdvocate(null)} className="p-2 text-[#4F586B] hover:bg-[#FAF6EE] rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-xs font-bold text-[#0B1024]">Matter Title</label>
            <input
              value={bookingMatter}
              onChange={e => setBookingMatter(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#0B1024]/10 rounded-xl text-xs focus:outline-none focus:border-[#D89947]"
              placeholder="Briefly describe your matter"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#0B1024] mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#0B1024]/10 rounded-xl text-xs focus:outline-none focus:border-[#D89947]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0B1024] mb-1">Time Slot</label>
                <select
                  value={bookingSlot}
                  onChange={e => setBookingSlot(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#0B1024]/10 rounded-xl text-xs focus:outline-none focus:border-[#D89947]"
                >
                  <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                  <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM</option>
                  <option value="2:00 PM - 3:00 PM">2:00 PM - 3:00 PM</option>
                  <option value="4:30 PM - 5:30 PM">4:30 PM - 5:30 PM</option>
                  <option value="6:00 PM - 7:00 PM">6:00 PM - 7:00 PM</option>
                </select>
              </div>
            </div>

            {(bookingAdvocate as any).consultationFee && (
              <p className="text-xs text-[#4F586B]">
                Consultation fee: <span className="font-bold text-[#0B1024]">{(bookingAdvocate as any).consultationFee}</span>
              </p>
            )}

            {bookingMessage && (
              <p className={`text-xs font-bold ${bookingMessage.includes('sent') ? 'text-emerald-700' : 'text-rose-600'}`}>
                {bookingMessage}
              </p>
            )}

            <button
              onClick={submitBooking}
              disabled={bookingBusy || !bookingMatter || !bookingDate}
              className="w-full bg-[#D89947] hover:bg-[#C58838] disabled:opacity-40 text-[#0B1024] font-bold text-sm py-3 rounded-xl transition-all"
            >
              {bookingBusy ? 'Sending...' : 'Send Consultation Request'}
            </button>
            <p className="text-[10px] text-[#4F586B]/70 text-center">
              The advocate will confirm your session. You can track requests in Bookings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};