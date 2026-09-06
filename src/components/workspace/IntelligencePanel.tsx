import React, { useState } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { CheckCircle2, AlertCircle, Edit3, ArrowRight, Lightbulb } from 'lucide-react';

export const IntelligencePanel: React.FC = () => {
  const { activeCase, setIsReadinessModalOpen } = useCaseContext();
  const [activeTab, setActiveTab] = useState<'intelligence' | 'documents' | 'matches'>('intelligence');

  if (!activeCase) return null;

  const score = activeCase.readinessScore > 0 ? activeCase.readinessScore : 10;
  
  const stageText = score >= 90 ? 'High Information Completeness'
    : score >= 80 ? 'Counsel-Ready'
    : score >= 65 ? 'Substantial Case Understanding'
    : score >= 45 ? 'Case Context Developing'
    : score >= 25 ? 'Basic Context'
    : 'Initial Intake';

  const matterDisplay = activeCase.title && activeCase.title !== 'New Legal Consultation'
    ? activeCase.title
    : 'Neighbour Dispute / Physical Alteration';

  const practiceAreaDisplay = activeCase.practiceArea && activeCase.practiceArea !== 'Awaiting case details'
    ? activeCase.practiceArea
    : 'Criminal Defense & Property';

  // SVG Gauge Calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <aside className="w-80 xl:w-96 bg-[#FAF8F5] border-l border-[#0B1024]/8 h-full overflow-y-auto p-4 sm:p-5 space-y-5 shrink-0 font-sans">
      
      {/* TOP HEADER TABS */}
      <div className="flex items-center border-b border-[#0B1024]/10 pb-2 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'intelligence'
              ? 'border-b-2 border-[#0B1024] text-[#0B1024] font-extrabold'
              : 'text-slate-400 hover:text-[#0B1024]'
          }`}
        >
          Case Intelligence
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'documents'
              ? 'border-b-2 border-[#0B1024] text-[#0B1024] font-extrabold'
              : 'text-slate-400 hover:text-[#0B1024]'
          }`}
        >
          Documents ({activeCase.documents.length})
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'matches'
              ? 'border-b-2 border-[#0B1024] text-[#0B1024] font-extrabold'
              : 'text-slate-400 hover:text-[#0B1024]'
          }`}
        >
          Advocate Matches ({activeCase.recommendations.length})
        </button>
      </div>

      {/* TAB CONTENT: CASE INTELLIGENCE */}
      {activeTab === 'intelligence' && (
        <div className="space-y-4">
          
          {/* CARD 1: CASE READINESS GAUGE */}
          <div className="bg-white rounded-2xl p-5 border border-[#0B1024]/8 shadow-2xs space-y-3">
            <div className="flex items-center space-x-4">
              
              {/* CIRCULAR GAUGE SVG */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="text-slate-100"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="text-[#D89947] transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-serif font-black text-xl text-[#0B1024]">
                  {score}%
                </div>
              </div>

              {/* READINESS INFO */}
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-[#0B1024] font-serif">Case Readiness</h4>
                <div className="text-xs font-bold text-[#C88A32]">{stageText}</div>
                <p className="text-[11px] text-[#4F586B] leading-tight pt-0.5">
                  We are gathering key details about your legal concern.
                </p>
                <button
                  onClick={() => setIsReadinessModalOpen(true)}
                  className="mt-2 text-xs font-bold text-[#0B1024] border border-[#0B1024]/15 hover:bg-[#FAF8F5] px-3 py-1 rounded-xl transition-colors cursor-pointer inline-flex items-center space-x-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3 text-[#0B1024]" />
                </button>
              </div>

            </div>
          </div>

          {/* CARD 2: CASE INFORMATION (SO FAR) */}
          <div className="bg-white rounded-2xl p-5 border border-[#0B1024]/8 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#0B1024] uppercase tracking-wider font-sans">
                Case Information (So Far)
              </h4>
              <button className="text-[11px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer">
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#0B1024]/5">
                <span className="flex items-center gap-1.5 font-bold text-[#0B1024]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Matter</span>
                </span>
                <span className="text-[#4F586B] font-medium text-right max-w-[170px] truncate">{matterDisplay}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#0B1024]/5">
                <span className="flex items-center gap-1.5 font-bold text-[#0B1024]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Jurisdiction</span>
                </span>
                <span className="text-[#4F586B] font-medium text-right">{activeCase.jurisdiction || 'Not specified'}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#0B1024]/5">
                <span className="flex items-center gap-1.5 font-bold text-[#0B1024]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Practice Area</span>
                </span>
                <span className="text-[#4F586B] font-medium text-right">{practiceAreaDisplay}</span>
              </div>

              <div className="flex items-start justify-between py-1">
                <span className="flex items-center gap-1.5 font-bold text-[#0B1024]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Procedural Stage</span>
                </span>
                <span className="text-[#4F586B] font-medium text-right">{activeCase.proceduralStage || 'Not established'}</span>
              </div>
            </div>
          </div>

          {/* CARD 3: WHAT'S MISSING? */}
          <div className="bg-white rounded-2xl p-5 border border-[#0B1024]/8 shadow-2xs space-y-2.5">
            <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>What's Missing?</span>
            </h4>

            <div className="space-y-1.5 text-xs text-[#0B1024]">
              {(activeCase.missingInformation.length > 0
                ? activeCase.missingInformation
                : [
                    'Incident Description',
                    'Jurisdiction (City & State)',
                    'Parties Involved',
                    'Any Police Complaint (FIR/CSR)',
                    'Relevant Documents'
                  ]
              ).map((infoItem, idx) => (
                <div key={idx} className="flex items-center gap-2 font-medium text-[#4F586B]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D89947] shrink-0" />
                  <span>{infoItem}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 4: HELPFUL TIP BOX */}
          <div className="bg-[#FAF6EE] border border-[#D89947]/30 rounded-2xl p-4 text-xs text-[#0B1024] flex items-start space-x-3 shadow-2xs">
            <Lightbulb className="w-5 h-5 text-[#D89947] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[#0B1024] block">Tip</span>
              <p className="text-[#4F586B] leading-relaxed">
                The more details you provide, the better NYAYAI can analyze your case and find the right advocates.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-3 bg-white p-5 rounded-2xl border border-[#0B1024]/8 shadow-2xs text-xs">
          <h4 className="font-bold text-[#0B1024] font-serif">Uploaded Case Documents</h4>
          {activeCase.documents.length === 0 ? (
            <p className="text-[#4F586B]">No documents uploaded yet. Go to Documents Vault to upload FIRs or legal notices.</p>
          ) : (
            <div className="space-y-2">
              {activeCase.documents.map(doc => (
                <div key={doc.id} className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 font-medium text-[#0B1024]">
                  {doc.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ADVOCATE MATCHES */}
      {activeTab === 'matches' && (
        <div className="space-y-3 bg-white p-5 rounded-2xl border border-[#0B1024]/8 shadow-2xs text-xs">
          <h4 className="font-bold text-[#0B1024] font-serif">Matched Advocates</h4>
          {activeCase.recommendations.length === 0 ? (
            <p className="text-[#4F586B]">Advocate matches will appear here once case readiness exceeds 50%.</p>
          ) : (
            <div className="space-y-2">
              {activeCase.recommendations.map(adv => (
                <div key={adv.id} className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 font-medium text-[#0B1024]">
                  {adv.name} ({adv.matchScore}% Match)
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </aside>
  );
};
