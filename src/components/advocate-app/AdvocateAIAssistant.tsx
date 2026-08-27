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
    <div className="flex-1 bg-warm-white text-slate-900 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded border border-amber-200">
            Professional Lawyer Suite
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Advocate AI Legal Co-Counsel</h1>
        </div>
        <div className="text-xs text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Groq-Powered Backend Assistant</span>
        </div>
      </div>

      {/* TOOL SWITCHER TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
        <button
          onClick={() => setActiveTool('drafting')}
          className={`p-3.5 rounded-2xl border transition-smooth text-left space-y-1 ${
            activeTool === 'drafting'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-card'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 mb-1 text-slate-900" />
          <div>Drafting Assistance</div>
          <p className="text-[10px] opacity-80 font-normal">Notices, Petitions, Applications</p>
        </button>

        <button
          onClick={() => setActiveTool('timeline')}
          className={`p-3.5 rounded-2xl border transition-smooth text-left space-y-1 ${
            activeTool === 'timeline'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-card'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4 mb-1 text-slate-900" />
          <div>Case Timeline Generator</div>
          <p className="text-[10px] opacity-80 font-normal">Chronology of Facts & Dates</p>
        </button>

        <button
          onClick={() => setActiveTool('extraction')}
          className={`p-3.5 rounded-2xl border transition-smooth text-left space-y-1 ${
            activeTool === 'extraction'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-card'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4 mb-1 text-slate-900" />
          <div>Fact & Obligation Extractor</div>
          <p className="text-[10px] opacity-80 font-normal">Extract Parties, Liabilities & Risk</p>
        </button>

        <button
          onClick={() => setActiveTool('research')}
          className={`p-3.5 rounded-2xl border transition-smooth text-left space-y-1 ${
            activeTool === 'research'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-card'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-1 text-slate-900" />
          <div>High Court Precedent Research</div>
          <p className="text-[10px] opacity-80 font-normal">Statutory Ratios & Citations</p>
        </button>
      </div>

      {/* INPUT FORM */}
      <form onSubmit={handleGenerate} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-amber-700" />
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
          className="w-full bg-warm-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-950 leading-relaxed font-mono"
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500 font-mono">
            ★ Powered by NYAYAI Express Backend & Groq AI
          </span>

          <button
            type="submit"
            disabled={loading}
            className="bg-slate-950 hover:bg-slate-900 text-amber-400 font-extrabold text-xs px-6 py-3 rounded-xl shadow transition-smooth flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
            <span>{loading ? 'Analyzing...' : 'Generate Legal Work Product'}</span>
          </button>
        </div>
      </form>

      {/* OUTPUT WORKSPACE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Generated Legal Work Product
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-smooth flex items-center gap-1 border border-slate-200"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-warm-white rounded-2xl border border-slate-200 font-mono text-xs leading-relaxed text-slate-900 whitespace-pre-line">
          {output}
        </div>
      </div>

    </div>
  );
};
