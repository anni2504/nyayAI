import React from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { X, CheckCircle2, HelpCircle } from 'lucide-react';

export const ReadinessBreakdownModal: React.FC = () => {
  const { isReadinessModalOpen, setIsReadinessModalOpen, activeCase } = useCaseContext();

  if (!isReadinessModalOpen || !activeCase) return null;

  const score = activeCase.readinessScore;
  const breakdown = activeCase.readinessBreakdown;

  const items = [
    { label: 'Matter Clarity', weight: 20, score: breakdown.matterClarity, desc: 'Clear statement of the primary legal dispute' },
    { label: 'Factual Background', weight: 20, score: breakdown.facts, desc: 'Detailed chronology of events and involved parties' },
    { label: 'Jurisdiction', weight: 15, score: breakdown.jurisdiction, desc: 'State, city, and appropriate court level identified' },
    { label: 'Legal Domain Mapping', weight: 15, score: breakdown.legalDomain, desc: 'Categorization under Indian Penal Code / Civil / RERA acts' },
    { label: 'Procedural Stage', weight: 10, score: breakdown.proceduralStage, desc: 'State of complaint, police notice, or court filing' },
    { label: 'Documentary Support', weight: 10, score: breakdown.documents, desc: 'Uploaded CSR, contracts, agreements, or notices' },
    { label: 'Supplementary Evidence', weight: 10, score: breakdown.otherEvidence, desc: 'CCTV, email correspondence, or financial receipts' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-floating border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>NYAYAI Readiness Score Matrix</span>
            </div>
            <h3 className="text-xl font-extrabold mt-1">Case Readiness Score Breakdown</h3>
            <p className="text-xs text-slate-300 mt-1">
              Determines how complete your case context is before legal filing or advocate engagement.
            </p>
          </div>
          <button
            onClick={() => setIsReadinessModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOTAL GAUGE */}
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-600">Current Case Score</span>
            <div className="text-2xl font-black text-indigo-950">{score}% Complete</div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              score >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              score >= 50 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
              'bg-slate-100 text-slate-700'
            }`}>
              {score >= 80 ? 'High Readiness — Ready for Counsel' : score >= 50 ? 'Moderate Readiness' : 'Initial Phase'}
            </span>
          </div>
        </div>

        {/* ITEMS LIST */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {items.map((item, idx) => {
            const isFull = item.score >= item.weight;
            return (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className={`w-4 h-4 ${isFull ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-900">
                    {item.score} / {item.weight}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 ml-6">{item.desc}</p>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden ml-6 max-w-[calc(100%-1.5rem)]">
                  <div
                    className="h-full bg-indigo-900 rounded-full transition-smooth"
                    style={{ width: `${(item.score / item.weight) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => setIsReadinessModalOpen(false)}
            className="px-5 py-2 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 transition-smooth"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};
