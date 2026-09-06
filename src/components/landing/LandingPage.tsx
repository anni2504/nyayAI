import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRight,
  ShieldCheck,
  Scale,
  FileText,
  FolderOpen,
  UsersRound,
  Lightbulb,
  CalendarCheck,
  Gavel,
  MapPin,
  UserCheck,
  TrendingUp
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

          {/* MOBILE ONLY PHOTOGRAPH DISPLAY */}
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
      {/* 3. NEW EXPERIENCE SECTION (EXACT MATCH TO REFERENCE SCREENSHOT 2) */}
      {/* ========================================================================= */}
      <section id="product" className="relative py-20 lg:py-24 bg-[#F8F5EE] border-t border-[#0B1024]/8 overflow-hidden z-10">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">

            {/* LEFT COLUMN: EDITORIAL COPY & HORIZONTAL LIST ITEMS */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* EYEBROW */}
              <div className="flex items-center space-x-3.5">
                <div className="w-[36px] h-[1.5px] bg-[#C88A32] shrink-0" />
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#4F586B] font-sans">
                  EXPERIENCE-BASED MATCHING
                </span>
              </div>

              {/* HEADLINE */}
              <h2 className="font-serif font-medium text-4xl sm:text-5xl lg:text-[50px] xl:text-[54px] text-[#0B1024] tracking-tight leading-[1.08]">
                The <span className="font-serif italic text-[#C88A32]">right advocate,</span> <br />
                for your kind of case.
              </h2>

              {/* BODY DESCRIPTION */}
              <p className="text-base sm:text-lg text-[#4F586B] leading-relaxed max-w-[500px]">
                NYAYAI connects you with verified advocates whose experience matches your legal matter, courts and procedures — not just a list of names.
              </p>

              {/* 3 HORIZONTAL LIST ITEMS IN A ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#0B1024]/6">
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/50 flex items-center justify-center text-[#0B1024] shrink-0 shadow-2xs">
                    <Gavel className="w-4 h-4 text-[#0B1024]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#0B1024] leading-snug">
                    Relevant court experience
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/50 flex items-center justify-center text-[#0B1024] shrink-0 shadow-2xs">
                    <FileText className="w-4 h-4 text-[#0B1024]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#0B1024] leading-snug">
                    Clear reason for the match
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#F4EFE6] border border-[#D7B47A]/50 flex items-center justify-center text-[#0B1024] shrink-0 shadow-2xs">
                    <MapPin className="w-4 h-4 text-[#0B1024]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#0B1024] leading-snug">
                    Court, jurisdiction and procedural fit
                  </span>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: CLEAN ADVOCATE PORTRAIT */}
            <div className="lg:col-span-5 relative flex flex-col items-center lg:items-end justify-center pt-8 lg:pt-0">
              
              <div className="relative w-full max-w-[360px] sm:max-w-[400px] flex flex-col items-center lg:items-end">
                {/* ADVOCATE PORTRAIT IMAGE */}
                <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-[#D7B47A]/50 z-10 group">
                  <img
                    src="/assets/advocate-portrait.jpg"
                    alt="Adv. Rajesh Varma"
                    className="w-full h-full object-cover object-top transform group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1024]/30 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* BOTTOM RIGHT SUBTLE BRAND SLOGAN */}
              <div className="w-full max-w-[360px] sm:max-w-[400px] flex items-center justify-center lg:justify-end space-x-2 pt-6">
                <div className="w-[30px] h-[1px] bg-[#C88A32]/60" />
                <span className="text-[10px] font-bold tracking-[0.25em] text-[#C88A32] uppercase font-sans">
                  PEOPLE. PERSPECTIVE. JUSTICE.
                </span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. DUAL WORKSPACES — CLIENTS & ADVOCATES (EXACT REFERENCE MATCH) */}
      {/* ========================================================================= */}
      <section className="py-24 bg-[#F8F5EE] border-t border-[#0B1024]/8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* SECTION HEADER */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#C88A32] block font-sans">
              PURPOSE-BUILT ENVIRONMENTS
            </span>
            <h2 className="font-serif font-medium text-3xl sm:text-4xl lg:text-[44px] text-[#0B1024] tracking-tight leading-tight">
              Designed for clients and advocates
            </h2>
            <p className="text-xs sm:text-sm text-[#4F586B] font-normal leading-relaxed">
              Different needs. A common purpose — a clearer, more accessible justice system.
            </p>
          </div>

          {/* DUAL WORKSPACE CARDS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* FOR CLIENTS CARD */}
            <div className="relative rounded-[28px] bg-[#FAF7F2] border border-[#D7B47A]/35 shadow-lg overflow-hidden flex flex-col justify-between p-8 sm:p-10 min-h-[490px] group transition-all duration-300 hover:shadow-xl">
              
              {/* RIGHT BACKGROUND IMAGE WITH BLENDED GRADIENT */}
              <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[62%] h-full pointer-events-none overflow-hidden select-none z-0">
                <img
                  src="https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1000&q=80"
                  alt="Client reviewing legal documents"
                  className="w-full h-full object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 opacity-85"
                />
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/90 sm:via-[#FAF7F2]/80 to-transparent" />
              </div>

              {/* CONTENT (Z-10) */}
              <div className="relative z-10 space-y-6 max-w-[440px]">
                
                {/* HEADER TAG */}
                <div className="inline-flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#C88A32]" />
                  <span className="text-[11px] font-bold tracking-[0.18em] text-[#C88A32] uppercase font-sans">
                    FOR CLIENTS
                  </span>
                  <div className="w-8 h-[1px] bg-[#C88A32]" />
                </div>

                {/* HEADLINE */}
                <h3 className="font-serif font-medium text-3xl sm:text-4xl text-[#0B1024] tracking-tight leading-[1.12]">
                  Turn your situation <br />
                  into a <span className="font-serif italic text-[#C88A32]">structured case.</span>
                </h3>

                {/* DESCRIPTION */}
                <p className="text-xs sm:text-sm text-[#4F586B] leading-relaxed">
                  Understand your rights, organise your evidence, and find the right advocates — all in one place.
                </p>

                {/* 3 LIST ITEMS WITH CIRCULAR CONTAINER ICONS */}
                <div className="space-y-3.5 pt-2">
                  
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-full bg-white border border-[#D7B47A]/40 flex items-center justify-center text-[#0B1024] shrink-0 shadow-2xs">
                      <FolderOpen className="w-4 h-4 text-[#C88A32]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1024]">Organise</h4>
                      <p className="text-[11px] text-[#4F586B]">your documents</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-full bg-white border border-[#D7B47A]/40 flex items-center justify-center text-[#0B1024] shrink-0 shadow-2xs">
                      <UsersRound className="w-4 h-4 text-[#C88A32]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1024]">Find advocates</h4>
                      <p className="text-[11px] text-[#4F586B]">with relevant experience</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-full bg-white border border-[#D7B47A]/40 flex items-center justify-center text-[#0B1024] shrink-0 shadow-2xs">
                      <ShieldCheck className="w-4 h-4 text-[#C88A32]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1024]">Take informed</h4>
                      <p className="text-[11px] text-[#4F586B]">action with confidence</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* BUTTON & FOOTER STAMP */}
              <div className="relative z-10 pt-8 flex items-center justify-between">
                <button
                  onClick={handleClientCTA}
                  className="bg-[#0B1024] hover:bg-[#182042] text-white font-medium text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center space-x-2.5 cursor-pointer group"
                >
                  <span>Enter Client Portal</span>
                  <ArrowRight className="w-4 h-4 text-[#C88A32] group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* SIDE STAMPS */}
                <div className="hidden sm:block text-right pr-1">
                  <span className="text-[8px] font-bold tracking-[0.2em] text-[#8C95A6] uppercase block">
                    KNOW · PREPARE · PROCEED
                  </span>
                  <span className="text-[8px] font-bold tracking-[0.2em] text-[#C88A32] uppercase block mt-0.5">
                    YOUR MATTERS. OUR SUPPORT.
                  </span>
                </div>
              </div>
            </div>

            {/* FOR ADVOCATES CARD */}
            <div className="relative rounded-[28px] bg-[#0B1024] border border-[#D7B47A]/30 shadow-xl overflow-hidden flex flex-col justify-between p-8 sm:p-10 min-h-[490px] text-white group transition-all duration-300 hover:shadow-2xl">
              
              {/* RIGHT BACKGROUND IMAGE WITH BLENDED GRADIENT */}
              <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[65%] h-full pointer-events-none overflow-hidden select-none z-0">
                <img
                  src="/assets/supreme-court-hero.jpg"
                  alt="Advocate court workspace"
                  className="w-full h-full object-cover object-right transform group-hover:scale-[1.02] transition-transform duration-700 opacity-40 mix-blend-luminosity"
                />
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#0B1024] via-[#0B1024]/95 sm:via-[#0B1024]/85 to-transparent" />
              </div>

              {/* CONTENT (Z-10) */}
              <div className="relative z-10 space-y-6 max-w-[440px]">
                
                {/* HEADER TAG */}
                <div className="inline-flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-[#C88A32]" />
                  <span className="text-[11px] font-bold tracking-[0.18em] text-[#C88A32] uppercase font-sans">
                    FOR ADVOCATES
                  </span>
                  <div className="w-8 h-[1px] bg-[#C88A32]" />
                </div>

                {/* HEADLINE */}
                <h3 className="font-serif font-medium text-3xl sm:text-4xl text-white tracking-tight leading-[1.12]">
                  Turn your experience <br />
                  into <span className="font-serif italic text-[#C88A32]">greater impact.</span>
                </h3>

                {/* DESCRIPTION */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Connect with genuine clients, showcase your practice, and manage your consultations efficiently.
                </p>

                {/* 3 LIST ITEMS WITH CIRCULAR CONTAINER ICONS */}
                <div className="space-y-3.5 pt-2">
                  
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[#C88A32] shrink-0 shadow-2xs">
                      <UserCheck className="w-4 h-4 text-[#C88A32]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Receive relevant</h4>
                      <p className="text-[11px] text-slate-400">client requests</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[#C88A32] shrink-0 shadow-2xs">
                      <CalendarCheck className="w-4 h-4 text-[#C88A32]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Manage consultations</h4>
                      <p className="text-[11px] text-slate-400">in one place</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[#C88A32] shrink-0 shadow-2xs">
                      <TrendingUp className="w-4 h-4 text-[#C88A32]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Build your practice</h4>
                      <p className="text-[11px] text-slate-400">with meaningful cases</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* BUTTON & FOOTER STAMP */}
              <div className="relative z-10 pt-8 flex items-center justify-between">
                <button
                  onClick={handleAdvocateCTA}
                  className="bg-[#C88A32] hover:bg-[#B77A28] text-white font-medium text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center space-x-2.5 cursor-pointer group"
                >
                  <span>Enter Advocate Workspace</span>
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* SIDE STAMPS */}
                <div className="hidden sm:block text-right pr-1">
                  <span className="text-[8px] font-bold tracking-[0.2em] text-slate-400 uppercase block">
                    LAW · PEOPLE · JUSTICE · PROGRESS
                  </span>
                  <span className="text-[8px] font-bold tracking-[0.2em] text-[#C88A32] uppercase block mt-0.5">
                    A STRONGER LEGAL COMMUNITY.
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* BOTTOM SLOGAN DIVIDER BAR */}
          <div className="pt-8 text-center flex items-center justify-center space-x-4">
            <div className="w-12 sm:w-20 h-[1px] bg-[#C88A32]/40" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#C88A32] uppercase font-sans">
              SAME LAWS. A MORE ACCESSIBLE TOMORROW.
            </span>
            <div className="w-12 sm:w-20 h-[1px] bg-[#C88A32]/40" />
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. EDITORIAL FINAL CALL TO ACTION (EXACT REFERENCE MATCH) */}
      {/* ========================================================================= */}
      <section id="about" className="relative py-28 bg-[#070D1F] text-white overflow-hidden z-10 border-t border-[#0B1024]">
        
        {/* LEFT SUPREME COURT SILHOUETTE WATERMARK & IMPRINT */}
        <div className="absolute top-0 left-0 bottom-0 w-full sm:w-[50%] lg:w-[44%] h-full pointer-events-none select-none overflow-hidden z-0">
          <img
            src="/assets/supreme-court-hero.png"
            alt="Supreme Court of India"
            className="w-full h-full object-cover object-left opacity-40 sm:opacity-50 mix-blend-screen filter contrast-125"
          />
          {/* Smooth gradient transition fading into dark blue section bg */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#070D1F]/60 to-[#070D1F]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070D1F]/40 via-transparent to-[#070D1F]/40" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* SPACER FOR LEFT SILHOUETTE ON DESKTOP */}
            <div className="hidden lg:block lg:col-span-2" />

            {/* CENTER MAIN CTA CONTENT */}
            <div className="lg:col-span-7 text-center space-y-6 max-w-2xl mx-auto">
              
              {/* GOLD ACCENT BAR & EYEBROW */}
              <div className="space-y-3">
                <div className="w-10 h-[1.5px] bg-[#C88A32] mx-auto" />
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#C88A32] uppercase font-sans block">
                  A MORE ACCESSIBLE JUSTICE SYSTEM
                </span>
              </div>

              {/* HEADLINE */}
              <h2 className="font-serif font-medium text-4xl sm:text-5xl lg:text-[54px] tracking-tight text-white leading-[1.08]">
                Your case deserves <br />
                <span className="font-serif italic text-[#D89947]">clear answers.</span>
              </h2>

              {/* BODY DESCRIPTION */}
              <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-normal">
                Whether you are resolving a legal dispute or seeking verified counsel, NYAYAI provides the structure and clarity you need.
              </p>

              {/* CTA BUTTON */}
              <div className="pt-2">
                <button
                  onClick={handleClientCTA}
                  className="bg-[#D89947] hover:bg-[#C58838] text-[#070D1F] font-semibold text-sm px-8 py-3.5 rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] inline-flex items-center space-x-2.5 cursor-pointer group"
                >
                  <span>Get Started with NYAYAI</span>
                  <ArrowRight className="w-4 h-4 text-[#070D1F] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

            </div>

            {/* RIGHT SIDE QUOTE BLOCK */}
            <div className="hidden lg:flex lg:col-span-3 flex-col justify-center space-y-3 border-l border-white/10 pl-8">
              <div className="w-8 h-[1px] bg-[#C88A32]" />
              <div className="text-[#C88A32] font-serif text-3xl font-bold leading-none">“</div>
              <p className="font-serif italic text-sm text-slate-200 leading-relaxed max-w-[210px]">
                A fairer tomorrow begins with a clearer today.”
              </p>
              <div className="w-6 h-[1px] bg-[#C88A32]/60 my-2" />
              <div className="space-y-0.5 text-[9px] font-bold tracking-[0.25em] text-slate-400 uppercase font-sans">
                <p>PEOPLE</p>
                <p>PERSPECTIVE</p>
                <p>JUSTICE</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MIDDLE DIVIDER BAND WITH JUSTICE CONNECTS US STAMP */}
      {/* ========================================================================= */}
      <div className="relative bg-[#050814] py-4 border-t border-white/10 text-center z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <div className="flex-1 h-[1px] bg-white/10" />
          <div className="px-6 flex items-center space-x-2 text-[#C88A32]">
            <Scale className="w-4 h-4 text-[#C88A32]" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase font-sans">
              JUSTICE CONNECTS US
            </span>
          </div>
          <div className="flex-1 h-[1px] bg-white/10" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. EDITORIAL BRAND FOOTER (EXACT REFERENCE MATCH) */}
      {/* ========================================================================= */}
      <footer className="bg-[#050814] text-slate-400 text-xs relative z-10 pt-12 pb-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* MAIN FOOTER COLUMNS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 items-start">
            
            {/* BRAND COLUMN (LEFT) */}
            <div className="md:col-span-4 space-y-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#0B1024] text-[#C88A32] flex items-center justify-center font-bold text-sm border border-[#C88A32]/40 shadow-xs shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-white tracking-tight text-xl">NYAYAI</span>
                  <span className="text-[9px] text-[#C88A32] tracking-[0.2em] uppercase font-semibold font-sans">JUSTICE, MADE CLEAR</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[280px]">
                Technology for a fairer, more accessible justice system.
              </p>
            </div>

            {/* LINKS COLUMNS (CENTER) */}
            <div className="md:col-span-5 grid grid-cols-3 gap-6 pt-1">
              
              {/* PRODUCT */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold tracking-[0.2em] text-white uppercase font-sans">
                  PRODUCT
                </h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#product" className="hover:text-white transition-colors">For Clients</a></li>
                  <li><a href="#product" className="hover:text-white transition-colors">For Advocates</a></li>
                </ul>
              </div>

              {/* COMPANY */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold tracking-[0.2em] text-white uppercase font-sans">
                  COMPANY
                </h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                </ul>
              </div>

              {/* LEGAL */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold tracking-[0.2em] text-white uppercase font-sans">
                  LEGAL
                </h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                </ul>
              </div>

            </div>

            {/* RIGHT SLOGAN & WATERMARK COLUMN */}
            <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8 space-y-3 relative overflow-hidden">
              <div className="w-8 h-[1.5px] bg-[#C88A32]" />
              <div className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase leading-relaxed font-sans relative z-10">
                <p>SAME LAWS.</p>
                <p>A MORE ACCESSIBLE</p>
                <p>TOMORROW.</p>
              </div>

              {/* BACKGROUND WATERMARK SCALES ICON */}
              <div className="absolute right-0 bottom-0 pointer-events-none opacity-10 text-white">
                <Scale className="w-28 h-28" />
              </div>
            </div>

          </div>

          {/* SUB-FOOTER BOTTOM BAR */}
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              © 2026 NYAYAI. All rights reserved.
            </div>

            <div className="flex items-center space-x-4">
              {/* SOCIAL ICONS */}
              <div className="flex items-center space-x-3 text-slate-400">
                {/* LinkedIn Icon */}
                <a href="#" className="hover:text-white transition-colors" title="LinkedIn">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/>
                  </svg>
                </a>
                {/* X Icon */}
                <a href="#" className="hover:text-white transition-colors" title="X">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                {/* YouTube Icon */}
                <a href="#" className="hover:text-white transition-colors" title="YouTube">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>

              <div className="h-3 w-[1px] bg-white/20" />

              <span className="text-[11px] text-slate-400">
                Justice. People. Possibilities.
              </span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
