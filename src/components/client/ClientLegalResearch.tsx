import React, { useState } from 'react';
import {
  searchLegalCorpus,
  askLegalResearch,
  fetchLegalStatus,
  type LegalSearchResponse,
  type LegalRagResponse,
  type LegalStackStatus,
  type LegalEvidence
} from '../../services/api';
import {
  Search,
  Sparkles,
  Scale,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Database,
  FileSearch
} from 'lucide-react';

type Tab = 'search' | 'rag';

const DOC_TYPE_OPTIONS = [
  { value: '', label: 'Any document type' },
  { value: 'judgment', label: 'Judgment' },
  { value: 'statute', label: 'Statute' },
  { value: 'constitution', label: 'Constitution' },
  { value: 'regulation', label: 'Regulation' }
];

const COURT_OPTIONS = [
  { value: '', label: 'Any court' },
  { value: 'Supreme Court', label: 'Supreme Court' },
  { value: 'High Court', label: 'High Court' }
];

export const ClientLegalResearch: React.FC = () => {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [court, setCourt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchRes, setSearchRes] = useState<LegalSearchResponse | null>(null);
  const [ragRes, setRagRes] = useState<LegalRagResponse | null>(null);
  const [status, setStatus] = useState<LegalStackStatus | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const loadStatus = async () => {
    try {
      const s = await fetchLegalStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  };

  React.useEffect(() => {
    loadStatus();
  }, []);

  const filters = {
    ...(documentType ? { document_type: documentType } : {}),
    ...(court ? { court } : {})
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setError('');
    setLoading(true);
    setRagRes(null);
    try {
      const res = await searchLegalCorpus(query.trim(), filters);
      setSearchRes(res);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setSearchRes(null);
    } finally {
      setLoading(false);
    }
  };

  const runRag = async () => {
    if (!query.trim()) return;
    setError('');
    setLoading(true);
    setSearchRes(null);
    try {
      const res = await askLegalResearch(query.trim(), filters);
      setRagRes(res);
    } catch (err: any) {
      setError(err.message || 'Research failed');
      setRagRes(null);
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    if (tab === 'search') runSearch();
    else runRag();
  };

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1.5 w-fit">
            <Scale className="w-3 h-3 text-amber-500" />
            <span>Legal Research</span>
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Semantic Case Law Research</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Search a curated legal corpus semantically or ask a grounded question answered from
            cited retrieved sources. Every result shows its source document and version.
          </p>
        </div>
        {status && (
          <div className="hidden sm:flex flex-col items-end text-right space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <ShieldCheck className={`w-4 h-4 ${status.realCorpus ? 'text-emerald-600' : 'text-amber-500'}`} />
              <span className="text-slate-600">{status.corpus.label}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Database className="w-3.5 h-3.5" />
              <span>{status.vdb.vectors ?? 0} vectors · {status.manifest.documents} documents</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>embedding: {status.embedding.provider}</span>
              {status.embedding.fixture && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">fixture</span>}
            </div>
          </div>
        )}
      </div>

      {/* Tab switch */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setTab('search'); setRagRes(null); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === 'search' ? 'bg-[#0B1024] text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
        >
          <span className="inline-flex items-center gap-1.5"><FileSearch className="w-4 h-4" /> Semantic Search</span>
        </button>
        <button
          onClick={() => { setTab('rag'); setSearchRes(null); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === 'rag' ? 'bg-[#0B1024] text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
        >
          <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Grounded Q&amp;A</span>
        </button>
      </div>

      {/* Query input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder={tab === 'search' ? 'e.g. Can a person challenge an unlawful arrest in Karnataka?' : 'Ask a legal question grounded in the corpus…'}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
          />
          <button
            onClick={submit}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#0B1024] text-white text-sm font-bold hover:bg-indigo-900 disabled:opacity-40 transition"
          >
            {loading ? 'Working…' : tab === 'search' ? 'Search' : 'Ask'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-500">Filters:</span>
          <select value={documentType} onChange={e => setDocumentType(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700">
            {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={court} onChange={e => setCourt(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700">
            {COURT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {status?.notice && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{status.notice}</span>
        </div>
      )}

      {/* RAG answer */}
      {ragRes && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">Grounded Answer</h3>
            {ragRes.fixture && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">fixture provider</span>
            )}
            {ragRes.insufficient && (
              <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">insufficient evidence</span>
            )}
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ragRes.answer}</p>

          <div className="flex items-center text-xs text-slate-400 space-x-3 pt-1">
            <span>model: {ragRes.model}</span>
            <span>{ragRes.evidence.length} evidence · {ragRes.retrieval_stats?.returned} retrieved</span>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Citations</div>
            <div className="space-y-2">
              {ragRes.citations.map(c => (
                <div key={c.index} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="font-bold text-[#0B1024] shrink-0">[{c.index}]</span>
                  <span>{c.title || 'Untitled'}{c.court ? ` · ${c.court}` : ''}{c.year ? ` · ${c.year}` : ''}</span>
                  {c.section && <span className="text-slate-400">· s/c {c.section}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search evidence list */}
      {searchRes && (
        <ListEvidence evidence={searchRes.evidence} empty={searchRes.empty} query={searchRes.query} expanded={expanded} setExpanded={setExpanded} />
      )}

      {(searchRes || ragRes) && (
        <p className="text-[11px] text-slate-400 pt-1">
          This is legal information provided for research purposes, not legal advice. Verify citations against the source documents before relying on them.
        </p>
      )}
    </div>
  );
};

function ListEvidence({
  evidence,
  empty,
  query,
  expanded,
  setExpanded
}: {
  evidence: LegalEvidence[];
  empty: boolean;
  query: string;
  expanded: number | null;
  setExpanded: (n: number | null) => void;
}) {
  if (empty) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500">
        No evidence matched your query. Try different wording or relax the filters.
      </div>
    );
  }
  const sourceLabel = (type: string | null) =>
    type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Document';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <BookOpen className="w-4 h-4 text-amber-500" />
        {evidence.length} result{evidence.length === 1 ? '' : 's'} · “{query.length > 50 ? query.slice(0, 50) + '…' : query}”
      </div>
      {evidence.map(ev => {
        const open = expanded === ev.rank;
        const badge = sourceLabel(ev.document_type);
        return (
          <div key={ev.chunk_id} className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <button
              onClick={() => setExpanded(open ? null : ev.rank)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#0B1024] text-white text-xs font-bold shrink-0">
                  {ev.rank}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 truncate">{ev.title || 'Untitled'}</span>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full shrink-0">{badge}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    {ev.court && <span>{ev.court}</span>}
                    {ev.jurisdiction && <span>{ev.jurisdiction}</span>}
                    {ev.year && <span>· {ev.year}</span>}
                    <span className="flex items-center gap-0.5 ml-auto">
                      <span className="text-emerald-600 font-semibold">{Math.round(ev.similarity * 10000) / 100}%</span>
                    </span>
                  </div>
                </div>
              </div>
              {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>

            {open && (
              <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                <p className="text-sm text-slate-700 leading-relaxed">{ev.text}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                  <div><span className="font-semibold text-slate-700">Act:</span> {ev.act || '—'}</div>
                  <div><span className="font-semibold text-slate-700">Section:</span> {ev.section || '—'}</div>
                  <div><span className="font-semibold text-slate-700">Page:</span> {ev.page || '—'}</div>
                  <div><span className="font-semibold text-slate-700">Paragraph:</span> {ev.paragraph || '—'}</div>
                  <div className="col-span-2"><span className="font-semibold text-slate-700">Case ref:</span> {ev.case_id || '—'}</div>
                  <div className="col-span-2 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> <span className="font-semibold text-slate-700">Source:</span> {ev.s3_key || 'local fixture'} {ev.s3_version_id ? `(v ${ev.s3_version_id})` : ''}</div>
                </div>
                <a
                  href={ev.s3_key ? undefined : undefined}
                  onClick={e => e.preventDefault()}
                  className="inline-flex items-center gap-1 text-xs text-[#0B1024] font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Document ref: {ev.document_id.slice(0, 12)}…
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
