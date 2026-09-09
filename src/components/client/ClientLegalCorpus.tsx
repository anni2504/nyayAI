import React, { useState, useEffect } from 'react';
import {
  fetchLegalStatus,
  fetchLegalDocuments,
  openCorpusFile,
  type LegalStackStatus,
  type LegalCorpusDocument
} from '../../services/api';
import {
  Scale,
  Database,
  ShieldCheck,
  BookOpen,
  FileText,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Search,
  CheckCircle2,
  FileSearch
} from 'lucide-react';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'constitution', label: 'Constitutions' },
  { value: 'judgment', label: 'Judgments' },
  { value: 'statute', label: 'Statutes' },
  { value: 'regulation', label: 'Regulations' },
  { value: 'case_history', label: 'Case History' }
];

const TYPE_STYLES: Record<string, string> = {
  constitution: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  judgment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  statute: 'bg-sky-50 text-sky-700 border-sky-200',
  regulation: 'bg-amber-50 text-amber-700 border-amber-200',
  case_history: 'bg-rose-50 text-rose-700 border-rose-200'
};

export const ClientLegalCorpus: React.FC = () => {
  const [status, setStatus] = useState<LegalStackStatus | null>(null);
  const [documents, setDocuments] = useState<LegalCorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [query, setQuery] = useState('');
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [s, d] = await Promise.all([fetchLegalStatus(), fetchLegalDocuments()]);
        setStatus(s);
        setDocuments(d.documents || []);
      } catch (err: any) {
        setError(err.message || 'Could not load the legal corpus.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openFile = async (doc: LegalCorpusDocument) => {
    setOpeningKey(doc.s3_key);
    try {
      const res = await openCorpusFile(doc.s3_key);
      if (!res.ok) setError(res.error || 'Could not open the document.');
    } finally {
      setOpeningKey(null);
    }
  };

  const countries = Array.from(new Set(documents.map(d => d.country).filter(Boolean))).sort();
  const types = Array.from(new Set(documents.map(d => d.document_type).filter(Boolean))).sort();
  const totalChunks = documents.reduce((a, d) => a + (d.chunk_count || 0), 0);
  const ocrDocs = documents.filter(d => d.status === 'requires_ocr').length;

  const filtered = documents.filter(d => {
    if (typeFilter && d.document_type !== typeFilter) return false;
    if (countryFilter && d.country !== countryFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const hay = `${d.title || ''} ${d.s3_key} ${d.document_type || ''} ${d.document_id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const grouped = filtered.reduce<Record<string, LegalCorpusDocument[]>>((acc, d) => {
    const bucket = d.country && countryFilter === '' ? `${d.country} / ${d.document_type || 'untyped'}` : (d.document_type || 'untyped');
    (acc[bucket] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1.5 w-fit">
            <Scale className="w-3 h-3 text-amber-500" />
            <span>Legal Corpus</span>
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Openable Case File &amp; Constitution Library</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Every document below is a real, openable file on this system — case PDFs and the official
            Constitutions of India and the United States of America. Open any PDF directly from here.
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
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading corpus…
        </div>
      ) : (
        <>
          {/* SUMMARY RIBBON */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-2xl font-extrabold text-slate-900">{documents.length}</div>
              <div className="text-xs text-slate-500 font-semibold">Documents</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-2xl font-extrabold text-slate-900">{totalChunks}</div>
              <div className="text-xs text-slate-500 font-semibold">Indexed chunks</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-2xl font-extrabold text-slate-900">{countries.length}</div>
              <div className="text-xs text-slate-500 font-semibold">Countries</div>
              {countries.length > 0 && (
                <div className="text-[11px] text-slate-400 mt-0.5">{countries.join(', ')}</div>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-2xl font-extrabold text-amber-600">{ocrDocs}</div>
              <div className="text-xs text-slate-500 font-semibold">Require manual review</div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* FILTERS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search title, key, type…"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-300"
              />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700">
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700">
              <option value="">All countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* TYPE LEGEND */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="font-bold uppercase tracking-wide">Types:</span>
            {types.map(t => (
              <span key={t} className={`px-2 py-0.5 rounded-full border font-semibold ${TYPE_STYLES[t] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{t}</span>
            ))}
          </div>

          {/* GROUPS */}
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
              No documents match your filters.
            </div>
          ) : (
            Object.entries(grouped).map(([bucket, docs]) => (
              <div key={bucket}>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" /> {bucket}
                  <span className="text-slate-300 font-bold">({docs.length})</span>
                </h3>
                <div className="grid gap-3">
                  {docs.map(doc => {
                    const isPdf = doc.s3_key.toLowerCase().endsWith('.pdf');
                    const ocr = doc.status === 'requires_ocr';
                    return (
                      <div key={doc.document_id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPdf ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-700'}`}>
                          {isPdf ? <FileText className="w-5 h-5" /> : <FileSearch className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-800">{doc.title || doc.s3_key}</span>
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${TYPE_STYLES[doc.document_type || ''] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {doc.document_type || 'untyped'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${ocr ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              {ocr ? 'manual review' : 'indexed'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 font-mono break-all">{doc.s3_key}</div>
                          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>{doc.chunk_count} chunk{doc.chunk_count === 1 ? '' : 's'}</span>
                            <span>country: {doc.country}</span>
                            {doc.retrieved_at && <span>retrieved {new Date(doc.retrieved_at).toLocaleDateString()}</span>}
                            <span>ingested {new Date(doc.ingested_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {doc.source_url && (
                            <a
                              href={doc.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Official source
                            </a>
                          )}
                          {isPdf && (
                            <button
                              onClick={() => openFile(doc)}
                              disabled={openingKey === doc.s3_key}
                              className="inline-flex items-center gap-1.5 text-xs bg-[#0B1024] text-white font-bold px-4 py-2 rounded-xl hover:bg-indigo-900 transition-colors disabled:opacity-50"
                            >
                              {openingKey === doc.s3_key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              Open PDF
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <p className="text-[11px] text-slate-400 pt-1">
            Documents marked “manual review” are real PDFs served openable, but their scanned pages have no
            embedded text layer, so they index honestly (no fabricated text).
          </p>
        </>
      )}
    </div>
  );
};