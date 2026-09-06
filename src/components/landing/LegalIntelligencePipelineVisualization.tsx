import React, { useState, useEffect } from 'react';
import {
  MessageSquareText,
  FileCheck,
  Scale,
  BookOpenCheck,
  UserCheck,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

const PIPELINE_STAGES = [
  {
    id: 'intake',
    stepNumber: '01',
    name: 'Case Story',
    subtitle: 'Natural language input statement'
  },
  {
    id: 'facts',
    stepNumber: '02',
    name: 'Case Understanding',
    subtitle: 'Structured legal parameter mapping'
  },
  {
    id: 'documents',
    stepNumber: '03',
    name: 'Document Evidence',
    subtitle: 'Clause verification & entity extraction'
  },
  {
    id: 'precedents',
    stepNumber: '04',
    name: 'Historical Cases',
    subtitle: 'High Court precedent retrieval'
  },
  {
    id: 'advocates',
    stepNumber: '05',
    name: 'Advocate Match',
    subtitle: 'Precedent-grounded match result'
  }
];

export const LegalIntelligencePipelineVisualization: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full max-w-lg lg:max-w-xl mx-auto"
    >
      {/* RESTRAINED CONTAINER (#0B0F1A) */}
      <div className="relative bg-[#0B0F1A] rounded-2xl border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 overflow-hidden backdrop-blur-xl min-h-[460px] flex flex-col justify-between">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs border border-slate-800">
              <Scale className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>NYAYAI Intelligence Engine</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Evidence-Grounded Legal Pipeline
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              STAGE {activeStep + 1} OF 5
            </span>
          </div>
        </div>

        {/* TIMELINE INDICATOR BAR */}
        <div className="grid grid-cols-5 gap-1.5 bg-[#080B14] p-1.5 rounded-xl border border-slate-800/60">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isActive = idx === activeStep;
            const isPassed = idx < activeStep;

            return (
              <button
                key={stage.id}
                onClick={() => setActiveStep(idx)}
                className={`py-2 px-1 rounded-lg text-center transition-all duration-300 flex flex-col items-center justify-between relative ${
                  isActive
                    ? 'bg-slate-900 text-amber-400 border border-amber-400/30 shadow-sm'
                    : isPassed
                    ? 'text-slate-300 hover:bg-slate-900/40'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <span className="text-[9px] font-mono font-bold block mb-1">
                  {stage.stepNumber}
                </span>
                <span className="text-[9px] font-bold tracking-tight truncate w-full hidden sm:block">
                  {stage.name}
                </span>
                
                {/* Thin active bar */}
                <div
                  className={`h-0.5 w-full rounded-full transition-all duration-300 mt-1 ${
                    isActive ? 'bg-amber-400' : isPassed ? 'bg-indigo-500/50' : 'bg-slate-800'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* STAGE DISPLAY AREA */}
        <div className="relative flex-1 bg-[#070A12] rounded-xl border border-slate-800/80 p-5 overflow-hidden flex flex-col justify-center transition-all duration-500">
          
          {/* STEP 1: USER'S STORY */}
          {activeStep === 0 && (
            <div className="space-y-3.5 animate-in fade-in duration-500">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <MessageSquareText className="w-3.5 h-3.5 text-sky-400" />
                <span>Input Narrative Statement</span>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-200 text-xs leading-relaxed space-y-2">
                <p className="italic font-medium">
                  “I am experiencing a major dispute with my landlord regarding arbitrary rent escalation and illegal eviction notice in Bengaluru...”
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Parsing intent & legal domain...
                </span>
                <span className="font-mono text-amber-400">Jurisdiction: Bengaluru</span>
              </div>
            </div>
          )}

          {/* STEP 2: CASE UNDERSTANDING */}
          {activeStep === 1 && (
            <div className="space-y-3 animate-in fade-in duration-500">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                <span>Extracted Case Parameters</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">Legal Issue</span>
                  <span className="font-bold text-slate-100">Unlawful Eviction & Rent Dispute</span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">Jurisdiction</span>
                  <span className="font-bold text-slate-100">Bengaluru City Civil Court</span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">Parties</span>
                  <span className="font-bold text-slate-100">Tenant v. Property Owner</span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">Procedural Stage</span>
                  <span className="font-bold text-slate-100">Pre-Litigation Notice</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DOCUMENT EVIDENCE */}
          {activeStep === 2 && (
            <div className="space-y-3 animate-in fade-in duration-500">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Document Analysis & Verification</span>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-100 border-b border-slate-800 pb-2">
                  <span>Lease_Agreement_2024.pdf</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ANALYZED
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Termination Notice Period</span>
                    <span className="text-rose-400 font-semibold">Violation (7 days vs 30 required)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Security Deposit Refund</span>
                    <span className="text-amber-400 font-semibold">Clause 12 Contradiction</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: HISTORICAL CASES */}
          {activeStep === 3 && (
            <div className="space-y-2.5 animate-in fade-in duration-500">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <BookOpenCheck className="w-3.5 h-3.5 text-purple-400" />
                  Retrieved Court Precedents
                </span>
                <span>3 Relevant Judgments</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-100 text-[11px]">Ramesh Kumar v. State of Kar (2024)</div>
                    <div className="text-[10px] text-slate-400">Karnataka High Court • Landlord Notice Quashing</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                    94% Match
                  </span>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between opacity-85">
                  <div>
                    <div className="font-bold text-slate-200 text-[11px]">Siddappa v. Union of India (2023)</div>
                    <div className="text-[10px] text-slate-400">Bengaluru Civil Court • Injunction Precedent</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                    91% Match
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: ADVOCATE MATCH */}
          {activeStep === 4 && (
            <div className="space-y-3 animate-in fade-in duration-500">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Precedent-Grounded Advocate Match
                </span>
                <span className="text-emerald-400 font-bold">12 Matching Cases</span>
              </div>

              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80"
                      alt="Adv. Rajesh Varma"
                      className="w-9 h-9 rounded-lg object-cover ring-2 ring-emerald-500/30"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <span>Adv. Rajesh Varma</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Senior High Court Property Advocate
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-extrabold text-amber-400">87% Match</div>
                    <div className="text-[9px] text-slate-400">Bengaluru</div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 leading-normal">
                  Handled 42 verified Karnataka High Court petitions under CrPC 482 & Property Injunctions
                </p>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM FOOTER STEPER & INDICATOR */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-slate-300">{PIPELINE_STAGES[activeStep].subtitle}</span>
          </div>

          <button
            onClick={() => setActiveStep((prev) => (prev + 1) % PIPELINE_STAGES.length)}
            className="text-slate-300 hover:text-amber-400 font-bold transition-smooth flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
