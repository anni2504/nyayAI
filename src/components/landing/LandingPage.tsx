import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Scale,
  FileText,
  FolderOpen,
  UsersRound,
  Lightbulb,
  CalendarCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { openAuthModal, isAuthenticated, user } = useAuth();

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

  const handleFindAdvocate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && user?.role === 'CLIENT') {
      window.location.hash = '#/client/advocates';
    } else {
      openAuthModal('CLIENT', 'signin');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#0B1024] selection:bg-[#C88A32]/20 selection:text-[#0B1024] font-sans overflow-x-hidden relative">

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (FULL-BLEED PHOTOGRAPHIC SCENE — NO BOX, NO BORDER) */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[580px] lg:min-h-[660px] flex items-center overflow-hidden bg-[#F8F5EE]">

        {/* FULL-BLEED RIGHT-SIDE CINEMATIC LEGAL PHOTOGRAPH (EXTENDS TO VIEWPORT EDGE) */}
        <div className="absolute top-0 right-0 bottom-0 w-full md:w-[60vw] lg:w-[58vw] xl:w-[56vw] h-full pointer-events-none select-none overflow-hidden hidden md:block z-0">
          <img
            src="/assets/supreme-court-hero.png"
            alt="Supreme Court of India with Constitution, law volumes, and scales of justice"
            className="w-full h-full object-cover object-right-top lg:object-center transform scale-100"
          />
          {/* Natural soft gradient merge into warm ivory text area */}
          <div className="absolute inset-y-0 left-0 w-32 sm:w-48 bg-gradient-to-r from-[#F8F5EE] via-[#F8F5EE]/50 to-transparent pointer-events-none" />
        </div>

        {/* HERO CONTENT: EDITORIAL TYPOGRAPHY & CTAs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 py-10 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl lg:max-w-xl space-y-7"
          >

            {/* EYEBROW: GOLD LINE + SLATE UPPERCASE */}
            <div className="flex items-center space-x-3.5">
              <div className="w-[45px] h-[1.5px] bg-[#C88A32] shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] text-[#4F586B] uppercase font-sans">
                A MORE ACCESSIBLE JUSTICE SYSTEM
              </span>
            </div>

            {/* HEADLINE: PLAYFAIR DISPLAY EDITORIAL SERIF */}
            <h1 className="font-serif font-medium text-[#0B1024] tracking-tight leading-[0.98] text-5xl sm:text-6xl lg:text-[68px] xl:text-[74px]">
              Your Legal <br />
              Questions Deserve <br />
              <span className="text-[#C88A32]">Clear Answers.</span>
            </h1>

            {/* DESCRIPTION */}
            <p className="text-[#4F586B] font-normal text-base sm:text-lg leading-[1.6] max-w-[490px]">
              Understand your situation, organise your evidence, find the right advocates, and take confident action with NYAYAI.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-1">
              <button
                onClick={handleClientCTA}
                className="inline-flex items-center justify-center space-x-2.5 bg-[#0B1024] hover:bg-[#182042] text-white font-medium px-6 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm h-[50px] w-full sm:w-[175px] cursor-pointer group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 text-[#C88A32] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={handleFindAdvocate}
                className="inline-flex items-center justify-center space-x-2.5 bg-white/70 hover:bg-white text-[#0B1024] font-medium px-6 py-3.5 rounded-xl border border-[#D7B47A] hover:border-[#C88A32] transition-all duration-200 text-sm h-[50px] cursor-pointer shadow-2xs"
              >
                <UsersRound className="w-4 h-4 text-[#0B1024]" />
                <span>Find an Advocate</span>
              </button>
            </div>

            {/* 4 BENEFIT ICONS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-3 pt-4 border-t border-[#0B1024]/10">

              <div className="flex flex-col items-start space-y-2">
                <div className="w-9 h-9 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/40 flex items-center justify-center text-[#0B1024] shadow-2xs">
                  <FileText className="w-4 h-4 text-[#0B1024]" />
                </div>
                <span className="text-xs font-semibold text-[#0B1024] leading-tight">
                  Understand <br />
                  <span className="text-[#4F586B] font-normal">Your Case</span>
                </span>
              </div>

              <div className="flex flex-col items-start space-y-2">
                <div className="w-9 h-9 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/40 flex items-center justify-center text-[#0B1024] shadow-2xs">
                  <UsersRound className="w-4 h-4 text-[#0B1024]" />
                </div>
                <span className="text-xs font-semibold text-[#0B1024] leading-tight">
                  Find Verified <br />
                  <span className="text-[#4F586B] font-normal">Advocates</span>
                </span>
              </div>

              <div className="flex flex-col items-start space-y-2">
                <div className="w-9 h-9 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/40 flex items-center justify-center text-[#0B1024] shadow-2xs">
                  <FolderOpen className="w-4 h-4 text-[#0B1024]" />
                </div>
                <span className="text-xs font-semibold text-[#0B1024] leading-tight">
                  Manage <br />
                  <span className="text-[#4F586B] font-normal">Your Documents</span>
                </span>
              </div>

              <div className="flex flex-col items-start space-y-2">
                <div className="w-9 h-9 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/40 flex items-center justify-center text-[#0B1024] shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-[#0B1024]" />
                </div>
                <span className="text-xs font-semibold text-[#0B1024] leading-tight">
                  Secure & <br />
                  <span className="text-[#4F586B] font-normal">Confidential</span>
                </span>
              </div>

            </div>

          </motion.div>

          {/* MOBILE ONLY PHOTOGRAPH DISPLAY (STACKED NATURALLY WITH NO BOX) */}
          <div className="block md:hidden w-full h-[320px] relative overflow-hidden mt-8 rounded-xl shadow-xs">
            <img
              src="/assets/supreme-court-hero.png"
              alt="Supreme Court of India"
              className="w-full h-full object-cover object-right"
            />
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#F8F5EE] to-transparent pointer-events-none" />
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. HOW NYAYAI HELPS — 5-STEP JOURNEY (REFERENCE MATCH) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-[#F4EFE6]/70 border-t border-[#0B1024]/8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">

          {/* SECTION HEADER */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#C88A32] block font-sans">
              HOW NYAYAI HELPS
            </span>
            <h2 className="font-serif font-medium text-3xl sm:text-4xl lg:text-[42px] text-[#0B1024] tracking-tight">
              From confusion to clarity
            </h2>
            <p className="text-sm sm:text-base text-[#4F586B] leading-relaxed">
              A simple, guided journey to help you navigate your legal matters with confidence.
            </p>
          </div>

          {/* HORIZONTAL 5-STEP JOURNEY */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4 items-center">

            {/* STEP 1 */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 relative group">
              <div className="flex items-center space-x-3 w-full justify-center md:justify-start">
                <div className="w-11 h-11 rounded-full bg-white border border-[#D7B47A]/60 flex items-center justify-center text-[#0B1024] shadow-xs shrink-0">
                  <FileText className="w-5 h-5 text-[#0B1024]" />
                </div>
                {/* Desktop Connector Arrow */}
                <div className="hidden md:flex flex-1 items-center justify-end pr-2 text-[#C88A32]">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0B1024] tracking-tight">
                  1. Share Your Situation
                </h3>
                <p className="text-xs text-[#4F586B] leading-relaxed max-w-[180px]">
                  Tell us what's happening in simple terms.
                </p>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 relative group">
              <div className="flex items-center space-x-3 w-full justify-center md:justify-start">
                <div className="w-11 h-11 rounded-full bg-white border border-[#D7B47A]/60 flex items-center justify-center text-[#0B1024] shadow-xs shrink-0">
                  <FolderOpen className="w-5 h-5 text-[#0B1024]" />
                </div>
                {/* Desktop Connector Arrow */}
                <div className="hidden md:flex flex-1 items-center justify-end pr-2 text-[#C88A32]">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0B1024] tracking-tight">
                  2. Add Evidence
                </h3>
                <p className="text-xs text-[#4F586B] leading-relaxed max-w-[180px]">
                  Upload and organise your documents.
                </p>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 relative group">
              <div className="flex items-center space-x-3 w-full justify-center md:justify-start">
                <div className="w-11 h-11 rounded-full bg-white border border-[#D7B47A]/60 flex items-center justify-center text-[#0B1024] shadow-xs shrink-0">
                  <Lightbulb className="w-5 h-5 text-[#0B1024]" />
                </div>
                {/* Desktop Connector Arrow */}
                <div className="hidden md:flex flex-1 items-center justify-end pr-2 text-[#C88A32]">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0B1024] tracking-tight">
                  3. Get Legal Insights
                </h3>
                <p className="text-xs text-[#4F586B] leading-relaxed max-w-[180px]">
                  Receive clear, structured guidance.
                </p>
              </div>
            </div>

            {/* STEP 4 */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 relative group">
              <div className="flex items-center space-x-3 w-full justify-center md:justify-start">
                <div className="w-11 h-11 rounded-full bg-white border border-[#D7B47A]/60 flex items-center justify-center text-[#0B1024] shadow-xs shrink-0">
                  <UsersRound className="w-5 h-5 text-[#0B1024]" />
                </div>
                {/* Desktop Connector Arrow */}
                <div className="hidden md:flex flex-1 items-center justify-end pr-2 text-[#C88A32]">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0B1024] tracking-tight">
                  4. Find the Right Advocate
                </h3>
                <p className="text-xs text-[#4F586B] leading-relaxed max-w-[180px]">
                  Get matched with relevant, verified advocates.
                </p>
              </div>
            </div>

            {/* STEP 5 */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 relative group">
              <div className="flex items-center space-x-3 w-full justify-center md:justify-start">
                <div className="w-11 h-11 rounded-full bg-white border border-[#D7B47A]/60 flex items-center justify-center text-[#0B1024] shadow-xs shrink-0">
                  <CalendarCheck className="w-5 h-5 text-[#0B1024]" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0B1024] tracking-tight">
                  5. Take Action
                </h3>
                <p className="text-xs text-[#4F586B] leading-relaxed max-w-[180px]">
                  Consult, plan, and move forward with confidence.
                </p>
              </div>
            </div>

          </div>

          {/* BOTTOM BRAND STATEMENT WITH GOLD ACCENT LINES */}
          <div className="pt-8 flex items-center justify-center space-x-4 max-w-xl mx-auto">
            <div className="h-[1px] bg-[#D7B47A]/60 flex-1" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-[#4F586B] text-center font-sans">
              SAME LAWS. A MORE ACCESSIBLE TOMORROW.
            </span>
            <div className="h-[1px] bg-[#D7B47A]/60 flex-1" />
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. DIFFERENTIATOR — VERIFIED EXPERIENCE MATCHING */}
      {/* ========================================================================= */}
      <section id="product" className="py-24 bg-[#F8F5EE] border-t border-[#0B1024]/8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* LEFT COPY */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-[36px] h-[1.5px] bg-[#C88A32]" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#4F586B]">
                  EXPERIENCE-BASED MATCHING
                </span>
              </div>

              <h2 className="font-serif font-medium text-3xl sm:text-4xl lg:text-[44px] text-[#0B1024] tracking-tight leading-[1.08]">
                Not a directory. <br />
                <span className="text-[#C88A32]">A match grounded in experience.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#4F586B] leading-relaxed">
                Generic directories list advocates using star ratings and sponsored ads. NYAYAI matches advocates based on verified court experience and relevant legal matter history.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start space-x-3 text-xs sm:text-sm text-[#0B1024]">
                  <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0 mt-0.5" />
                  <span>Grounding in High Court & District Court matter experience</span>
                </div>
                <div className="flex items-start space-x-3 text-xs sm:text-sm text-[#0B1024]">
                  <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0 mt-0.5" />
                  <span>Transparent breakdown of why an advocate was recommended</span>
                </div>
                <div className="flex items-start space-x-3 text-xs sm:text-sm text-[#0B1024]">
                  <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0 mt-0.5" />
                  <span>Jurisdiction, court level, and procedural stage alignment</span>
                </div>
              </div>
            </div>

            {/* RIGHT SHOWCASE CARD */}
            <div className="lg:col-span-7">
              <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#0B1024]/10 shadow-sm space-y-6">

                <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-5">
                  <div className="flex items-center space-x-4">
                    <img
                      src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80"
                      alt="Adv. Rajesh Varma"
                      className="w-13 h-13 rounded-xl object-cover ring-1 ring-[#0B1024]/10 shadow-2xs"
                    />
                    <div>
                      <h3 className="text-base font-bold text-[#0B1024] flex items-center gap-1.5">
                        <span>Adv. Rajesh Varma</span>
                        <ShieldCheck className="w-4 h-4 text-[#C88A32]" />
                      </h3>
                      <p className="text-xs text-[#4F586B]">
                        Senior Criminal Defense & High Court Appellate Advocate
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F4EFE6] text-[#C88A32] border border-[#D7B47A]/50 inline-block">
                      Verified Experience
                    </span>
                  </div>
                </div>

                {/* MATCH DETAILS */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#0B1024] uppercase tracking-wider">
                    Demonstrated Case Domain Experience:
                  </div>

                  <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#0B1024]/8 text-xs text-[#4F586B] space-y-2.5">
                    <div className="flex items-start space-x-2">
                      <span className="text-[#C88A32] font-bold">•</span>
                      <span>Extensive appellate experience before the Karnataka High Court in boundary & property disputes</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-[#C88A32] font-bold">•</span>
                      <span>Focused practice in civil revisions, land titles, and preliminary injunctions</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-[#4F586B] border-t border-[#0B1024]/8">
                  <span>Jurisdiction: Karnataka High Court & City Civil Courts</span>
                  <span className="font-semibold text-[#0B1024]">14 Years Practice Experience</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. DUAL WORKSPACES — CLIENTS & ADVOCATES */}
      {/* ========================================================================= */}
      <section className="py-24 bg-[#F4EFE6]/50 border-t border-[#0B1024]/8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#C88A32] block">
              PURPOSE-BUILT ENVIRONMENTS
            </span>
            <h2 className="font-serif font-medium text-3xl sm:text-4xl text-[#0B1024] tracking-tight">
              Designed for clients and advocates
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* FOR CLIENTS */}
            <div className="p-8 sm:p-10 bg-white rounded-2xl border border-[#0B1024]/10 space-y-6 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all duration-200">
              <div className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 rounded-md bg-[#FAF7F2] text-[#0B1024] text-xs font-bold border border-[#0B1024]/8">
                  <span>FOR CLIENTS</span>
                </div>

                <h3 className="font-serif font-medium text-2xl sm:text-3xl text-[#0B1024] tracking-tight">
                  Turn your situation into a structured case.
                </h3>

                <p className="text-sm text-[#4F586B] leading-relaxed font-normal">
                  Organize your legal situation, securely manage supporting documents, and discover verified advocates based on relevant experience.
                </p>

                <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#0B1024]">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0" />
                    <span>Guided case intake to clarify facts and timeline</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0" />
                    <span>Document vault to organize evidence securely</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0" />
                    <span>Direct video consultation with chosen advocates</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClientCTA}
                className="w-full bg-[#0B1024] hover:bg-[#182042] text-white font-medium text-sm py-3.5 rounded-xl shadow-2xs transition-all duration-200 flex items-center justify-center space-x-2 mt-4 cursor-pointer group"
              >
                <span>Enter Client Portal</span>
                <ArrowRight className="w-4 h-4 text-[#C88A32] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* FOR ADVOCATES */}
            <div className="p-8 sm:p-10 bg-[#0B1024] text-white rounded-2xl border border-[#0B1024] space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 rounded-md bg-white/10 text-[#C88A32] text-xs font-bold border border-white/10">
                  <span>FOR ADVOCATES</span>
                </div>

                <h3 className="font-serif font-medium text-2xl sm:text-3xl text-white tracking-tight">
                  Turn your experience into discoverable practice.
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed font-normal">
                  Showcase verified court domain experience, receive counsel-ready client requests, and conduct structured consultations.
                </p>

                <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-200">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0" />
                    <span>Verified case record & practice focus portfolio</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0" />
                    <span>Organized client requests with pre-gathered details</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C88A32] shrink-0" />
                    <span>Secure one-to-one consultation workspace</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAdvocateCTA}
                className="w-full bg-[#C88A32] hover:bg-[#B77A28] text-white font-medium text-sm py-3.5 rounded-xl shadow-2xs transition-all duration-200 flex items-center justify-center space-x-2 mt-4 cursor-pointer group"
              >
                <span>Enter Advocate Workspace</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FINAL CALL TO ACTION */}
      {/* ========================================================================= */}
      <section id="about" className="py-24 bg-[#0B1024] text-white relative z-10">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-7">
          <div className="w-[50px] h-[1.5px] bg-[#C88A32] mx-auto" />
          <h2 className="font-serif font-medium text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-tight">
            Your case deserves clear answers.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-normal">
            Whether you are resolving a legal dispute or seeking verified counsel, NYAYAI provides the structure and clarity you need.
          </p>

          <div className="pt-2">
            <button
              onClick={handleClientCTA}
              className="bg-[#C88A32] hover:bg-[#B77A28] text-white font-medium text-sm px-8 py-3.5 rounded-xl shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] inline-flex items-center space-x-2 cursor-pointer"
            >
              <span>Get Started with NYAYAI</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. EDITORIAL BRAND FOOTER */}
      {/* ========================================================================= */}
      <footer className="py-12 bg-[#080D20] text-slate-400 border-t border-white/8 text-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#0B1024] text-[#C88A32] flex items-center justify-center font-bold text-xs border border-[#C88A32]/30">
              <Scale className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-tight text-sm">NYAYAI</span>
              <span className="text-[9px] text-[#C88A32] tracking-[0.2em] uppercase font-semibold">JUSTICE, MADE CLEAR</span>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            © 2026 NYAYAI. A more accessible justice system.
          </div>
        </div>
      </footer>

    </div>
  );
};
