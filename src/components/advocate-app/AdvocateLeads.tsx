import React, { useState } from 'react';
import { mockLeadsList } from '../../data/mockLeads';
import { CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';

export const AdvocateLeads: React.FC = () => {
  const [leads, setLeads] = useState(mockLeadsList);

  const handleAction = (id: string, status: 'accepted' | 'declined') => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Advocate Marketplace</span>
          <h1 className="text-2xl font-extrabold text-white">Eligible Client Lead Requests</h1>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          Showing {leads.length} Eligible Requests
        </div>
      </div>

      {/* PRIVACY CONSENT NOTICE */}
      <div className="p-4 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-start space-x-3 text-xs text-amber-300">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-amber-200">Sensitive Document Isolation Rule:</strong>
          Client case descriptions are sanitized for initial evaluation. Full private document access is granted only after client consultation authorization.
        </div>
      </div>

      {/* LEADS CARDS LIST */}
      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded">
                  {lead.matchScore}% Match
                </span>
                <span className="text-xs font-semibold text-slate-300">{lead.caseType}</span>
              </div>
              <span className="text-xs text-slate-400">{lead.jurisdiction}</span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">{lead.matterTitle}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{lead.summary}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Matching Rationale:</div>
              {lead.matchReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center text-slate-400 gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="text-xs text-slate-400">
                Status: <strong className="capitalize text-white">{lead.status}</strong>
              </div>

              <div className="flex items-center space-x-3">
                {lead.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleAction(lead.id, 'declined')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-smooth flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleAction(lead.id, 'accepted')}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-smooth flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Lead</span>
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded border border-emerald-800">
                    Lead {lead.status === 'accepted' ? 'Accepted' : 'Declined'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
