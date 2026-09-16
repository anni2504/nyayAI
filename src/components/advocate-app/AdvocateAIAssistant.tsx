import React, { useState, useEffect } from 'react';
import {
  Cpu,
  FileText,
  Sparkles,
  BookOpen,
  Clock,
  Calendar,
  Layers,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import {
  sendAdvocateAIChat,
  openCorpusPdf,
  fetchAdvocateCaseHistory
} from '../../services/api';
import type {
  AdvocateCaseHistoryRecord,
  AdvocateLegalDraftData,
  AdvocateTimelineData,
  AdvocateExtractionData,
  AdvocatePrecedentData
} from '../../services/api';

type ToolType = 'drafting' | 'timeline' | 'extraction' | 'research';

export const AdvocateAIAssistant: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('drafting');
  const [prompt, setPrompt] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [availableCases, setAvailableCases] = useState<AdvocateCaseHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingDocKey, setOpeningDocKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active structured output data
  const [draftData, setDraftData] = useState<AdvocateLegalDraftData | null>(null);
  const [timelineData, setTimelineData] = useState<AdvocateTimelineData | null>(null);
  const [extractionData, setExtractionData] = useState<AdvocateExtractionData | null>(null);
  const [precedentData, setPrecedentData] = useState<AdvocatePrecedentData | null>(null);
  const [rawOutput, setRawOutput] = useState<string>(`### LAWYER DRAFTING & RESEARCH CO-COUNSEL

**Draft Legal Notice Summary:**
- **Statutory Provisions:** Code of Civil Procedure 1908 Section 80 / Specific Relief Act Section 38.
- **Key Facts Identified:** Possession delay exceeding 22 months without force majeure.
- **Relief Claimed:** Mandatory refund of ₹48,50,000 + interest at 10.25% p.a.

**Suggested Court Precedents:**
1. *M/s Fortune Infrastructure v. Trevor D'Lima (2018 5 SCC 442)* — Purchaser cannot be compelled to wait indefinitely for possession.
2. *Pioneer Urban Land & Infrastructure Ltd. v. Govindan Raghavan (2019 5 SCC 725)* — Asymmetrical delay penalty clauses in builder agreements constitute unfair trade practice.`);

  // Load available advocate cases for context selection
  useEffect(() => {
    fetchAdvocateCaseHistory()
      .then(res => {
        if (res.success && Array.isArray(res.records)) {
          setAvailableCases(res.records);
        }
      })
      .catch(() => {
        // non-blocking
      });
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      setErrorMessage('Please enter a query or case facts to generate a legal work product.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await sendAdvocateAIChat(activeTool, prompt, selectedCaseId || undefined);
      setRawOutput(res.output);

      if (res.data) {
        if (activeTool === 'drafting') {
          setDraftData(res.data as AdvocateLegalDraftData);
        } else if (activeTool === 'timeline') {
          setTimelineData(res.data as AdvocateTimelineData);
        } else if (activeTool === 'extraction') {
          setExtractionData(res.data as AdvocateExtractionData);
        } else if (activeTool === 'research') {
          setPrecedentData(res.data as AdvocatePrecedentData);
        }
      }
    } catch (err: any) {
      console.warn('Advocate AI API error:', err);
      setErrorMessage(err.message || 'Unable to complete AI legal analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    let textToCopy = rawOutput;
    if (activeTool === 'drafting' && draftData?.draftLanguage) {
      textToCopy = `${draftData.documentType}\n\n${draftData.matterSummary}\n\n${draftData.draftLanguage}\n\nDISCLAIMER:\n${draftData.disclaimer}`;
    } else if (activeTool === 'timeline' && timelineData?.formattedText) {
      textToCopy = timelineData.formattedText;
    } else if (activeTool === 'extraction' && extractionData?.formattedText) {
      textToCopy = extractionData.formattedText;
    } else if (activeTool === 'research' && precedentData?.formattedText) {
      textToCopy = precedentData.formattedText;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setDraftData(null);
    setTimelineData(null);
    setExtractionData(null);
    setPrecedentData(null);
    setRawOutput('');
    setErrorMessage(null);
  };

  const handleOpenDoc = async (key?: string | null) => {
    if (!key) return;
    setOpeningDocKey(key);
    try {
      const result = await openCorpusPdf(key);
      if (!result.ok) {
        alert(result.error || 'Failed to open source document.');
      }
    } catch (err: any) {
      alert(`Error opening document: ${err.message}`);
    } finally {
      setOpeningDocKey(null);
    }
  };

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#0B1024]/8 pb-4 gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Professional Lawyer Suite
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">Advocate AI Legal Co-Counsel</h1>
        </div>
        <div className="text-xs text-[#0B1024] bg-white px-3 py-1.5 rounded-lg border border-[#0B1024]/8 flex items-center gap-1.5 shadow-2xs font-bold self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-[#C88A32]" />
          <span>Evidence-Grounded Legal Intelligence</span>
        </div>
      </div>

      {/* TOOL SWITCHER TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
        <button
          onClick={() => {
            setActiveTool('drafting');
            setErrorMessage(null);
          }}
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
          onClick={() => {
            setActiveTool('timeline');
            setErrorMessage(null);
          }}
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
          onClick={() => {
            setActiveTool('extraction');
            setErrorMessage(null);
          }}
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
          onClick={() => {
            setActiveTool('research');
            setErrorMessage(null);
          }}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-extrabold text-[#0B1024] uppercase tracking-wider flex items-center gap-1.5 font-serif">
            <Cpu className="w-4 h-4 text-[#C88A32]" />
            <span>
              {activeTool === 'drafting' && 'Generate Legal Notice / Interlocutory Petition Draft'}
              {activeTool === 'timeline' && 'Generate Fact Chronology Timeline'}
              {activeTool === 'extraction' && 'Extract Key Obligations & Contractual Risks'}
              {activeTool === 'research' && 'Search High Court Precedent Ratios'}
            </span>
          </label>

          {/* Optional Case Context Selection */}
          {availableCases.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <FolderOpen className="w-3.5 h-3.5 text-[#C88A32]" />
              <select
                value={selectedCaseId}
                onChange={e => setSelectedCaseId(e.target.value)}
                className="bg-[#FAF8F5] border border-[#0B1024]/15 rounded-lg px-2.5 py-1 text-xs text-[#0B1024] focus:outline-none focus:border-[#D89947]"
              >
                <option value="">Case Context: Free-form prompt (No case selected)</option>
                {availableCases.map(c => (
                  <option key={c.id} value={c.id}>
                    Case: {c.case_title} ({c.year || 'Ongoing'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <textarea
          rows={4}
          value={prompt}
          onChange={e => {
            setPrompt(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder={
            activeTool === 'drafting'
              ? 'e.g. Draft a legal notice for ₹48 lakhs refund under RERA Section 18 for delayed possession in Bengaluru...'
              : activeTool === 'timeline'
              ? 'e.g. Agreement signed on 12 March 2024. Payment made on 20 March. Notice sent on 15 June. Builder failed to respond. Complaint filed on 2 August.'
              : activeTool === 'extraction'
              ? 'e.g. Paste agreement text, contractual terms, notice, or case summary to extract facts, obligations, and legal risks...'
              : 'e.g. Find High Court decisions relating to delayed possession and builder refund under RERA...'
          }
          className="w-full bg-[#FAF8F5] border border-[#0B1024]/15 rounded-2xl p-4 text-xs text-[#0B1024] focus:outline-none focus:border-[#D89947] leading-relaxed font-mono"
        />

        {errorMessage && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-[#4F586B] font-mono">
            ★ Powered by NYAYAI Legal Intelligence & C++ Vector DB
          </span>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs px-6 py-3 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Clock className="w-4 h-4 animate-spin text-[#0B1024]" /> : <Sparkles className="w-4 h-4 text-[#0B1024]" />}
            <span>
              {loading
                ? 'Analyzing...'
                : activeTool === 'drafting'
                ? 'Generate Legal Work Product'
                : activeTool === 'timeline'
                ? 'Generate Case Timeline'
                : activeTool === 'extraction'
                ? 'Extract Facts & Obligations'
                : 'Search High Court Precedents'}
            </span>
          </button>
        </div>
      </form>

      {/* OUTPUT WORKSPACE */}
      <div className="bg-white rounded-3xl border border-[#0B1024]/8 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#0B1024]/5 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#C88A32]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1024] font-serif">
              Generated Legal Work Product
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !prompt.trim()}
              title="Regenerate"
              className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#FAF6EE] text-[#0B1024] text-xs font-bold rounded-lg transition-all flex items-center gap-1 border border-[#0B1024]/10 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0B1024]" />
              <span className="hidden sm:inline">Regenerate</span>
            </button>

            <button
              onClick={handleClear}
              title="Clear output"
              className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-rose-50 text-[#0B1024] hover:text-rose-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 border border-[#0B1024]/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#FAF6EE] text-[#0B1024] text-xs font-bold rounded-lg transition-all flex items-center gap-1 border border-[#0B1024]/10 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#0B1024]" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="p-8 bg-[#FAF8F5] rounded-2xl border border-[#0B1024]/8 flex flex-col items-center justify-center space-y-3">
            <Clock className="w-6 h-6 animate-spin text-[#C88A32]" />
            <p className="text-xs font-bold text-[#0B1024]">
              {activeTool === 'drafting' && 'Drafting legal work product and verifying statutory provisions...'}
              {activeTool === 'timeline' && 'Extracting chronological sequence and structuring dates...'}
              {activeTool === 'extraction' && 'Categorizing confirmed facts, obligations, and legal risks...'}
              {activeTool === 'research' && 'Querying C++ Vector DB and retrieving precedent authorities...'}
            </p>
            <span className="text-[11px] text-[#4F586B]">NYAYAI is grounding findings in verified Indian legal sources</span>
          </div>
        )}

        {/* STRUCTURED RENDERER: DRAFTING */}
        {!loading && activeTool === 'drafting' && draftData && (
          <div className="space-y-4">
            <div className="p-4 bg-[#FAF6EE] rounded-2xl border border-[#C88A32]/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C88A32] block">
                  Document Type
                </span>
                <h3 className="text-sm font-extrabold text-[#0B1024] mt-0.5">{draftData.documentType}</h3>
              </div>
              <span className="px-2.5 py-1 bg-white rounded-lg border border-[#0B1024]/10 text-[11px] font-bold text-[#0B1024]">
                AI-Assisted Legal Draft
              </span>
            </div>

            {/* Matter Summary */}
            {draftData.matterSummary && (
              <div className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F586B]">Matter Summary</span>
                <p className="text-xs text-[#0B1024] leading-relaxed">{draftData.matterSummary}</p>
              </div>
            )}

            {/* Applicable Legal Provisions */}
            {draftData.applicableLegalProvisions?.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F586B]">Applicable Legal Provisions</span>
                <div className="flex flex-wrap gap-2">
                  {draftData.applicableLegalProvisions.map((prov, i) => (
                    <span key={i} className="px-2.5 py-1 bg-[#FAF6EE] border border-[#C88A32]/30 rounded-lg text-xs font-semibold text-[#0B1024]">
                      § {prov}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Grounds & Arguments */}
            {draftData.argumentsGrounds?.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F586B]">Arguments & Grounds</span>
                <ul className="space-y-1.5 text-xs text-[#0B1024]">
                  {draftData.argumentsGrounds.map((arg, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-bold text-[#C88A32]">{i + 1}.</span>
                      <span>{arg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Relief / Prayer */}
            {draftData.reliefPrayer?.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F586B]">Relief / Prayer Sought</span>
                <ul className="space-y-1.5 text-xs text-[#0B1024]">
                  {draftData.reliefPrayer.map((rel, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{rel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Draft / Suggested Language */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F586B]">
                Suggested Formal Draft Text
              </span>
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#0B1024]/8 font-mono text-xs leading-relaxed text-[#0B1024] whitespace-pre-line select-text">
                {draftData.draftLanguage}
              </div>
            </div>

            {/* Important Considerations */}
            {draftData.importantConsiderations?.length > 0 && (
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1.5 text-xs text-amber-950">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Important Procedural Considerations
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {draftData.importantConsiderations.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 italic">
              {draftData.disclaimer}
            </div>
          </div>
        )}

        {/* STRUCTURED RENDERER: TIMELINE */}
        {!loading && activeTool === 'timeline' && timelineData && (
          <div className="space-y-4">
            <div className="p-4 bg-[#FAF6EE] rounded-2xl border border-[#C88A32]/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C88A32] block">
                  Case Timeline
                </span>
                <h3 className="text-sm font-extrabold text-[#0B1024] mt-0.5">{timelineData.matterTitle || 'Chronological Event Sequence'}</h3>
              </div>
              <span className="px-2.5 py-1 bg-white rounded-lg border border-[#0B1024]/10 text-[11px] font-bold text-[#0B1024]">
                {timelineData.events.length} Events Extracted
              </span>
            </div>

            {/* Vertical Timeline */}
            <div className="relative border-l-2 border-[#D89947]/40 ml-4 pl-6 space-y-4 py-2">
              {timelineData.events.map((ev, i) => (
                <div key={i} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#D89947] border-2 border-white shadow-xs" />
                  <div className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-1 hover:border-[#D89947]/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#0B1024] font-mono bg-[#FAF6EE] px-2 py-0.5 rounded border border-[#C88A32]/20">
                        {ev.date}
                      </span>
                      {ev.isUncertain && (
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {ev.uncertaintyNote || 'Date Uncertain'}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-[#0B1024] pt-1">{ev.title}</h4>
                    {ev.description && ev.description !== ev.title && (
                      <p className="text-xs text-[#4F586B] leading-relaxed">{ev.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Uncertainties / Gaps */}
            {timelineData.uncertainties?.length > 0 && (
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1 text-xs text-amber-950">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Identified Date Gaps & Limitations
                </span>
                <ul className="list-disc list-inside space-y-1">
                  {timelineData.uncertainties.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 italic">
              {timelineData.disclaimer}
            </div>
          </div>
        )}

        {/* STRUCTURED RENDERER: EXTRACTION */}
        {!loading && activeTool === 'extraction' && extractionData && (
          <div className="space-y-4">
            {/* Confirmed Facts */}
            <div className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B1024] font-serif flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Confirmed Facts from Record ({extractionData.confirmedFacts?.length || 0})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                  CONFIRMED
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {extractionData.confirmedFacts?.map((f, i) => (
                  <div key={i} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 space-y-1">
                    <span className="text-[10px] font-bold text-[#C88A32] uppercase">{f.category || 'Fact'}</span>
                    <p className="text-xs text-[#0B1024] font-medium leading-relaxed">{f.fact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Inferred Obligations */}
            <div className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B1024] font-serif flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-[#C88A32]" />
                  Obligations & Liabilities ({extractionData.inferredObligations?.length || 0})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200">
                  REQUIRES REVIEW
                </span>
              </div>
              <div className="space-y-2">
                {extractionData.inferredObligations?.map((ob, i) => (
                  <div key={i} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-[#0B1024]">{ob.party}: </span>
                      <span className="text-[#4F586B]">{ob.obligation}</span>
                    </div>
                    {ob.deadline && (
                      <span className="text-[11px] font-mono text-[#0B1024] bg-white px-2 py-0.5 rounded border border-[#0B1024]/10 shrink-0">
                        Due: {ob.deadline}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Risks & Issues */}
            <div className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B1024] font-serif flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Legal Risks & Potential Breaches ({extractionData.risksAndIssues?.length || 0})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-800 rounded border border-rose-200">
                  RISK EVALUATION
                </span>
              </div>
              <div className="space-y-2">
                {extractionData.risksAndIssues?.map((rk, i) => (
                  <div key={i} className="p-3 bg-rose-50/40 rounded-xl border border-rose-200/60 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-950">{rk.issue}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        rk.severity === 'HIGH' ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {rk.severity} SEVERITY
                      </span>
                    </div>
                    {rk.impact && <p className="text-xs text-rose-900/80">Impact: {rk.impact}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Information */}
            {extractionData.missingInformation?.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                  Missing Information / Unverified Facts
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {extractionData.missingInformation.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 italic">
              {extractionData.disclaimer}
            </div>
          </div>
        )}

        {/* STRUCTURED RENDERER: PRECEDENT RESEARCH */}
        {!loading && activeTool === 'research' && precedentData && (
          <div className="space-y-5">
            {/* AI Analysis & Synthesis */}
            <div className="p-5 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans inline-block">
                AI Research Analysis & Synthesis
              </span>
              <div className="text-xs text-[#0B1024] leading-relaxed whitespace-pre-line font-mono pt-1">
                {precedentData.analysis}
              </div>
            </div>

            {/* Retrieved Evidence Header */}
            <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B1024] font-serif flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#C88A32]" />
                Retrieved Legal Authorities & Precedents ({precedentData.evidence?.length || 0})
              </span>
              <span className="text-[11px] font-mono text-[#4F586B]">
                C++ Vector DB • Cosine Similarity
              </span>
            </div>

            {/* Evidence Cards */}
            {precedentData.evidence?.length > 0 ? (
              <div className="space-y-3">
                {precedentData.evidence.map((ev, i) => (
                  <div
                    key={ev.chunk_id || i}
                    className="p-4 bg-white rounded-2xl border border-[#0B1024]/8 shadow-2xs hover:border-[#D89947]/40 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <span className="text-[10px] font-bold text-[#C88A32] uppercase">
                          [Source {i + 1}] {ev.court || 'Court'} {ev.year ? `(${ev.year})` : ''}
                        </span>
                        <h4 className="text-xs font-bold text-[#0B1024]">{ev.title || 'Legal Authority'}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {ev.similarity !== undefined && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[10px] font-bold">
                            {Math.round(ev.similarity * 100)}% Similarity
                          </span>
                        )}
                        {ev.s3_key && (
                          <button
                            onClick={() => handleOpenDoc(ev.s3_key)}
                            disabled={openingDocKey === ev.s3_key}
                            className="px-2.5 py-1 bg-[#FAF6EE] hover:bg-[#D89947] text-[#0B1024] text-[11px] font-bold rounded-lg border border-[#C88A32]/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {openingDocKey === ev.s3_key ? (
                              <Clock className="w-3 h-3 animate-spin" />
                            ) : (
                              <ExternalLink className="w-3 h-3" />
                            )}
                            <span>Open Source Document</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {(ev.act || ev.section) && (
                      <div className="text-[11px] font-semibold text-[#0B1024] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#0B1024]/5">
                        Statutory Reference: {ev.act || ''} {ev.section ? `• Section ${ev.section}` : ''}
                      </div>
                    )}

                    <p className="text-xs text-[#4F586B] font-mono leading-relaxed bg-[#FAF8F5] p-3 rounded-xl border border-[#0B1024]/5">
                      "{ev.text}"
                    </p>

                    <div className="text-[10px] text-[#4F586B] font-mono flex flex-wrap gap-x-4 gap-y-1">
                      <span>Doc ID: {ev.document_id}</span>
                      <span>Chunk: {ev.chunk_id}</span>
                      {ev.jurisdiction && <span>Jurisdiction: {ev.jurisdiction}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#0B1024]/8 text-center space-y-2">
                <p className="text-xs font-bold text-[#0B1024]">No direct precedent records found in the corpus.</p>
                <p className="text-[11px] text-[#4F586B]">NYAYAI will not hallucinate or fabricate case authorities.</p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 italic">
              {precedentData.disclaimer}
            </div>
          </div>
        )}

        {/* DEFAULT RAW PREVIEW (IF NO STRUCTURED DATA IS CURRENTLY ACTIVE) */}
        {!loading && !draftData && !timelineData && !extractionData && !precedentData && (
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#0B1024]/8 font-mono text-xs leading-relaxed text-[#0B1024] whitespace-pre-line">
            {rawOutput || 'Enter a request above and click generate to create a legal work product.'}
          </div>
        )}
      </div>

    </div>
  );
};
