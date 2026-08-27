import React, { useState } from 'react';
import { mockAdvocatesList } from '../../data/mockAdvocates';
import { Search, Filter, ShieldCheck, Star, MapPin } from 'lucide-react';

export const AdvocateDirectory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPracticeArea, setSelectedPracticeArea] = useState('All');

  const practiceAreas = ['All', 'Criminal Defense', 'Property & Real Estate', 'Corporate & Startup', 'Cyber & Tech Law'];

  const filteredAdvocates = mockAdvocatesList.filter(adv => {
    const matchesSearch = adv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          adv.practiceAreas.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPractice = selectedPracticeArea === 'All' || adv.practiceAreas.includes(selectedPracticeArea);
    return matchesSearch && matchesPractice;
  });

  return (
    <div className="flex-1 bg-warm-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            Verified Indian Advocates Directory
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Discover Advocates with Verified Precedents
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl">
            Counsel profiles on NYAYAI are verified against Bar Council state registrations and High Court precedent record databases.
          </p>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
          
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by advocate name, court, or legal practice area..."
              className="w-full text-xs bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-900"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
            {practiceAreas.map((area, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPracticeArea(area)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-smooth whitespace-nowrap ${
                  selectedPracticeArea === area
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

        </div>

        {/* ADVOCATES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredAdvocates.map(adv => (
            <div
              key={adv.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 space-y-6 flex flex-col justify-between hover:border-slate-300 transition-smooth"
            >
              
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={adv.avatar}
                      alt={adv.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-900/10 shadow-sm"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-slate-900">{adv.name}</h3>
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{adv.title}</p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1 font-medium">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {adv.jurisdictions.join(', ')}</span>
                        <span>•</span>
                        <span>{adv.experienceYears} Years Exp</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-900 text-xs font-extrabold">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{adv.rating}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({adv.reviewsCount})</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl text-xs flex items-center justify-between border border-slate-200/80">
                  <span className="text-slate-500 font-medium text-[11px]">Bar Reg: {adv.barNumber}</span>
                  <span className="text-indigo-900 font-semibold text-[11px]">{adv.stateBarCouncil}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {adv.practiceAreas.map((p, i) => (
                    <span key={i} className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      {p}
                    </span>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Verified High Court Precedents</span>
                    <span className="text-emerald-700">{adv.verifiedCasesCount} Cases On File</span>
                  </div>
                  {adv.verifiedCases.slice(0, 1).map((vc, idx) => (
                    <div key={idx} className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1">
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span>{vc.title}</span>
                        <span className="text-[10px] text-slate-500">{vc.year}</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{vc.court}</p>
                      <div className="text-[11px] text-emerald-800 font-medium">Outcome: {vc.outcome}</div>
                    </div>
                  ))}
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center space-x-3">
                <button
                  onClick={() => alert(`Consultation request sent to ${adv.name}`)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl shadow-subtle transition-smooth text-center"
                >
                  Book Consultation ({adv.consultationFee})
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
