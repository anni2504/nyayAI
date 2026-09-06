import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  Sparkles,
  MessageSquareText,
  CheckCircle2,
  Play,
  Pause,
  ShieldCheck,
  ChevronRight,
  FileCheck
} from 'lucide-react';

const PHASES = [
  {
    id: 'intake',
    stepNumber: '01',
    label: 'Story Intake',
    title: 'Natural Language Conversation Intake'
  },
  {
    id: 'documents',
    stepNumber: '02',
    label: 'Document Evidence',
    title: 'Clause Scanning & Vector Extraction'
  },
  {
    id: 'core',
    stepNumber: '03',
    label: 'Case Core',
    title: 'Case Intelligence Activation'
  },
  {
    id: 'precedents',
    stepNumber: '04',
    label: 'Precedent Retrieval',
    title: 'High Court Precedent Retrieval'
  },
  {
    id: 'advocates',
    stepNumber: '05',
    label: 'Advocate Match',
    title: 'Precedent-Grounded Advocate Match'
  },
  {
    id: 'settled',
    stepNumber: '06',
    label: 'Case Complete',
    title: 'Grounded Case Understanding'
  }
];

export const SpatialHeroVisualization: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % PHASES.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused]);

  const activeInfo = PHASES[currentPhase];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full max-w-xl lg:max-w-2xl mx-auto select-none"
    >
      {/* RADIATING COMPUTATIONAL INTELLIGENCE FIELD GUIDELINES */}
      <div className="absolute -inset-12 pointer-events-none opacity-40">
        <svg className="w-full h-full" viewBox="0 0 600 600">
          <circle cx="300" cy="300" r="240" fill="none" stroke="#5146D8" strokeWidth="0.75" strokeDasharray="3 12" className="animate-spin duration-[60s]" />
          <circle cx="300" cy="300" r="280" fill="none" stroke="#F4B400" strokeWidth="0.5" strokeDasharray="2 16" opacity="0.6" className="animate-spin duration-[90s]" />
          <line x1="0" y1="300" x2="600" y2="300" stroke="#5146D8" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.3" />
          <line x1="300" y1="0" x2="300" y2="600" stroke="#5146D8" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.3" />
        </svg>
      </div>

      {/* Outer Spatial Glow Backdrop */}
      <div className="absolute -top-6 -right-6 w-full h-full bg-gradient-to-br from-[#5146D8]/30 via-[#29215F]/20 to-[#080D1F]/60 rounded-3xl blur-3xl pointer-events-none" />

      {/* MAIN SPATIAL CANVAS CONTAINER (#080D1F -> #121833 -> #060913) */}
      <div className="relative bg-gradient-to-b from-[#080D1F] via-[#121833] to-[#060913] rounded-3xl border border-[#29215F]/60 border-t-[#5146D8]/40 shadow-2xl p-5 sm:p-7 overflow-hidden backdrop-blur-2xl min-h-[510px] flex flex-col justify-between">
        
        {/* Subtle Spatial Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.1] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#F4B400 1px, transparent 1px), radial-gradient(#5146D8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px'
          }}
        />

        {/* TOP STATUS HEADER */}
        <div className="relative z-10 flex items-center justify-between border-b border-[#29215F]/50 pb-3.5 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#080D1F] to-[#29215F] text-[#F4B400] flex items-center justify-center font-black text-xs shadow-md border border-[#5146D8]/30">
              <Scale className="w-4 h-4 text-[#F4B400]" />
            </div>
            <div>
              <div className="text-xs font-black text-white tracking-tight flex items-center gap-1.5">
                <span>NYAYAI Spatial Intelligence Engine</span>
                <Sparkles className="w-3 h-3 text-[#F4B400] animate-pulse" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Evidence-Grounded Legal Graph
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg bg-[#080D1F]/90 border border-[#29215F] text-slate-400 hover:text-white transition-smooth text-[10px] flex items-center gap-1 font-mono"
            >
              {isPaused ? <Play className="w-3 h-3 text-[#F4B400]" /> : <Pause className="w-3 h-3 text-slate-400" />}
              <span className="hidden sm:inline">{isPaused ? 'PAUSED' : 'AUTO'}</span>
            </button>

            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ACTIVE
            </span>
          </div>
        </div>

        {/* PHASE TIMELINE PROGRESS TABS */}
        <div className="relative z-10 grid grid-cols-6 gap-1 bg-[#080D1F]/90 p-1.5 rounded-xl border border-[#29215F]/50 shrink-0 my-3">
          {PHASES.map((phase, idx) => {
            const isActive = idx === currentPhase;
            const isPassed = idx < currentPhase;

            return (
              <button
                key={phase.id}
                onClick={() => setCurrentPhase(idx)}
                className={`py-1.5 px-1 rounded-lg text-center transition-all duration-300 flex flex-col items-center justify-between relative ${
                  isActive
                    ? 'bg-gradient-to-br from-[#29215F] to-[#080D1F] text-[#F4B400] border border-[#F4B400]/40 shadow-md scale-[1.03]'
                    : isPassed
                    ? 'text-slate-300 hover:bg-slate-900/40'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <span className="text-[9px] font-mono font-bold block mb-0.5">
                  {phase.stepNumber}
                </span>
                <span className="text-[9px] font-bold tracking-tight truncate w-full hidden sm:block">
                  {phase.label}
                </span>

                <div
                  className={`h-0.5 w-full rounded-full transition-all duration-300 mt-1 ${
                    isActive ? 'bg-[#F4B400]' : isPassed ? 'bg-[#5146D8]/60' : 'bg-slate-800'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* 2.5D SPATIAL CANVAS ENGINE (#080D1F -> #121833) */}
        <div className="relative flex-1 bg-gradient-to-b from-[#080D1F] to-[#121833] rounded-2xl border border-[#29215F]/60 border-t-[#5146D8]/30 p-4 sm:p-5 overflow-hidden shadow-inner min-h-[310px] flex flex-col justify-center select-none">
          
          {/* RADIAL INDIGO CORE ATMOSPHERE BEHIND NYAYAI CORE */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 bg-gradient-to-r from-[#29215F]/90 via-[#5146D8]/50 to-[#F4B400]/20 rounded-full blur-2xl pointer-events-none opacity-80" />

          {/* BACKGROUND DEPTH SVG GRAPH LINES WITH GRADIENTS */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 300">
            <defs>
              <linearGradient id="infoFlowGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5146D8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="advocateGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5146D8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#F4B400" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Connecting lines from central core to spatial nodes */}
            <line x1="250" y1="150" x2="110" y2="70" stroke="url(#infoFlowGlow)" strokeWidth={currentPhase === 0 ? "2.5" : "1.5"} strokeDasharray="4 3" opacity={currentPhase === 0 ? "0.95" : "0.35"} />
            <line x1="250" y1="150" x2="390" y2="70" stroke="url(#infoFlowGlow)" strokeWidth={currentPhase === 1 ? "2.5" : "1.5"} strokeDasharray="4 3" opacity={currentPhase === 1 ? "0.95" : "0.35"} />
            <line x1="250" y1="150" x2="80" y2="210" stroke="url(#infoFlowGlow)" strokeWidth={currentPhase === 2 ? "2.5" : "1.5"} strokeDasharray="4 3" opacity={currentPhase === 2 ? "0.95" : "0.35"} />
            <line x1="250" y1="150" x2="420" y2="210" stroke="url(#infoFlowGlow)" strokeWidth={currentPhase === 3 ? "2.5" : "1.5"} strokeDasharray="4 3" opacity={currentPhase === 3 ? "0.95" : "0.35"} />
            <line x1="250" y1="150" x2="250" y2="250" stroke="url(#advocateGlow)" strokeWidth={currentPhase >= 4 ? "2.5" : "1.5"} strokeDasharray="4 3" opacity={currentPhase >= 4 ? "0.95" : "0.35"} />
          </svg>

          {/* CENTRAL SPATIAL CASE INTELLIGENCE ANCHOR NODE */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
            <motion.div
              animate={{
                scale: currentPhase === 2 || currentPhase === 5 ? [1, 1.08, 1] : 1,
                borderColor: currentPhase >= 4 ? '#F4B400' : '#5146D8'
              }}
              transition={{ duration: 0.6 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#080D1F] via-[#29215F] to-[#0D132D] border-2 border-[#F4B400]/80 shadow-2xl flex flex-col items-center justify-center p-2 text-center backdrop-blur-xl relative"
            >
              {/* Outer Pulse Ring */}
              <div className="absolute -inset-2 rounded-full border border-amber-400/30 animate-ping opacity-25" />
              
              <Scale className="w-5 h-5 text-amber-400 mb-0.5" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                NYAYAI
              </span>
              <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider mt-0.5">
                CASE CORE
              </span>
            </motion.div>
          </div>

          {/* DYNAMIC STORY ANIMATION CAROUSEL */}
          <AnimatePresence mode="wait">
            
            {/* PHASE 0: CONVERSATION STORY INTAKE */}
            {currentPhase === 0 && (
              <motion.div
                key="phase-0"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="relative z-30 space-y-3 max-w-sm mx-auto"
              >
                <div className="p-3.5 bg-gradient-to-br from-[#0D132D]/95 to-[#080D1F]/95 rounded-2xl border border-[#5146D8]/40 border-t-sky-400/50 text-sky-100 text-xs space-y-2 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between text-[10px] text-sky-400 font-mono font-bold">
                    <span className="flex items-center gap-1.5">
                      <MessageSquareText className="w-3.5 h-3.5 text-sky-400" />
                      CLIENT INTAKE STATEMENT
                    </span>
                    <span>Bengaluru</span>
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-slate-200 italic">
                    “I had a severe dispute with my landlord in Bengaluru over illegal eviction & security deposit retention...”
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-sky-950 to-[#080D1F] text-sky-300 border border-sky-500/40">
                    Jurisdiction: Bengaluru
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#29215F] to-[#080D1F] text-indigo-200 border border-[#5146D8]/50">
                    Matter: Property Dispute
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#3B2200] to-[#080D1F] text-[#F4B400] border border-[#F4B400]/40">
                    Issue: Unlawful Eviction
                  </span>
                </div>
              </motion.div>
            )}

            {/* PHASE 1: DOCUMENT EVIDENCE SCANNING */}
            {currentPhase === 1 && (
              <motion.div
                key="phase-1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="relative z-30 space-y-3 max-w-md mx-auto"
              >
                <div className="p-3.5 bg-gradient-to-br from-[#0D132D]/95 to-[#080D1F]/95 rounded-2xl border border-[#F4B400]/40 border-t-amber-400/60 text-xs space-y-2 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                  {/* Laser Scan Beam */}
                  <motion.div
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#F4B400] to-transparent z-10 opacity-75"
                  />

                  <div className="flex items-center justify-between text-xs font-bold text-white border-b border-[#29215F] pb-2">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-[#F4B400]" />
                      LEASE_AGREEMENT_2024.pdf
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      ANALYZING
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span>Termination Notice Clause:</span>
                      <span className="text-rose-400 font-bold">Violation (7 days vs 30 days)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deposit Refund Term:</span>
                      <span className="text-[#F4B400] font-bold">Unlawful Penalty Retention</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-emerald-400 font-mono text-center font-bold">
                  +25% Case Readiness Vector Generated
                </div>
              </motion.div>
            )}

            {/* PHASE 2: CASE INTELLIGENCE ACTIVATION */}
            {currentPhase === 2 && (
              <motion.div
                key="phase-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative z-30 w-full h-full flex items-center justify-center"
              >
                <div className="grid grid-cols-2 gap-3 w-full max-w-md text-xs">
                  <div className="p-2.5 bg-gradient-to-br from-[#0D132D] to-[#080D1F] rounded-xl border border-[#5146D8]/40 border-t-[#5146D8]/60">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Legal Issue</span>
                    <span className="font-extrabold text-indigo-300">Unlawful Eviction</span>
                  </div>
                  <div className="p-2.5 bg-gradient-to-br from-[#0D132D] to-[#080D1F] rounded-xl border border-[#5146D8]/40 border-t-[#5146D8]/60">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Jurisdiction</span>
                    <span className="font-extrabold text-indigo-300">Bengaluru Civil Court</span>
                  </div>
                  <div className="p-2.5 bg-gradient-to-br from-[#0D132D] to-[#080D1F] rounded-xl border border-[#5146D8]/40 border-t-[#5146D8]/60">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Parties</span>
                    <span className="font-extrabold text-indigo-300">Tenant v. Owner</span>
                  </div>
                  <div className="p-2.5 bg-gradient-to-br from-[#0D132D] to-[#080D1F] rounded-xl border border-[#5146D8]/40 border-t-[#5146D8]/60">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Procedural Stage</span>
                    <span className="font-extrabold text-indigo-300">Pre-Litigation Notice</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PHASE 3: HIGH COURT PRECEDENT RETRIEVAL */}
            {currentPhase === 3 && (
              <motion.div
                key="phase-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="relative z-30 space-y-2.5 max-w-md mx-auto"
              >
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center mb-1">
                  Retrieved High Court Judgments
                </div>

                <div className="p-3 bg-gradient-to-r from-[#0D132D] via-[#1A123D] to-[#080D1F] rounded-xl border border-purple-500/40 border-t-purple-400/50 flex items-center justify-between text-xs shadow-xl">
                  <div>
                    <div className="font-bold text-slate-100 text-[11px]">Ramesh Kumar v. State of Kar (2024)</div>
                    <div className="text-[10px] text-slate-400">Karnataka High Court • Landlord Notice Quashing</div>
                  </div>
                  <span className="text-[10px] font-mono font-extrabold text-purple-300 bg-purple-950 px-2 py-1 rounded border border-purple-500/40">
                    94% Match
                  </span>
                </div>

                <div className="p-3 bg-gradient-to-r from-[#0D132D] via-[#1A123D] to-[#080D1F] rounded-xl border border-purple-500/30 border-t-purple-400/30 flex items-center justify-between text-xs opacity-90">
                  <div>
                    <div className="font-bold text-slate-200 text-[11px]">Siddappa v. Union of India (2023)</div>
                    <div className="text-[10px] text-slate-400">Bengaluru Civil Court • Injunction Precedent</div>
                  </div>
                  <span className="text-[10px] font-mono font-extrabold text-purple-300 bg-purple-950 px-2 py-1 rounded border border-purple-500/40">
                    91% Match
                  </span>
                </div>
              </motion.div>
            )}

            {/* PHASE 4: PRECEDENT-GROUNDED ADVOCATE MATCH */}
            {currentPhase === 4 && (
              <motion.div
                key="phase-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="relative z-30 max-w-md mx-auto space-y-2.5"
              >
                <div className="p-3.5 bg-gradient-to-br from-[#0D132D]/95 via-[#080D1F]/95 to-[#1C1600]/90 rounded-2xl border-2 border-emerald-500/50 border-t-[#F4B400]/70 space-y-2 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80"
                        alt="Adv. Rajesh Varma"
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/50"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          <span>Adv. Rajesh Varma</span>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Senior Property & High Court Advocate
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-mono font-black text-[#F4B400]">87% Match</div>
                      <div className="text-[9px] font-bold text-emerald-400">12 Similar Cases</div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-300 bg-[#080D1F]/90 p-2 rounded-lg border border-[#29215F] text-left">
                    Handled 42 verified Karnataka High Court petitions under CrPC 482 & Property Injunctions
                  </p>
                </div>
              </motion.div>
            )}

            {/* PHASE 5: SETTLED STATE */}
            {currentPhase === 5 && (
              <motion.div
                key="phase-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative z-30 space-y-3 text-center max-w-sm mx-auto"
              >
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-950 via-[#080D1F] to-emerald-950 text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-500/50 shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CASE UNDERSTOOD & MATCHED</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="p-2 bg-gradient-to-b from-[#0D132D] to-[#080D1F] rounded-lg border border-slate-800 border-t-[#5146D8]/40 text-slate-200">
                    CASE FACTS<br /><span className="text-emerald-400 font-bold">PARSED</span>
                  </div>
                  <div className="p-2 bg-gradient-to-b from-[#0D132D] to-[#080D1F] rounded-lg border border-slate-800 border-t-[#5146D8]/40 text-slate-200">
                    PRECEDENTS<br /><span className="text-emerald-400 font-bold">RETRIEVED</span>
                  </div>
                  <div className="p-2 bg-gradient-to-b from-[#0D132D] to-[#080D1F] rounded-lg border border-slate-800 border-t-[#F4B400]/40 text-slate-200">
                    ADVOCATE<br /><span className="text-[#F4B400] font-bold">MATCHED</span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* BOTTOM FOOTER NAVIGATION */}
        <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center space-x-1.5">
            <span className="font-mono text-amber-400 font-bold">{activeInfo.stepNumber}.</span>
            <span className="text-slate-200 font-medium">{activeInfo.title}</span>
          </div>

          <button
            onClick={() => setCurrentPhase((prev) => (prev + 1) % PHASES.length)}
            className="text-slate-300 hover:text-amber-400 font-bold transition-smooth flex items-center gap-1 font-mono"
          >
            <span>NEXT PHASE</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

      </div>
    </div>
  );
};
