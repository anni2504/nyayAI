import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { SpatialHeroVisualization } from './SpatialHeroVisualization';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Scale,
  Sparkles
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { openAuthModal, isAuthenticated, user } = useAuth();
  const { scrollYProgress } = useScroll();

  // SCROLL PARALLAX TRANSLATION TRANSFORMATIONS
  const ambientGlowY = useTransform(scrollYProgress, [0, 0.5], ['0%', '18%']);
  const arcRotate1 = useTransform(scrollYProgress, [0, 1], [0, 35]);
  const arcRotate2 = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const gridY = useTransform(scrollYProgress, [0, 1], ['0%', '8%']);

  const handleClientCTA = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && user?.role === 'CLIENT') {
      window.location.hash = '#/client';
    } else {
      openAuthModal('CLIENT', 'signin');
    }
  };

  const handleAdvocateCTA = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && user?.role === 'ADVOCATE') {
      window.location.hash = '#/advocate';
    } else {
      openAuthModal('ADVOCATE', 'signin');
    }
  };


  return (
    <div className="min-h-screen bg-[#F8F5EE] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 font-sans overflow-x-hidden relative">

      {/* ========================================================================= */}
      {/* MULTI-LAYERED ENVIRONMENTAL BACKDROP (WARM IVORY + INDIGO/GOLD HAZE + ARCS) */}
      {/* ========================================================================= */}

      {/* LAYER 1: PAPER / EDITORIAL PARCHMENT GRAIN TEXTURE OVERLAY */}
      <div
        className="fixed inset-0 opacity-[0.035] pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(#1E1B4B 1px, transparent 1px), radial-gradient(#D97706 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px'
        }}
      />

      {/* LAYER 2: 4 OVERSIZED BLURRED AMBIENT GRADIENT FORMS */}
      <motion.div
        style={{ y: ambientGlowY }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[900px] pointer-events-none -z-10 overflow-hidden"
      >
        {/* Form 1: Large indigo radial glow behind intelligence visualization */}
        <div className="absolute top-12 right-0 w-[620px] h-[620px] bg-gradient-to-br from-[#29215F]/35 via-[#5146D8]/20 to-transparent rounded-full blur-[140px]" />

        {/* Form 2: Subtle warm gold/amber glow behind headline */}
        <div className="absolute top-16 left-0 w-[550px] h-[550px] bg-gradient-to-br from-[#F4B400]/25 via-[#E58A00]/15 to-transparent rounded-full blur-[120px]" />

        {/* Form 3: Large lavender-indigo arc extending beyond right edge */}
        <div className="absolute top-72 -right-36 w-[680px] h-[680px] bg-gradient-to-bl from-indigo-300/30 via-purple-300/15 to-transparent rounded-full blur-[150px]" />

        {/* Form 4: Subtle electric blue glow near lower hero */}
        <div className="absolute top-[480px] left-1/3 w-[480px] h-[480px] bg-gradient-to-tr from-[#38BDF8]/20 via-[#5146D8]/10 to-transparent rounded-full blur-[110px]" />
      </motion.div>

      {/* LAYER 3: OVERSIZED ABSTRACT SPATIAL ARCS & RINGS */}
      <motion.div
        style={{ rotate: arcRotate1 }}
        className="absolute top-16 -left-32 w-[650px] h-[650px] rounded-full border border-[#29215F]/15 border-dashed pointer-events-none -z-10"
      />
      <motion.div
        style={{ rotate: arcRotate2 }}
        className="absolute top-44 -right-40 w-[750px] h-[750px] rounded-full border border-[#F4B400]/15 border-dashed pointer-events-none -z-10"
      />

      {/* LAYER 4: ULTRA-SUBTLE TECHNICAL GRID AROUND HERO */}
      <motion.div
        style={{ y: gridY }}
        className="absolute top-28 right-12 w-[520px] h-[520px] border border-slate-300/40 rounded-3xl pointer-events-none -z-10 hidden lg:block opacity-40"
      >
        <div className="absolute inset-0 border border-indigo-500/10 rounded-3xl m-8" />
        <div className="absolute inset-0 border border-amber-500/10 rounded-3xl m-16" />
      </motion.div>


      {/* ========================================================================= */}
      {/* HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-36 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center">

            {/* HERO LEFT COLUMN — DRAMATIC EDITORIAL TYPOGRAPHY */}
            <div className="lg:col-span-6 space-y-8 animate-in fade-in duration-700">

              {/* REFINED EYEBROW */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#080D1F] via-[#29215F] to-[#080D1F] text-[#F4B400] text-[11px] font-mono tracking-widest uppercase border border-[#5146D8]/40 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-[#F4B400]" />
                <span>NYAYAI · LEGAL INTELLIGENCE ENGINE</span>
              </div>

              {/* HUGE DRAMATIC HEADLINE WITH SOPHISTICATED GRADIENTS */}
              <div className="space-y-1">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#080D1F] tracking-tight leading-[0.98]">
                  LEGAL <br />
                  <span className="text-[#080D1F]">INTELLIGENCE,</span>
                </h1>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.02]">
                  <span className="bg-gradient-to-r from-[#29215F] via-[#5146D8] to-[#6366F1] bg-clip-text text-transparent">BUILT AROUND</span> <br />
                  <span className="bg-gradient-to-r from-[#5146D8] via-[#E58A00] to-[#F4B400] bg-clip-text text-transparent">YOUR CASE.</span>
                </h2>
              </div>

              {/* SUPPORTING COPY */}
              <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed max-w-xl">
                “Understand your situation. Structure your evidence. Find advocates through relevant court experience.”
              </p>

              {/* ACTION CTAS */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                <button
                  onClick={handleClientCTA}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-[#29215F] via-[#382B8C] to-[#5146D8] hover:from-[#322975] hover:to-[#6154E8] text-white font-extrabold px-8 py-4.5 rounded-2xl shadow-xl shadow-indigo-950/20 hover:shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-sm group"
                >
                  <span>Explore NYAYAI</span>
                  <ArrowRight className="w-4 h-4 text-[#F4B400] group-hover:translate-x-1 transition-transform duration-200" />
                </button>

                <button
                  onClick={handleAdvocateCTA}
                  className="flex items-center justify-center space-x-2 bg-white/90 hover:bg-white text-slate-900 font-bold px-7 py-4.5 rounded-2xl transition-all duration-300 text-sm border border-indigo-200/90 shadow-xs hover:border-indigo-400 hover:scale-[1.02]"
                >
                  <span>I'm an Advocate</span>
                </button>
              </div>

              {/* SUBTLE ANIMATED TRUST STRIP */}
              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Evidence-grounded
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Case-aware
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Precedent-backed matching
                </span>
              </div>

            </div>

            {/* HERO RIGHT COLUMN — SPATIAL 2.5D ENGINE CANVAS */}
            <div className="lg:col-span-6">
              <SpatialHeroVisualization />
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2 — TRANSFORMATION MATRIX (IVORY + LAVENDER HAZE TRANSITION) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-[#F8F5EE] via-[#F2EEFA] to-[#EBE7F5] border-y border-indigo-100/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#29215F] font-black block">
              TRANSFORMATION PIPELINE
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#080D1F] tracking-tight">
              “From a story to a structured case.”
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl mx-auto">
              Every dispute starts as a personal narrative. NYAYAI structures facts, validates document evidence, and matches precedent experience.
            </p>
          </div>

          {/* SPATIAL STEP PIPELINE MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

            <div className="p-6 bg-gradient-to-br from-white via-[#F8F5EE] to-[#F2EEFA] rounded-2xl border border-indigo-100/90 border-t-indigo-300/40 space-y-3 hover:border-indigo-400 transition-all duration-300 group shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#080D1F] to-[#29215F] text-[#F4B400] flex items-center justify-center font-mono text-xs font-black shadow-xs">
                01
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#29215F] transition-colors">User's Words</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Natural statement intake without complex legal jargon.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-white via-[#F8F5EE] to-[#F2EEFA] rounded-2xl border border-indigo-100/90 border-t-indigo-300/40 space-y-3 hover:border-indigo-400 transition-all duration-300 group shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#29215F] to-[#5146D8] text-indigo-100 flex items-center justify-center font-mono text-xs font-black shadow-xs">
                02
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#29215F] transition-colors">Case Facts</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Extraction of jurisdiction, incident timeline, and dispute parameters.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-white via-[#F8F5EE] to-[#F2EEFA] rounded-2xl border border-indigo-100/90 border-t-amber-400/40 space-y-3 hover:border-indigo-400 transition-all duration-300 group shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F4B400] to-[#E58A00] text-slate-950 flex items-center justify-center font-mono text-xs font-black shadow-xs">
                03
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#29215F] transition-colors">Documents</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Automated PDF clause verification & risk scoring.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-white via-[#F8F5EE] to-[#F2EEFA] rounded-2xl border border-indigo-100/90 border-t-purple-400/40 space-y-3 hover:border-indigo-400 transition-all duration-300 group shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-200 flex items-center justify-center font-mono text-xs font-black shadow-xs">
                04
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#29215F] transition-colors">Legal Issues</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Mapping to Indian statutory codes (BNS, CrPC, RERA).
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-white via-[#F8F5EE] to-[#F2EEFA] rounded-2xl border border-indigo-100/90 border-t-sky-400/40 space-y-3 hover:border-indigo-400 transition-all duration-300 group shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-sky-950 text-sky-200 flex items-center justify-center font-mono text-xs font-black shadow-xs">
                05
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#29215F] transition-colors">Relevant Precedent</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Retrieval of matching High Court & Trial Court judgments.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-[#080D1F] via-[#29215F] to-[#0D132D] text-white rounded-2xl border border-[#29215F] border-t-[#F4B400]/50 space-y-3 shadow-2xl">
              <div className="w-9 h-9 rounded-xl bg-[#F4B400] text-slate-950 flex items-center justify-center font-mono text-xs font-black shadow-xs">
                06
              </div>
              <h3 className="text-sm font-extrabold text-[#F4B400]">Advocate Match</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Precedent-grounded advocate recommendation.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3 — DIFFERENTIATOR (IVORY + DEEP INDIGO TRANSITION) */}
      {/* ========================================================================= */}
      <section id="product" className="py-28 bg-gradient-to-b from-[#EBE7F5] via-[#E6E8F7] to-[#DFE3F3] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* DIFFERENTIATOR COPY */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#29215F] font-black block">
                THE DIFFERENTIATOR
              </span>

              <h2 className="text-3xl sm:text-5xl font-black text-[#080D1F] tracking-tight leading-[1.05]">
                “Not a directory. <br />
                <span className="bg-gradient-to-r from-[#29215F] to-[#5146D8] bg-clip-text text-transparent">A match grounded in experience.”</span>
              </h2>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                Generic directories list advocates using star ratings and sponsored ads. NYAYAI matches advocates based on verified High Court precedent experience and identical legal issue history.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start space-x-3 text-xs text-slate-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Grounding in High Court & District Court precedent judgments</span>
                </div>
                <div className="flex items-start space-x-3 text-xs text-slate-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Transparent breakdown of why an advocate was matched</span>
                </div>
                <div className="flex items-start space-x-3 text-xs text-slate-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Jurisdiction, court level, and procedural stage alignment</span>
                </div>
              </div>
            </div>

            {/* PRECEDENT MATCH VISUAL SHOWCASE */}
            <div className="lg:col-span-7">
              <div className="bg-gradient-to-br from-white via-[#F8F5EE] to-[#E6E8F7] p-6 sm:p-8 rounded-3xl border border-indigo-200/90 border-t-[#5146D8]/40 shadow-xl space-y-6">

                <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80"
                      alt="Adv. Rajesh Varma"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#29215F]/20 shadow-xs"
                    />
                    <div>
                      <h3 className="text-sm font-extrabold text-[#080D1F] flex items-center gap-1.5">
                        <span>Adv. Rajesh Varma</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">
                        Senior Criminal Defense & High Court Appellate Advocate
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-mono font-black text-[#E58A00]">87% Match</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Precedent Score</span>
                  </div>
                </div>

                {/* MATCH REASONING & VERIFIED CASES */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#080D1F]">Verified Precedent Experience Match:</div>

                  <div className="p-4 bg-gradient-to-r from-[#F8F5EE] to-[#EBE7F5] rounded-2xl border border-indigo-200/80 text-xs text-slate-800 space-y-2.5">
                    <div className="flex items-start space-x-2">
                      <span className="text-[#E58A00] font-bold">•</span>
                      <span>Handled 42 verified Karnataka High Court petitions under CrPC Section 482 & Boundary Disputes</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-[#E58A00] font-bold">•</span>
                      <span>Extensive criminal defense & quashing experience in Bengaluru Courts</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-600 font-medium border-t border-slate-200/80">
                  <span className="font-mono">Jurisdiction: Karnataka High Court</span>
                  <span className="font-bold text-[#29215F]">14 Years High Court Experience</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4 — SPLIT-SCREEN DUAL PORTALS (IVORY + GOLD/INDIGO HAZE TRANSITION) */}
      {/* ========================================================================= */}
      <section className="py-28 bg-gradient-to-b from-[#DFE3F3] via-[#FAF5E8] to-[#F7EED8] border-t border-amber-200/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#29215F] font-black block">
              DUAL WORKSPACE ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#080D1F] tracking-tight">
              Purpose-built environments for clients and advocates.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* FOR CLIENTS */}
            <div className="p-8 sm:p-12 bg-gradient-to-br from-white via-[#F8F5EE] to-[#FAF3E0] rounded-3xl border border-amber-200/90 border-t-amber-400/40 space-y-6 flex flex-col justify-between hover:border-amber-400 transition-all duration-300 shadow-md">
              <div className="space-y-5">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-indigo-50 text-[#29215F] text-xs font-bold border border-indigo-100">
                  <span>FOR CLIENTS</span>
                </div>

                <h3 className="text-3xl font-black text-[#080D1F] tracking-tight">
                  “Turn your story into a structured case.”
                </h3>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  Organize your legal situation, securely upload document evidence, and discover advocates based on verified court precedents.
                </p>

                <div className="space-y-2.5 pt-2 text-xs text-slate-800 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Interactive Case Intake Copilot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Document Vault & automatic clause analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Precedent-backed advocate discovery & booking</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClientCTA}
                className="w-full bg-gradient-to-r from-[#29215F] via-[#382B8C] to-[#5146D8] hover:from-[#322975] hover:to-[#6154E8] text-white font-extrabold text-xs py-4 rounded-xl shadow-lg shadow-indigo-950/20 transition-all duration-300 flex items-center justify-center space-x-2.5 mt-6 group"
              >
                <span>Enter Client Portal</span>
                <ArrowRight className="w-4 h-4 text-[#F4B400] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* FOR ADVOCATES */}
            <div className="p-8 sm:p-12 bg-gradient-to-br from-[#080D1F] via-[#121833] to-[#29215F] text-white rounded-3xl border border-[#29215F] border-t-[#F4B400]/40 space-y-6 flex flex-col justify-between shadow-2xl">
              <div className="space-y-5">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-[#F4B400]/10 text-[#F4B400] text-xs font-bold border border-[#F4B400]/20">
                  <span>FOR ADVOCATES</span>
                </div>

                <h3 className="text-3xl font-black text-white tracking-tight">
                  “Turn your experience into discoverable expertise.”
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  Build your verified High Court precedent portfolio, receive pre-screened counsel-ready leads, and access legal AI research tools.
                </p>

                <div className="space-y-2.5 pt-2 text-xs text-slate-300 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F4B400] shrink-0" />
                    <span>Verified High Court precedent portfolio manager</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F4B400] shrink-0" />
                    <span>Pre-screened counsel-ready client requests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F4B400] shrink-0" />
                    <span>Advocate AI research & document analysis tools</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAdvocateCTA}
                className="w-full bg-gradient-to-r from-[#F4B400] to-[#E58A00] hover:from-[#FFBF00] hover:to-[#F59E0B] text-slate-950 font-extrabold text-xs py-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-300 flex items-center justify-center space-x-2.5 mt-6 group"
              >
                <span>Enter Advocate Workspace</span>
                <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5 — RESEARCH & TECHNOLOGY SYSTEM PIPELINE (DEEP NAVY #080D1F -> #121833) */}
      {/* ========================================================================= */}
      <section className="py-24 bg-gradient-to-b from-[#080D1F] via-[#121833] to-[#080D1F] text-white border-t border-[#29215F]/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#F4B400] font-black block">
              RESEARCH ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Underlying Pipeline Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Every step in NYAYAI's pipeline is grounded in verifiable legal data structures.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 text-center text-xs font-mono">
            <div className="p-3 bg-[#080D1F]/90 rounded-xl border border-[#29215F]/60 border-t-[#5146D8]/30 space-y-1">
              <span className="text-[#F4B400] font-bold block text-[10px]">STAGE 1</span>
              <span className="text-slate-200">Conversation</span>
            </div>
            <div className="p-3 bg-[#080D1F]/90 rounded-xl border border-[#29215F]/60 border-t-[#5146D8]/30 space-y-1">
              <span className="text-[#F4B400] font-bold block text-[10px]">STAGE 2</span>
              <span className="text-slate-200">Structured Case</span>
            </div>
            <div className="p-3 bg-[#080D1F]/90 rounded-xl border border-[#29215F]/60 border-t-[#5146D8]/30 space-y-1">
              <span className="text-[#F4B400] font-bold block text-[10px]">STAGE 3</span>
              <span className="text-slate-200">Document Intel</span>
            </div>
            <div className="p-3 bg-[#080D1F]/90 rounded-xl border border-[#29215F]/60 border-t-[#5146D8]/30 space-y-1">
              <span className="text-[#F4B400] font-bold block text-[10px]">STAGE 4</span>
              <span className="text-slate-200">Legal Retrieval</span>
            </div>
            <div className="p-3 bg-[#080D1F]/90 rounded-xl border border-[#29215F]/60 border-t-[#5146D8]/30 space-y-1">
              <span className="text-[#F4B400] font-bold block text-[10px]">STAGE 5</span>
              <span className="text-slate-200">Similar Cases</span>
            </div>
            <div className="p-3 bg-[#080D1F]/90 rounded-xl border border-[#29215F]/60 border-t-[#5146D8]/30 space-y-1">
              <span className="text-[#F4B400] font-bold block text-[10px]">STAGE 6</span>
              <span className="text-slate-200">Precedent Rank</span>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#29215F] to-[#080D1F] rounded-xl border border-[#F4B400]/40 space-y-1 col-span-2 md:col-span-1 shadow-lg">
              <span className="text-[#F4B400] font-bold block text-[10px]">FINAL</span>
              <span className="text-white font-bold">Advocate Match</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6 — DRAMATIC FINAL CTA (DEEP NAVY #080D1F -> INDIGO -> GOLD) */}
      {/* ========================================================================= */}
      <section className="py-28 bg-gradient-to-b from-[#080D1F] via-[#0D132D] to-[#060913] text-white border-t border-[#29215F]/60 relative z-10">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            “Your case deserves more than a search.”
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed font-normal">
            Whether you are resolving a legal dispute or managing client opportunities, NYAYAI delivers precedent-grounded intelligence.
          </p>

          <div className="pt-4">
            <button
              onClick={handleClientCTA}
              className="bg-gradient-to-r from-[#F4B400] via-[#E58A00] to-[#F4B400] hover:from-[#FFBF00] hover:to-[#F59E0B] text-slate-950 font-black text-sm px-10 py-4.5 rounded-2xl shadow-xl shadow-amber-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center space-x-2"
            >
              <span>Enter NYAYAI →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer className="py-12 bg-[#060913] text-slate-500 border-t border-[#29215F]/40 text-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#080D1F] to-[#29215F] text-[#F4B400] flex items-center justify-center font-bold text-xs border border-[#5146D8]/30">
              <Scale className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-200 tracking-tight text-sm">NYAYAI</span>
            <span>• Legal Intelligence Engine</span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            © 2026 NYAYAI. Evidence-grounded legal technology platform.
          </div>
        </div>
      </footer>

    </div>
  );
};
