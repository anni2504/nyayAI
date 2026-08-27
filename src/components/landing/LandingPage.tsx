import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileCheck2, ArrowRight, Sparkles, Scale, CheckCircle2, ChevronRight, ShieldCheck, ArrowUpRight, UserCheck, Briefcase } from 'lucide-react';
import { useCaseContext } from '../../context/CaseContext';

export const LandingPage: React.FC = () => {
  const { openMatchEvidenceModal } = useCaseContext();
  const { loginAsRole } = useAuth();
  
  // Interactive Live Case Engine Demo State
  const [activeDemoCase, setActiveDemoCase] = useState<number>(0);

  const demoCases = [
    {
      title: 'Boundary Obstruction & Intimidation',
      jurisdiction: 'Bengaluru (Karnataka High Court)',
      practiceArea: 'Criminal Defense & Property',
      readiness: 82,
      statutes: ['CrPC Section 482', 'IPC Section 506', 'Order 39 Rule 1'],
      riskScore: 35,
      riskLevel: 'Low Document Risk',
      sanitizedSummary: 'Neighbor erected illegal gate blocking private setback passage. Police CSR No. 184/2026 registered.',
      matchedAdvocate: {
        id: 'lawyer-1',
        name: 'Adv. Rajesh Varma',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
        title: 'Senior Criminal Defense & High Court Appellate Advocate',
        matchScore: 87,
        practiceArea: 'Criminal Defense & Property Dispute',
        jurisdiction: 'Karnataka High Court',
        court: 'Karnataka High Court',
        experienceYears: 14,
        whyMatch: [
          'Handled 42 verified Karnataka High Court petitions under CrPC 482 & boundary disputes',
          '89% success rate in High Court quashing petitions'
        ],
        breakdown: {
          legalIssueSimilarity: 31,
          jurisdiction: 20,
          practiceArea: 18,
          courtExperience: 10,
          proceduralStage: 8
        },
        matchedCases: [
          {
            title: 'State of Karnataka v. S. Kumar (Property Boundary Dispute)',
            court: 'Karnataka High Court',
            year: 2024,
            relevance: 'Identical legal issue regarding private land boundary dispute.',
            outcome: 'Quashed Section 506 proceeding under Section 482 CrPC.'
          }
        ]
      }
    },
    {
      title: '22-Month Builder Possession Delay',
      jurisdiction: 'Whitefield (Karnataka RERA Tribunal)',
      practiceArea: 'RERA & Real Estate',
      readiness: 90,
      statutes: ['RERA Act 2016 Section 18', 'RERA Form N', 'Consumer Protection Act'],
      riskScore: 78,
      riskLevel: 'High Risk Penalty Clause',
      sanitizedSummary: 'Promoter delayed apartment handover by 22 months without force majeure notice. Contract contains 18% p.a. buyer late fee vs Rs 5/sq.ft/mo builder delay penalty.',
      matchedAdvocate: {
        id: 'lawyer-2',
        name: 'Adv. Vikramaditya Singhania',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        title: 'RERA Authority & Property Litigation Specialist',
        matchScore: 91,
        practiceArea: 'Property & Real Estate',
        jurisdiction: 'Karnataka RERA Tribunal',
        court: 'Karnataka RERA Tribunal & High Court',
        experienceYears: 11,
        whyMatch: [
          'Secured 36 full principal refunds with SBI MCLR+2% interest under RERA Sec 18',
          'Specialist in asymmetrical builder clause invalidation'
        ],
        breakdown: {
          legalIssueSimilarity: 35,
          jurisdiction: 20,
          practiceArea: 20,
          courtExperience: 9,
          proceduralStage: 7
        },
        matchedCases: [
          {
            title: 'Flat Buyers Association v. Prestige Developers',
            court: 'Karnataka RERA Tribunal',
            year: 2024,
            relevance: 'RERA Section 18 full refund awarded with 10.25% interest.',
            outcome: 'Promoter ordered to pay full principal + delay interest.'
          }
        ]
      }
    },
    {
      title: 'Co-Founder Reverse Vesting Arbitrary Dilution',
      jurisdiction: 'NCLT Delhi & Delhi High Court',
      practiceArea: 'Corporate & Startup SHA',
      readiness: 76,
      statutes: ['Companies Act 2013 Sec 241', 'SHA Reverse Vesting Clause 4.2', 'Arbitration Act'],
      riskScore: 24,
      riskLevel: 'Low Document Risk',
      sanitizedSummary: 'Lead investor attempted arbitrary cliff dilution prior to 12-month founder vesting milestone.',
      matchedAdvocate: {
        id: 'lawyer-3',
        name: 'Adv. Ananya Roy',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
        title: 'Senior Corporate, M&A & Founders Counsel',
        matchScore: 94,
        practiceArea: 'Corporate & Startup',
        jurisdiction: 'NCLT Delhi',
        court: 'NCLT Delhi & High Court',
        experienceYears: 16,
        whyMatch: [
          '58 verified founder SHA protection settlements and NCLT Section 241 petitions',
          'Exclusively represents tech co-founders against arbitrary board dilution'
        ],
        breakdown: {
          legalIssueSimilarity: 38,
          jurisdiction: 20,
          practiceArea: 20,
          courtExperience: 9,
          proceduralStage: 7
        },
        matchedCases: [
          {
            title: 'Tech Founders v. VC Lead Investor',
            court: 'NCLT Delhi',
            year: 2025,
            relevance: 'Protected co-founders against arbitrary board dilution.',
            outcome: 'SHA revised with 100% equity retention.'
          }
        ]
      }
    }
  ];

  const currentDemo = demoCases[activeDemoCase];

  return (
    <div className="min-h-screen bg-warm-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* SECTION 1 — HERO WITH RICH EDITORIAL COMPOSITION */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
        {/* Subtle background ambient gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-slate-100/80 via-indigo-50/20 to-transparent pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* HERO TEXT (LEFT) */}
            <div className="lg:col-span-6 space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
              
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-950 text-amber-400 text-xs font-semibold tracking-wide border border-slate-800 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Grounded Indian Legal Intelligence & Advocate Discovery</span>
              </div>

              {/* Primary brand statement */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.1]">
                Legal intelligence, <br />
                <span className="text-indigo-950 underline decoration-amber-500/60 decoration-2 underline-offset-8">
                  built around your case.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-xl">
                Understand your legal situation, analyze your documents, and discover advocates with verified court precedent experience — all in one calm, intelligent workspace.
              </p>

              {/* DIRECT ENTRY BUTTONS (NO POPUPS) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => {
                    loginAsRole('CLIENT');
                    window.location.hash = '#/client';
                  }}
                  className="flex items-center justify-center space-x-2.5 bg-indigo-950 hover:bg-slate-900 text-white font-extrabold px-8 py-4 rounded-xl shadow-card transition-smooth hover:scale-[1.01] active:scale-[0.99] text-sm"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>I'm a Client</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => {
                    loginAsRole('ADVOCATE');
                    window.location.hash = '#/advocate';
                  }}
                  className="flex items-center justify-center space-x-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold px-8 py-4 rounded-xl shadow-card border border-slate-800 transition-smooth hover:scale-[1.01] active:scale-[0.99] text-sm"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>I'm an Advocate</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Evidence-Grounded AI
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Statutory Acts (IPC, CrPC, RERA)
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> High Court Precedents
                </span>
              </div>

            </div>

            {/* HERO VISUAL (RIGHT) — INTERACTIVE EDITORIAL DEMO CARD */}
            <div className="lg:col-span-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                
                {/* Back Decorative Subtle Shadow Accent */}
                <div className="absolute -top-3 -right-3 w-full h-full bg-slate-200/50 rounded-3xl transform rotate-1 pointer-events-none" />

                {/* MAIN EDITORIAL METHODOLOGY CARD */}
                <div className="relative bg-white rounded-3xl border border-slate-200 shadow-floating p-6 sm:p-7 space-y-5 overflow-hidden">
                  
                  {/* Top Bar with Live Indicator */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shadow-xs">
                        <Scale className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 tracking-tight">NYAYAI Legal Engine</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Intelligence Stream</span>
                    </div>
                  </div>

                  {/* CASE TOGGLE TABS */}
                  <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                    {demoCases.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveDemoCase(idx)}
                        className={`flex-1 py-1.5 px-2 rounded-lg transition-smooth text-center truncate ${
                          activeDemoCase === idx
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Case 0{idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* STEP 1: CASE UNDERSTANDING CHECKLIST */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <span>01. Case Understanding</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Context Built</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Matter</span>
                        <span className="font-bold text-slate-900 truncate block">{currentDemo.title}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Jurisdiction</span>
                        <span className="font-bold text-slate-900 truncate block">{currentDemo.jurisdiction}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Practice Area</span>
                        <span className="font-bold text-slate-900 truncate block">{currentDemo.practiceArea}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Document Risk</span>
                        <span className="font-bold text-indigo-900 truncate block">{currentDemo.riskLevel}</span>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: CASE READINESS GAUGE */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-subtle">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                        02. Case Readiness Score
                      </div>
                      <div className="text-2xl font-black mt-0.5">{currentDemo.readiness}% <span className="text-xs font-normal text-slate-300">Complete</span></div>
                      <p className="text-[10px] text-slate-400 mt-1">Sufficient matter clarity & evidence for counsel engagement.</p>
                    </div>

                    <div className="w-14 h-14 rounded-full bg-slate-800 border-4 border-amber-400 flex items-center justify-center font-black text-sm text-amber-300 shrink-0">
                      {currentDemo.readiness}%
                    </div>
                  </div>

                  {/* STEP 3: ADVOCATE MATCH WITH PRECEDENT EVIDENCE */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-950 bg-indigo-100 px-2 py-0.5 rounded">
                        03. Precedent Advocate Match
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        {currentDemo.matchedAdvocate.matchScore}% Match Confidence
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200/80">
                      <img
                        src={currentDemo.matchedAdvocate.avatar}
                        alt={currentDemo.matchedAdvocate.name}
                        className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-900/10 shrink-0"
                      />
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{currentDemo.matchedAdvocate.name}</h4>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium truncate">{currentDemo.matchedAdvocate.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{currentDemo.matchedAdvocate.court}</p>
                      </div>
                    </div>

                    {/* Precedent Evidence Snippet */}
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>Matched Precedent Evidence:</span>
                        <button
                          onClick={() => openMatchEvidenceModal(currentDemo.matchedAdvocate)}
                          className="text-[10px] text-indigo-900 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          <span>Inspect Evidence</span>
                          <ArrowUpRight className="w-3 h-3 text-indigo-900" />
                        </button>
                      </div>
                      <p className="text-slate-600 text-[10px]">
                        "{currentDemo.matchedAdvocate.matchedCases[0].title} — {currentDemo.matchedAdvocate.matchedCases[0].outcome}"
                      </p>
                    </div>

                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2 — THREE-STEP METHODOLOGY */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Three-Step Methodology
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-4 tracking-tight">
              From a legal question to the right legal expertise.
            </h2>
            <p className="text-base text-slate-600 mt-3 font-normal">
              NYAYAI structures raw legal concerns into grounded case context before counsel engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Step 01 UNDERSTAND */}
            <div className="p-8 rounded-2xl bg-warm-white border border-slate-200/90 shadow-subtle space-y-4 hover:border-slate-300 transition-smooth group">
              <div className="text-3xl font-black text-amber-600 font-mono">01</div>
              <h3 className="text-xl font-bold text-slate-900">UNDERSTAND</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Describe your legal situation in plain language or upload key documents like police complaints, notices, or contracts.
              </p>
              <div className="pt-2 flex items-center text-xs font-semibold text-indigo-900 group-hover:translate-x-1 transition-smooth">
                <span>Upload documents & details</span> <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Step 02 BUILD CONTEXT */}
            <div className="p-8 rounded-2xl bg-warm-white border border-slate-200/90 shadow-subtle space-y-4 hover:border-slate-300 transition-smooth group">
              <div className="text-3xl font-black text-indigo-900 font-mono">02</div>
              <h3 className="text-xl font-bold text-slate-900">BUILD CONTEXT</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                NYAYAI identifies relevant facts, jurisdiction, practice area and procedural context to calculate a live Case Readiness Score.
              </p>
              <div className="pt-2 flex items-center text-xs font-semibold text-indigo-900 group-hover:translate-x-1 transition-smooth">
                <span>Live Case Readiness Index</span> <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Step 03 DISCOVER */}
            <div className="p-8 rounded-2xl bg-warm-white border border-slate-200/90 shadow-subtle space-y-4 hover:border-slate-300 transition-smooth group">
              <div className="text-3xl font-black text-slate-900 font-mono">03</div>
              <h3 className="text-xl font-bold text-slate-900">DISCOVER</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Relevant advocates are ranked using verified High Court case-history evidence, ensuring alignment with your exact issue.
              </p>
              <div className="pt-2 flex items-center text-xs font-semibold text-indigo-900 group-hover:translate-x-1 transition-smooth">
                <span>Precedent-ranked Advocates</span> <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3 — DOCUMENT INTELLIGENCE WORKSPACE */}
      <section className="py-20 bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                Document Intelligence Workspace
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                Upload judgments, notices & contracts. <br />
                <span className="text-indigo-950">Get grounded answers.</span>
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Analyze dense PDF court orders, builder-buyer agreements, and legal notices. NYAYAI highlights hidden risk clauses, key dates, and statutory liabilities.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Clause Extraction:</strong> Automatic identification of asymmetrical penalties and force majeure.</span>
                </div>
                <div className="flex items-start space-x-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Suggested Queries:</strong> Instant prompts for "What was the court's decision?" or "Where is bail discussed?".</span>
                </div>
                <div className="flex items-start space-x-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Grounded Citations:</strong> Exact page & line references directly from your document.</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    loginAsRole('CLIENT');
                    window.location.hash = '#/client/documents';
                  }}
                  className="bg-indigo-950 hover:bg-slate-900 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-subtle transition-smooth inline-flex items-center gap-2"
                >
                  <FileCheck2 className="w-4 h-4 text-amber-400" />
                  <span>Open Document Workspace</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-floating p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <FileCheck2 className="w-5 h-5 text-indigo-900" />
                    <span className="text-xs font-bold text-slate-900">Builder_Buyer_Agreement_Flat_402.pdf</span>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold rounded">
                    High Risk Score (78/100)
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Extracted Clause 11.2 (Asymmetrical Penalty)</span>
                    <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">High Severity</span>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px]">
                    "Buyer shall pay interest at 18% p.a. for late installment; Promoter shall pay compensation at Rs 5/sq.ft/month for delayed possession."
                  </p>
                </div>

                <div className="p-3 bg-indigo-50/70 rounded-xl text-xs text-indigo-950 border border-indigo-100">
                  <strong className="block text-indigo-900 font-bold mb-1">NYAYAI Analysis:</strong>
                  This clause violates RERA Act 2016 Section 18, which mandates equal interest rates for both buyer and developer.
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4 — ADVOCATE DISCOVERY */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Precedent-Grounded Advocate Match
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-4 tracking-tight">
              Connect with counsel who have fought your exact issue.
            </h2>
            <p className="text-base text-slate-600 mt-3 font-normal">
              Matches are derived from verified court orders, bar registrations, and precedent similarity.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-warm-white rounded-2xl border border-slate-200 shadow-floating p-8 space-y-6">
              
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80"
                    alt="Adv. Rajesh Varma"
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-900/10 shadow-sm"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-slate-900">Adv. Rajesh Varma</h3>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-xs text-slate-600 font-medium">Senior Criminal Defense Counsel • 14 Yrs Exp</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Karnataka High Court & Supreme Court</p>
                  </div>
                </div>

                <div className="bg-indigo-950 text-amber-400 px-3.5 py-2 rounded-xl text-center shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider">Match Score</div>
                  <div className="text-2xl font-black">87%</div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">Match Evidence Indicators</div>
                <div className="flex items-center text-slate-700 gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Handled 42 verified criminal intimidation & boundary disputes in Karnataka High Court</span>
                </div>
                <div className="flex items-center text-slate-700 gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Section 482 CrPC quashing success rate: 89%</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <button
                  onClick={() => {
                    loginAsRole('CLIENT');
                    window.location.hash = '#/client/advocates';
                  }}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl shadow-subtle transition-smooth text-center"
                >
                  View Advocate Profile & Precedents
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5 — CASE INTELLIGENCE DASHBOARD PREVIEW */}
      <section className="py-20 bg-warm-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Real-time Case Readiness Metrics
            </h2>
            <p className="text-slate-600 text-base mt-3">
              Never enter legal consultations unprepared. Track matter clarity, evidence, and missing information.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-floating p-8 text-left space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Case Context Analysis</span>
                <h3 className="text-lg font-bold text-slate-900">Neighbour Dispute & Boundary Obstruction</h3>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Readiness: 82%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Matter Clarity</div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirmed
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Jurisdiction</div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Karnataka
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Practice Area</div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Criminal / Property
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Procedural Stage</div>
                <div className="text-sm font-bold text-amber-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" /> CSR Inquiry
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6 — TRUST & FOOTER */}
      <footer className="bg-slate-900 text-white pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-950 font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="text-xl font-extrabold tracking-tight">NYAY<span className="text-amber-400">AI</span></span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Intelligent, evidence-grounded legal technology platform for individuals, founders, and advocates across India.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">Platform</h4>
              <ul className="space-y-2 text-xs text-slate-400 font-medium">
                <li>
                  <button onClick={() => { loginAsRole('CLIENT'); window.location.hash = '#/client/copilot'; }} className="hover:text-amber-400">
                    AI Copilot Workspace
                  </button>
                </li>
                <li>
                  <button onClick={() => { loginAsRole('CLIENT'); window.location.hash = '#/client/documents'; }} className="hover:text-amber-400">
                    Document Intelligence
                  </button>
                </li>
                <li>
                  <button onClick={() => { loginAsRole('CLIENT'); window.location.hash = '#/client/advocates'; }} className="hover:text-amber-400">
                    Advocate Directory
                  </button>
                </li>
                <li>
                  <button onClick={() => { loginAsRole('CLIENT'); window.location.hash = '#/client/cases'; }} className="hover:text-amber-400">
                    My Cases Archive
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">Legal Pillars</h4>
              <ul className="space-y-2 text-xs text-slate-400 font-medium">
                <li>Evidence-Grounded AI</li>
                <li>India-Focused Statutory Acts</li>
                <li>High Court Precedents</li>
                <li>Client Privacy Protected</li>
              </ul>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
            <div>© 2026 NYAYAI Legal Technology. All rights reserved.</div>
            <div className="mt-4 sm:mt-0 text-[11px] text-slate-400">
              Disclaimer: NYAYAI provides legal information & intelligence; it does not constitute formal legal representation.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
