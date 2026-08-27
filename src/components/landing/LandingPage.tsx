import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileCheck2, ArrowRight, Sparkles, Scale, CheckCircle2, ChevronRight, ShieldCheck, ArrowUpRight, UserCheck, Briefcase, MapPin, BookOpen, Network, FileText } from 'lucide-react';
import { useCaseContext } from '../../context/CaseContext';

export const LandingPage: React.FC = () => {
  const { openMatchEvidenceModal } = useCaseContext();
  const { loginAsRole } = useAuth();
  
  // Interactive Live Intelligence Graph Active Node Tooltip
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Interactive Live Case Engine Demo State (Section 3)
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

  const graphNodes = [
    { id: 'facts', label: 'Case Facts', x: 110, y: 95, icon: FileText, detail: 'Neighbour altercation & private setback passage' },
    { id: 'docs', label: 'Documents', x: 260, y: 55, icon: FileCheck2, detail: 'Police CSR No. 184/2026 & Site Plan PDF' },
    { id: 'statutes', label: 'Statutes', x: 410, y: 95, icon: Scale, detail: 'BNS 2023 §351, CrPC §482, Order 39 Rule 1' },
    { id: 'jurisdiction', label: 'Jurisdiction', x: 440, y: 210, icon: MapPin, detail: 'Bengaluru (Karnataka High Court)' },
    { id: 'precedents', label: 'High Court Precedents', x: 385, y: 310, icon: BookOpen, detail: 'State of Kar v. S. Kumar (Quashed §506)' },
    { id: 'cases', label: 'Similar Cases', x: 135, y: 310, icon: Network, detail: '42 Boundary Injunction & Quashing Petitions' },
    { id: 'advocates', label: 'Advocate Match', x: 80, y: 210, icon: UserCheck, detail: 'Adv. Rajesh Varma (87% Match Confidence)', isHighlight: true }
  ];

  const activeNodeInfo = graphNodes.find(n => n.id === hoveredNode);

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

            {/* HERO VISUAL (RIGHT) — LIVE LEGAL INTELLIGENCE GRAPH */}
            <div className="lg:col-span-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                
                {/* Back Decorative Subtle Shadow Accent */}
                <div className="absolute -top-3 -right-3 w-full h-full bg-slate-200/50 rounded-3xl transform rotate-1 pointer-events-none" />

                {/* MAIN LIVE GRAPH CARD */}
                <div className="relative bg-white rounded-3xl border border-slate-200 shadow-floating p-5 sm:p-6 space-y-4 overflow-hidden">
                  
                  {/* Top Bar with Live Status Indicator */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shadow-xs">
                        <Scale className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 tracking-tight">NYAYAI Intelligence Graph</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                      </span>
                      <span>● LIVE CASE ANALYSIS</span>
                    </div>
                  </div>

                  {/* SVG GRAPH ANIMATION CANVAS */}
                  <div className="relative bg-warm-white/70 rounded-2xl border border-slate-200/80 p-2 overflow-hidden select-none">
                    
                    {/* SVG GRAPH NETWORK */}
                    <svg viewBox="0 0 520 370" className="w-full h-auto drop-shadow-xs">
                      
                      {/* Central Ambient Pulse Glow */}
                      <circle cx="260" cy="190" r="70" className="fill-amber-400/10 animate-pulse" />
                      <circle cx="260" cy="190" r="110" className="fill-indigo-950/5 animate-pulse duration-1000" />

                      {/* CONNECTING LINES & ANIMATED DATA PARTICLES */}
                      {graphNodes.map((node) => {
                        const isHovered = hoveredNode === node.id;
                        const isHighlighted = node.isHighlight;

                        return (
                          <g key={`link-${node.id}`}>
                            {/* Base Connection Line */}
                            <line
                              x1="260"
                              y1="190"
                              x2={node.x}
                              y2={node.y}
                              stroke={isHovered ? '#D97706' : isHighlighted ? '#D97706' : '#cbd5e1'}
                              strokeWidth={isHovered || isHighlighted ? '2.5' : '1.5'}
                              strokeDasharray={isHovered ? 'none' : '4 4'}
                              className="transition-all duration-300"
                            />

                            {/* Animated Moving Data Particle */}
                            <circle r="3" fill={isHighlighted || isHovered ? '#D97706' : '#0F172A'}>
                              <animateMotion
                                path={`M 260 190 L ${node.x} ${node.y} Z`}
                                dur={`${3 + (node.x % 3)}s`}
                                repeatCount="indefinite"
                              />
                            </circle>

                            {/* Reverse Flow Data Particle */}
                            <circle r="2" fill="#D97706">
                              <animateMotion
                                path={`M ${node.x} ${node.y} L 260 190 Z`}
                                dur={`${4 + (node.y % 2)}s`}
                                repeatCount="indefinite"
                              />
                            </circle>
                          </g>
                        );
                      })}

                      {/* SURROUNDING CONNECTED NODES */}
                      {graphNodes.map((node) => {
                        const Icon = node.icon;
                        const isHovered = hoveredNode === node.id;
                        const isHighlight = node.isHighlight;

                        return (
                          <g
                            key={node.id}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            className="cursor-pointer group"
                          >
                            {/* Outer Pulse Ring on Hover/Highlight */}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={isHovered ? '24' : '20'}
                              fill={isHighlight ? '#FEF3C7' : isHovered ? '#EEF2FF' : '#FFFFFF'}
                              stroke={isHighlight ? '#D97706' : isHovered ? '#4338CA' : '#94A3B8'}
                              strokeWidth={isHighlight || isHovered ? '2' : '1'}
                              className="transition-all duration-200 shadow-xs"
                            />

                            {/* Node Label Card Overlay */}
                            <foreignObject
                              x={node.x - 55}
                              y={node.y + 22}
                              width="110"
                              height="32"
                            >
                              <div className={`text-[10px] font-extrabold text-center px-1.5 py-0.5 rounded-md border shadow-xs transition-all duration-200 truncate ${
                                isHighlight
                                  ? 'bg-slate-900 text-amber-400 border-slate-800'
                                  : isHovered
                                  ? 'bg-indigo-950 text-white border-indigo-900'
                                  : 'bg-white text-slate-800 border-slate-200'
                              }`}>
                                {node.label}
                              </div>
                            </foreignObject>

                            {/* Node Center Icon Render via HTML inside SVG */}
                            <foreignObject
                              x={node.x - 10}
                              y={node.y - 10}
                              width="20"
                              height="20"
                            >
                              <div className="w-full h-full flex items-center justify-center pointer-events-none">
                                <Icon className={`w-4 h-4 ${isHighlight ? 'text-amber-600' : isHovered ? 'text-indigo-900' : 'text-slate-700'}`} />
                              </div>
                            </foreignObject>
                          </g>
                        );
                      })}

                      {/* CENTRAL NODE: NYAYAI CASE */}
                      <g className="select-none">
                        {/* Outer Glow Ring */}
                        <circle cx="260" cy="190" r="38" className="fill-slate-900 stroke-amber-400 stroke-[3] shadow-card" />
                        <circle cx="260" cy="190" r="44" className="fill-none stroke-amber-400/40 stroke-2 animate-pulse" />

                        {/* Central Label HTML */}
                        <foreignObject x="210" y="165" width="100" height="50">
                          <div className="w-full h-full flex flex-col items-center justify-center text-center">
                            <Scale className="w-4 h-4 text-amber-400 mb-0.5" />
                            <span className="text-[11px] font-black tracking-wider text-white uppercase leading-none">
                              NYAYAI
                            </span>
                            <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest mt-0.5">
                              CASE
                            </span>
                          </div>
                        </foreignObject>
                      </g>

                    </svg>

                    {/* HOVER TOOLTIP DETAIL BADGE */}
                    {activeNodeInfo && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-medium px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-card animate-in fade-in duration-150 flex items-center space-x-2 z-20">
                        <span className="font-bold text-amber-400">{activeNodeInfo.label}:</span>
                        <span className="text-slate-300">{activeNodeInfo.detail}</span>
                      </div>
                    )}

                  </div>

                  {/* FLOATING INTELLIGENCE PANEL */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-card flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" /> CASE ANALYSIS
                      </div>
                      <div className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                        <span>24 Relevant Precedents</span>
                        <span className="text-slate-600">•</span>
                        <span>7 Statutory References</span>
                      </div>
                    </div>

                    <div className="text-right border-l border-slate-800 pl-4">
                      <div className="text-xs font-black text-amber-300">3 Advocate Matches</div>
                      <div className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80 mt-0.5 inline-block">
                        91% Match Confidence
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2 — CORE METHODOLOGY ARCHITECTURE */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              System Architecture & Methodology
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Grounded legal intelligence, step by step.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              NYAYAI combines multi-turn natural language intake, document analysis, and court precedent indexing to guide citizens and counsel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Step 1 */}
            <div className="bg-warm-white p-7 rounded-3xl border border-slate-200 space-y-4 hover:border-slate-300 transition-smooth">
              <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-950">1. Natural Conversational Intake</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Describe your concern naturally. NYAYAI structures your incident facts, timeline, location, and legal matter without requiring formal legal jargon.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-warm-white p-7 rounded-3xl border border-slate-200 space-y-4 hover:border-slate-300 transition-smooth">
              <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-950">2. Deterministic Case Readiness</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Tracks a 15-parameter completeness index (0–100%) so you know exactly what facts or documents are missing before consulting an advocate.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-warm-white p-7 rounded-3xl border border-slate-200 space-y-4 hover:border-slate-300 transition-smooth">
              <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-950">3. Precedent Advocate Discovery</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Matches your case with verified Advocates based on High Court precedent experience, geographical jurisdiction, and domain specialization.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 3 — INTERACTIVE LIVE DEMO INSPECTOR */}
      <section className="py-20 bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                Interactive Methodology Demonstrator
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mt-2">
                Explore real case intelligence flows.
              </h2>
            </div>

            {/* CASE SELECTOR TABS */}
            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-subtle">
              {demoCases.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveDemoCase(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-smooth ${
                    activeDemoCase === idx
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  Case 0{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE DEMO DISPLAY CARD */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                  {currentDemo.practiceArea}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {currentDemo.jurisdiction}
                </span>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-950">
                {currentDemo.title}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80 font-medium">
                "{currentDemo.sanitizedSummary}"
              </p>

              {/* Statutory Framework */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Relevant Indian Statutory Framework
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentDemo.statutes.map((st, i) => (
                    <span key={i} className="text-xs font-bold text-slate-900 bg-warm-white px-3 py-1 rounded-xl border border-slate-300">
                      {st}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Matched Advocate Right Panel */}
            <div className="lg:col-span-5 bg-slate-950 text-white p-6 rounded-3xl space-y-4 shadow-card">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
                <span className="font-extrabold text-amber-400 uppercase tracking-wider">Top Precedent Match</span>
                <span className="font-bold text-emerald-400">{currentDemo.matchedAdvocate.matchScore}% Match Score</span>
              </div>

              <div className="flex items-center space-x-3">
                <img
                  src={currentDemo.matchedAdvocate.avatar}
                  alt={currentDemo.matchedAdvocate.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-400/40"
                />
                <div>
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <span>{currentDemo.matchedAdvocate.name}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </h4>
                  <p className="text-xs text-slate-400">{currentDemo.matchedAdvocate.title}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                {currentDemo.matchedAdvocate.whyMatch.map((reason, i) => (
                  <div key={i} className="flex items-start space-x-2 text-[11px]">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => openMatchEvidenceModal(currentDemo.matchedAdvocate as any)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-smooth flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <span>Inspect Match Evidence</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-white text-sm">NYAYAI</span>
            <span className="text-slate-600">|</span>
            <span>Grounded Indian Legal Intelligence & Advocate Discovery</span>
          </div>
          <div className="text-slate-500 font-medium">
            Strictly grounded under BNS (2023), BNSS (2023), RERA (2016) & High Court Precedents
          </div>
        </div>
      </footer>

    </div>
  );
};
