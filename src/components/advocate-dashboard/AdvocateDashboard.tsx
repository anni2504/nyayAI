import React, { useState } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { mockAdvocatesList } from '../../data/mockAdvocates';
import { Briefcase, Users, Eye, Award, ShieldCheck } from 'lucide-react';

export const AdvocateDashboard: React.FC = () => {
  const { setRole } = useCaseContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'cases'>('overview');

  const lawyer = mockAdvocatesList[0];

  return (
    <div className="flex-1 bg-warm-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* DASHBOARD HEADER BANNER */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-floating flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <img
              src={lawyer.avatar}
              alt={lawyer.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-400"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold">{lawyer.name}</h1>
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">{lawyer.title}</p>
              <p className="text-[11px] text-slate-400 mt-1">{lawyer.stateBarCouncil} • Bar Reg: {lawyer.barNumber}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRole('client')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-smooth"
            >
              Switch to Client View
            </button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Active Leads</span>
              <Users className="w-4 h-4 text-indigo-900" />
            </div>
            <div className="text-3xl font-black text-slate-950">{lawyer.activeLeadsCount}</div>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <span>+3 new leads today</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Profile Views</span>
              <Eye className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-3xl font-black text-slate-950">{lawyer.profileViewsCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">This month across Karnataka</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Precedent Matches</span>
              <Briefcase className="w-4 h-4 text-indigo-800" />
            </div>
            <div className="text-3xl font-black text-slate-950">17</div>
            <div className="text-[11px] text-indigo-900 font-medium">High precedent alignment</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Verified Cases</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-950">{lawyer.verifiedCasesCount}</div>
            <div className="text-[11px] text-emerald-800 font-medium">High Court & Sessions orders</div>
          </div>

        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          {[
            { id: 'overview', label: 'Lead Requests & Matches' },
            { id: 'profile', label: 'Advocate Profile & Precedents' },
            { id: 'cases', label: 'Verified Case Records' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-extrabold px-4 py-2.5 rounded-xl transition-smooth ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
              Incoming Client Case Consultation Requests
            </h3>

            <div className="space-y-4">
              {[
                {
                  id: 'req-1',
                  client: 'Rohan Sharma',
                  matter: 'Neighbour Boundary Dispute & Physical Obstruction',
                  jurisdiction: 'Indiranagar, Bengaluru (Karnataka)',
                  matchScore: 87,
                  readiness: 82,
                  docCount: 1,
                  time: '15 mins ago'
                },
                {
                  id: 'req-2',
                  client: 'Kavita Menon',
                  matter: 'RERA 18-Month Flat Possession Delay',
                  jurisdiction: 'Whitefield, Bengaluru',
                  matchScore: 81,
                  readiness: 90,
                  docCount: 2,
                  time: '2 hours ago'
                }
              ].map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-slate-900">{req.client}</span>
                      <span className="text-[10px] font-extrabold bg-indigo-950 text-amber-400 px-2 py-0.5 rounded">
                        {req.matchScore}% Precedent Match
                      </span>
                      <span className="text-xs text-slate-400">• {req.time}</span>
                    </div>
                    <p className="text-xs font-bold text-indigo-950">{req.matter}</p>
                    <p className="text-xs text-slate-500">{req.jurisdiction} • Readiness Score: {req.readiness}% ({req.docCount} Document attached)</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => alert(`Accepted consultation request from ${req.client}`)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-smooth"
                    >
                      Accept Lead
                    </button>
                    <button
                      onClick={() => alert(`Viewed case brief for ${req.client}`)}
                      className="border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-smooth"
                    >
                      View Case Brief
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6 shadow-subtle">
            <div className="flex justify-between items-start border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{lawyer.name}</h2>
                <p className="text-xs text-slate-600 mt-1">{lawyer.title}</p>
              </div>
              <button
                onClick={() => alert('Opening Advocate Profile Editor...')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-lg transition-smooth"
              >
                Edit Profile
              </button>
            </div>

            <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-100 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-800" />
                Why NYAYAI Matches Clients to You
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Your profile is weighted heavily for Karnataka High Court Section 482 CrPC petitions, criminal intimidation defenses, and property injunctions based on 42 verified precedent filings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-400 uppercase">Practice Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {lawyer.practiceAreas.map((p, i) => (
                    <span key={i} className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg font-bold">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-400 uppercase">Courts & Tribunals</h4>
                <div className="flex flex-wrap gap-2">
                  {lawyer.courts.map((c, i) => (
                    <span key={i} className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg font-bold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'cases' && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
              Verified Precedent Case Records ({lawyer.verifiedCases.length})
            </h3>
            <div className="space-y-4">
              {lawyer.verifiedCases.map((vc) => (
                <div key={vc.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-slate-900">{vc.title}</h4>
                    <span className="text-xs font-bold text-slate-500">{vc.year}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{vc.court} • {vc.practiceArea}</p>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <strong>Facts:</strong> {vc.facts}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Disposition: <strong className="text-slate-900">{vc.disposition}</strong></span>
                    <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded border border-emerald-200">
                      Outcome: {vc.outcome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
