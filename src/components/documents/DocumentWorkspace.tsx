import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import type { DocumentRecord } from '../../services/api';
import { fetchClientDocuments, analyzeClientDocument } from '../../services/api';

export const DocumentWorkspace: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copilotMessage, setCopilotMessage] = useState<string>('Select a document to view its intelligence summary.');

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchClientDocuments();
      setDocuments(res.documents || []);
      if (!selectedDocId && res.documents?.length) {
        setSelectedDocId(res.documents[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents.');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDoc = documents.find(d => d.id === selectedDocId) || null;

  const handleAnalyze = async () => {
    if (!activeDoc) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeClientDocument(activeDoc.id);
      await loadDocuments();
      setCopilotMessage(res.alreadyAnalyzed
        ? `"${activeDoc.name}" was already analyzed. Showing existing extracted findings.`
        : `Analysis complete for "${activeDoc.name}". Showing verified extracted findings.`);
      if (res.analysis?.documentType) setSelectedDocId(activeDoc.id);
    } catch (err: any) {
      setCopilotMessage(`Analysis failed: ${err.message || 'unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analysis = activeDoc ? (typeof activeDoc.analysis === 'string' ? safeParse(activeDoc.analysis) : activeDoc.analysis) : null;

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-warm-white overflow-hidden">

      {/* LEFT: DOCUMENT LIST */}
      <div className="w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Document Vault</h3>
          <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {documents.length} Files
          </span>
        </div>

        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-5 h-5 text-slate-400 mx-auto animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-500">Loading your documents...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-2">
              <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
              <p className="text-xs font-bold text-rose-600">{error}</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <FileText className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No documents yet. Upload documents from the vault panel.</p>
            </div>
          ) : (
            documents.map(doc => {
              const isSel = doc.id === activeDoc?.id;
              const status = doc.analysis_status || 'STORED';
              return (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDocId(doc.id); setCopilotMessage('Document selected.'); }}
                  className={`w-full text-left p-3 rounded-xl transition-smooth border ${
                    isSel
                      ? 'bg-slate-900 text-white border-slate-900 shadow-subtle'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isSel ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div className="overflow-hidden space-y-1 flex-1">
                      <h4 className="text-xs font-bold truncate">{doc.name || 'Document'}</h4>
                      <p className={`text-[11px] truncate ${isSel ? 'text-slate-300' : 'text-slate-500'}`}>
                        {doc.document_type || doc.category || 'Legal Document'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="text-slate-400">{doc.size}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          status === 'ANALYZED' ? 'bg-emerald-100 text-emerald-800' :
                          status === 'REVIEW REQUIRED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER: DOCUMENT INTELLIGENCE */}
      <div className="flex-1 bg-slate-100 p-4 lg:p-6 overflow-y-auto flex flex-col border-r border-slate-200">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 flex-1 flex flex-col space-y-6">

          {!activeDoc ? (
            <div className="text-center py-16 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No document selected.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-900">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">{activeDoc.name}</h2>
                    <p className="text-xs text-slate-500">{activeDoc.document_type || activeDoc.category || ''} • Uploaded {formatDate(activeDoc.upload_date || activeDoc.created_at)}</p>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Downloading ${activeDoc.name}...`)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-smooth"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Intelligence Summary</span>
                  {activeDoc.analysis_status === 'ANALYZED' && analysis && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Relevance: {analysis.relevanceScore ?? '—'}/100
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {activeDoc.summary || 'No analysis summary yet. Run Document Intelligence to extract verified findings.'}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Extracted Findings</h3>
                {activeDoc.analysis_status === 'ANALYZED' && analysis ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3.5 bg-warm-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="block text-[10px] font-black uppercase text-slate-500">Document Type</span>
                        <span className="font-bold text-slate-900">{analysis.documentType || '—'}</span>
                      </div>
                      <div className="p-3.5 bg-warm-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="block text-[10px] font-black uppercase text-slate-500">FIR / Case Numbers</span>
                        <span className="font-bold text-slate-900">
                          {analysis.extractedEntities?.firOrCaseNumbers?.length ? analysis.extractedEntities.firOrCaseNumbers.join(', ') : '—'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-warm-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="block text-[10px] font-black uppercase text-slate-500">Legal Sections</span>
                        <span className="font-bold text-slate-900">
                          {analysis.extractedEntities?.legalSections?.length ? analysis.extractedEntities.legalSections.join(', ') : '—'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-warm-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="block text-[10px] font-black uppercase text-slate-500">Court / Police Station</span>
                        <span className="font-bold text-slate-900">
                          {analysis.extractedEntities?.courtOrPoliceStation || '—'}
                        </span>
                      </div>
                    </div>

                    {Array.isArray(analysis.extractedCaseFacts) && analysis.extractedCaseFacts.length > 0 && (
                      <div className="p-3.5 bg-warm-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <span className="block text-[10px] font-black uppercase text-slate-500">Extracted Case Facts</span>
                        <ul className="space-y-1">
                          {analysis.extractedCaseFacts.map((fact: string, i: number) => (
                            <li key={i} className="flex items-start space-x-1.5 text-slate-700">
                              <span className="text-indigo-700 mt-0.5">•</span>
                              <span className="font-semibold">{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : activeDoc.analysis_status === 'REVIEW REQUIRED' ? (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                    This document needs manual review before its findings can be added to your case analysis.
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                    {isAnalyzing
                      ? 'Running Document Intelligence — extracting verified findings...'
                      : 'This document is stored and ready to analyze. Analysis only runs when you explicitly choose it; uploads never auto-analyze.'}
                  </div>
                )}

                {activeDoc.analysis_status !== 'ANALYZED' && (
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-smooth disabled:opacity-50"
                  >
                    {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Document'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT: HONEST DOC INTELLIGENCE NOTES */}
      <div className="w-full lg:w-96 bg-white flex flex-col h-full shrink-0">

        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Document Copilot</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Grounded Notes</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-[10px] uppercase text-slate-400 mb-1">NYAYAI Doc Intelligence</div>
            <div className="whitespace-pre-line leading-relaxed font-medium text-slate-700">{copilotMessage}</div>
          </div>

          {activeDoc?.analysis_status === 'ANALYZED' && analysis && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <div className="font-bold text-[10px] uppercase text-emerald-600 mb-1">Verified Findings</div>
              <div className="whitespace-pre-line leading-relaxed font-medium text-emerald-900">
                {analysis.analysisResponseText || activeDoc.summary}
              </div>
            </div>
          )}
        </div>

        <p className="p-4 border-t border-slate-100 text-[11px] text-slate-500 font-medium leading-relaxed">
          NYAYAI only reports findings verified from the document. Content that could not be read is never described as fact.
        </p>
      </div>

    </div>
  );
};

function formatDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function safeParse(json: string | null | undefined): any {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}