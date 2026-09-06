import React, { useState, useEffect, useRef } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import {
  FileText, Upload, Search, Filter, Trash2, RefreshCw, AlertTriangle,
  Lock, FileCheck2
} from 'lucide-react';
import {
  fetchClientDocuments,
  storeClientDocument,
  deleteClientDocument,
  type DocumentRecord
} from '../../services/api';
import type { DocumentCategory } from '../../../server/src/types';

export const ClientDocumentVault: React.FC = () => {
  const { activeCaseId } = useCaseContext();

  const [vaultDocuments, setVaultDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchClientDocuments();
      setVaultDocuments(res.documents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents.');
      setVaultDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const effectiveSelectedDocId = selectedDocId || (vaultDocuments.length ? vaultDocuments[0].id : null);
  const selectedDoc = vaultDocuments.find(d => d.id === effectiveSelectedDocId) || null;

  const filteredDocuments = vaultDocuments.filter(doc => {
    const docName = doc.name || '';
    const docType = doc.document_type || doc.category || '';
    const matchesCategory = activeCategory === 'ALL' || doc.category === activeCategory;
    const matchesSearch = !searchQuery ||
      docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.summary || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryCounts = vaultDocuments.reduce((acc, doc) => {
    const cat = doc.category || 'OTHER';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size exceeds 10 MB limit.');
        return;
      }
      const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) {
        setUploadError('Invalid file format. Supported: PDF, PNG, JPG, JPEG.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await storeClientDocument(
        {
          name: selectedFile.name,
          size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
          type: selectedFile.type || 'application/pdf'
        },
        activeCaseId || undefined
      );
      setUploadSuccess(`"${selectedFile.name}" stored securely in your vault.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to store document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setIsDeleting(true);
    try {
      await deleteClientDocument(docId);
      setShowDeleteConfirm(null);
      if (selectedDocId === docId) setSelectedDocId(null);
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex-1 bg-[#FAF8F5] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Secure Document Vault
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Legal Case Document Vault</h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Store, organize, and manage your legal documents securely.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-[#FCFBF7] border border-[#EFEBE1] px-4 py-2 rounded-2xl shadow-xs text-center">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Total Vault Docs</span>
            <span className="text-base font-extrabold text-slate-950">{vaultDocuments.length}</span>
          </div>
        </div>
      </div>

      {/* PRIVACY NOTICE */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-xs">
        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-extrabold text-slate-900">
            <span>Sensitive Document Privacy Protection</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-medium">
            Documents are stored securely in your private vault. AI document intelligence is not yet enabled for new uploads. 
            Uploaded files are retained for your records and can be attached to case conversations.
          </p>
        </div>
      </div>

      {/* CATEGORY TABS & SEARCH */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-[#E8E2D5] pb-3">
          {[
            { id: 'ALL', label: 'All Documents', count: vaultDocuments.length },
            { id: 'IDENTITY', label: 'Identity Documents', count: categoryCounts['IDENTITY'] || 0 },
            { id: 'CASE_DOCUMENT', label: 'Case Documents', count: categoryCounts['CASE_DOCUMENT'] || 0 },
            { id: 'SUPPORTING_EVIDENCE', label: 'Supporting Evidence', count: categoryCounts['SUPPORTING_EVIDENCE'] || 0 },
            { id: 'PERSONAL', label: 'Personal / Background', count: categoryCounts['PERSONAL'] || 0 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-smooth flex items-center space-x-1.5 ${
                activeCategory === tab.id
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-[#FCFBF7] text-slate-700 border border-[#EFEBE1] hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeCategory === tab.id ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vault by document title, type, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FCFBF7] text-xs text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-[#EFEBE1] focus:outline-none focus:ring-2 focus:ring-indigo-900/20 shadow-xs font-medium"
            />
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-bold text-[11px] uppercase">{filteredDocuments.length} documents</span>
          </div>
        </div>
      </div>

      {/* UPLOAD DROPZONE */}
      <div className="bg-[#FCFBF7] rounded-3xl border border-[#EFEBE1] shadow-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Upload New Document</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Supported formats: PDF, PNG, JPG, JPEG (Max 10 MB per file).
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-300 hover:border-indigo-900/50 rounded-2xl p-6 text-center space-y-3 transition-smooth bg-slate-50/50">
          <FileCheck2 className="w-10 h-10 text-indigo-900 mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-extrabold text-slate-900">
              Drag & drop your legal document here, or browse files
            </p>
            <p className="text-[11px] text-slate-500">
              Documents are stored securely in your private vault.
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <label className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-subtle cursor-pointer inline-flex items-center space-x-2 transition-smooth">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Browse Files</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-smooth inline-flex items-center space-x-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Storing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Store Document</span>
                  </>
                )}
              </button>
            )}
          </div>

          {selectedFile && (
            <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-bold px-3.5 py-1.5 rounded-xl">
              <span>Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          )}

          {uploadError && (
            <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl max-w-lg mx-auto flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl max-w-lg mx-auto flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </div>
      </div>

      {/* VAULT DOCUMENTS + DETAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* DOCUMENT LIST */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vault Documents ({filteredDocuments.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="bg-[#FCFBF7] p-8 rounded-3xl border border-[#EFEBE1] text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-slate-400 mx-auto animate-spin" />
              <p className="text-xs font-bold text-slate-600">Loading your documents...</p>
            </div>
          ) : error ? (
            <div className="bg-[#FCFBF7] p-8 rounded-3xl border border-[#EFEBE1] text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs font-bold text-rose-600">{error}</p>
              <button onClick={loadDocuments} className="text-xs font-bold text-indigo-900 hover:text-indigo-700 underline">
                Try again
              </button>
            </div>
          ) : !filteredDocuments.length ? (
            <div className="bg-[#FCFBF7] p-8 rounded-3xl border border-[#EFEBE1] text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                {vaultDocuments.length === 0 ? 'No documents yet. Upload your first document above.' : 'No documents match your search.'}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const docName = doc.name || 'Document.pdf';
              const isSelected = doc.id === effectiveSelectedDocId;

              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`p-4 rounded-2xl border transition-smooth cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-white border-indigo-950 shadow-card ring-2 ring-indigo-950/10'
                      : 'bg-[#FCFBF7] border-[#EFEBE1] hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 truncate max-w-[200px]">
                      <FileText className="w-4 h-4 text-indigo-900 shrink-0" />
                      <span className="text-xs font-extrabold text-slate-950 truncate">{docName}</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200">
                      {doc.analysis_status === 'STORED' ? 'STORED' : doc.analysis_status || 'STORED'}
                    </span>
                  </div>

                  {doc.summary && (
                    <p className="text-xs text-slate-600 font-medium line-clamp-2">{doc.summary}</p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>{doc.size} • {doc.document_type || doc.category || 'Legal Document'}</span>
                    <span>{formatDate(doc.upload_date || doc.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DOCUMENT DETAIL */}
        <div className="lg:col-span-7">
          {selectedDoc ? (
            <div className="bg-white rounded-3xl border border-[#EFEBE1] shadow-card p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                      {selectedDoc.category || 'DOCUMENT'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {selectedDoc.document_type || 'Legal Document'}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-950 leading-tight">
                    {selectedDoc.name}
                  </h3>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                    <span>STORED</span>
                  </span>
                </div>
              </div>

              {/* AI ANALYSIS PLACEHOLDER */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <span>AI Analysis Not Yet Available</span>
                </div>
                <p className="text-amber-800 leading-relaxed font-medium">
                  This document has been securely stored. Full AI document intelligence analysis will be available in a future update. 
                  You can still attach this document to case conversations via the Ask NYAYAI workspace.
                </p>
              </div>

              {/* DOCUMENT METADATA */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Document Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1">
                    <span className="font-extrabold text-slate-900 block text-[11px]">Filename</span>
                    <span className="text-slate-600 block font-medium">{selectedDoc.name}</span>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1">
                    <span className="font-extrabold text-slate-900 block text-[11px]">Category</span>
                    <span className="text-slate-600 block font-medium">{selectedDoc.category || '—'}</span>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1">
                    <span className="font-extrabold text-slate-900 block text-[11px]">File Size</span>
                    <span className="text-slate-600 block font-medium">{selectedDoc.size}</span>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1">
                    <span className="font-extrabold text-slate-900 block text-[11px]">File Type</span>
                    <span className="text-slate-600 block font-medium">{selectedDoc.type}</span>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1 col-span-2">
                    <span className="font-extrabold text-slate-900 block text-[11px]">Uploaded</span>
                    <span className="text-slate-600 block font-medium">{formatDate(selectedDoc.upload_date || selectedDoc.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.location.hash = '#/client/copilot'}
                    className="flex items-center space-x-1.5 bg-indigo-950 hover:bg-indigo-900 text-amber-400 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-smooth"
                  >
                    <span>Ask NYAYAI About This Document</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(selectedDoc.id)}
                    className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-rose-200 transition-smooth"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#EFEBE1] shadow-card p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Select a document from your vault to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-rose-700" />
              </div>
              <h3 className="text-base font-extrabold text-slate-950">Delete Document?</h3>
              <p className="text-xs text-slate-600 font-medium">
                This will permanently remove the document from your vault. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-xl transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                disabled={isDeleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-smooth disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
