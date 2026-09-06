import React, { useState } from 'react';
import { Cpu, FileText, Sparkles, BookOpen, Clock, Calendar, Layers, Copy, Check } from 'lucide-react';
import { sendAdvocateAIChat } from '../../services/api';

export const AdvocateAIAssistant: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'drafting' | 'timeline' | 'extraction' | 'research'>('drafting');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [output, setOutput] = useState<string>(`### LAWYER DRAFTING & RESEARCH CO-COUNSEL

**Draft Legal Notice Summary:**
- **Statutory Provisions:** Code of Civil Procedure 1908 Section 80 / Specific Relief Act Section 38.
- **Key Facts Identified:** Possession delay exceeding 22 months without force majeure.
- **Relief Claimed:** Mandatory refund of ₹48,50,000 + interest at 10.25% p.a.

**Suggested Court Precedents:**
1. *M/s Fortune Infrastructure v. Trevor D'Lima (2018 5 SCC 442)* — Purchaser cannot be compelled to wait indefinitely for possession.
2. *Pioneer Urban Land & Infrastructure Ltd. v. Govindan Raghavan (2019 5 SCC 725)* — Asymmetrical delay penalty clauses in builder agreements constitute unfair trade practice.`);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const res = await sendAdvocateAIChat(activeTool, prompt);
      setOutput(res.output);
    } catch (err) {
      console.warn('Advocate AI API error fallback:', err);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 font-sans">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Professional Lawyer Suite
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">Advocate AI Legal Co-Counsel</h1>
        </div>
        <div className="text-xs text-[#0B1024] bg-white px-3 py-1.5 rounded-lg border border-[#0B1024]/8 flex items-center gap-1.5 shadow-2xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#C88A32]" />
          <span>AI Legal Assistant</span>
        </div>
      </div>

      {/* TOOL SWITCHER TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
        <button
          onClick={() => setActiveTool('drafting')}
          className={`p-3.5 rounded-2xl border transition-all text-left space-y-1 cursor-pointer ${
            activeTool === 'drafting'
              ? 'bg-[#D89947] text-[#0B1024] border-[#D89947] shadow-xs'
              : 'bg-white text-[#4F586B] border-[#0B1024]/8 hover:bg-[#FAF6EE]'
          }`}
        >
          <FileText className="w-4 h-4 mb-1 text-[#0B1024]" />
          <div className="font-bold text-[#0B1024]">Drafting Assistance</div>
          <p className="text-[10px] opacity-80 font-normal">Notices, Petitions, Applications</p>
        </button>

        <button
          onClick={() => setActiveTool('timeline')}
          className={`p-3.5 rounded-2xl border transition-all text-left space-y-1 cursor-pointer ${
            activeTool === 'timeline'
              ? 'bg-[#D89947] text-[#0B1024] border-[#D89947] shadow-xs'
              : 'bg-white text-[#4F586B] border-[#0B1024]/8 hover:bg-[#FAF6EE]'
          }`}
        >
          <Calendar className="w-4 h-4 mb-1 text-[#0B1024]" />
          <div className="font-bold text-[#0B1024]">Case Timeline Generator</div>
          <p className="text-[10px] opacity-80 font-normal">Chronology of Facts & Dates</p>
        </button>

        <button
          onClick={() => setActiveTool('extraction')}
          className={`p-3.5 rounded-2xl border transition-all text-left space-y-1 cursor-pointer ${
            activeTool === 'extraction'
              ? 'bg-[#D89947] text-[#0B1024] border-[#D89947] shadow-xs'
              : 'bg-white text-[#4F586B] border-[#0B1024]/8 hover:bg-[#FAF6EE]'
          }`}
        >
          <Layers className="w-4 h-4 mb-1 text-[#0B1024]" />
          <div className="font-bold text-[#0B1024]">Fact & Obligation Extractor</div>
          <p className="text-[10px] opacity-80 font-normal">Extract Parties, Liabilities & Risk</p>
        </button>

        <button
          onClick={() => setActiveTool('research')}
          className={`p-3.5 rounded-2xl border transition-all text-left space-y-1 cursor-pointer ${
            activeTool === 'research'
              ? 'bg-[#D89947] text-[#0B1024] border-[#D89947] shadow-xs'
              : 'bg-white text-[#4F586B] border-[#0B1024]/8 hover:bg-[#FAF6EE]'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-1 text-[#0B1024]" />
          <div className="font-bold text-[#0B1024]">High Court Precedent Research</div>
          <p className="text-[10px] opacity-80 font-normal">Statutory Ratios & Citations</p>
        </button>
      </div>

      {/* INPUT FORM */}
      <form onSubmit={handleGenerate} className="bg-white p-6 rounded-3xl border border-[#0B1024]/8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-[#0B1024] uppercase tracking-wider flex items-center gap-1.5 font-serif">
            <Cpu className="w-4 h-4 text-[#C88A32]" />
            <span>
              {activeTool === 'drafting' && 'Generate Legal Notice / Interlocutory Petition Draft'}
              {activeTool === 'timeline' && 'Generate Fact Chronology Timeline'}
              {activeTool === 'extraction' && 'Extract Key Obligations & Contractual Risks'}
              {activeTool === 'research' && 'Search High Court Precedent Ratios'}
            </span>
          </label>
        </div>

        <textarea
          rows={4}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={
            activeTool === 'drafting' ? 'e.g. Draft a legal notice for ₹48 Lakhs refund under RERA Section 18 for delayed possession in Bengaluru...' :
            activeTool === 'timeline' ? 'e.g. Create chronology of events from FIR filed on 10th Jan to arrest warrant on 14th Feb...' :
            'Describe the legal matter or paste document excerpt...'
          }
          className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-2xl p-4 text-xs text-[#0B1024] focus:outline-none focus:border-[#D89947] leading-relaxed font-mono"
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-[#4F586B] font-mono">
            ★ Powered by NYAYAI Legal Intelligence
          </span>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs px-6 py-3 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Clock className="w-4 h-4 animate-spin text-[#0B1024]" /> : <Sparkles className="w-4 h-4 text-[#0B1024]" />}
            <span>{loading ? 'Analyzing...' : 'Generate Legal Work Product'}</span>
          </button>
        </div>
      </form>

      {/* OUTPUT WORKSPACE */}
      <div className="bg-white rounded-3xl border border-[#0B1024]/8 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#0B1024]/5 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1024] font-serif">
            Generated Legal Work Product
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#FAF6EE] text-[#0B1024] text-xs font-bold rounded-lg transition-all flex items-center gap-1 border border-[#0B1024]/10 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#0B1024]" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#0B1024]/8 font-mono text-xs leading-relaxed text-[#0B1024] whitespace-pre-line">
          {output}
        </div>
      </div>

    </div>
  );
};
