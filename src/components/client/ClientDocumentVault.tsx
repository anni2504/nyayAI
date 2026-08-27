import React, { useState } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { FileText, Upload, Cpu, ShieldAlert, CheckCircle2, AlertTriangle, Search, Filter, RefreshCw, MessageSquare, Eye, ShieldCheck, Lock, FileCheck2, FileSpreadsheet } from 'lucide-react';
import { uploadClientDocument } from '../../services/api';
import type { DocumentCategory } from '../../../server/src/types';

export const ClientDocumentVault: React.FC = () => {
  const { activeCaseId, activeCase, setCurrentView } = useCaseContext();

  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [relevanceFilter, setRelevanceFilter] = useState<'ALL' | 'RELEVANT' | 'IDENTITY' | 'UNRELATED'>('ALL');
  
  // Active selected document for deep analysis workspace
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  // Upload & Analysis State
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('CASE_DOCUMENT');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Full Analysis Modal View
  const [showFullAnalysisModal, setShowFullAnalysisModal] = useState<boolean>(false);

  // Vault documents array from active case context
  const vaultDocuments: any[] = activeCase?.documents || [];

  const effectiveSelectedDocId = selectedDocId || (vaultDocuments.length ? vaultDocuments[0].id : null);
  const selectedDoc = vaultDocuments.find(d => d.id === effectiveSelectedDocId) || vaultDocuments[0];

  // Filter vault documents by category, relevance, and search query
  const filteredDocuments = vaultDocuments.filter(doc => {
    const docName = doc.name || doc.title || '';
    const docType = doc.documentType || doc.category || '';
    const matchesCategory = activeCategory === 'ALL' || doc.category === activeCategory;
    const matchesSearch = !searchQuery || 
      docName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      docType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesRelevance = true;
    if (relevanceFilter === 'RELEVANT') matchesRelevance = doc.analysis?.isRelevant === true && doc.category !== 'IDENTITY';
    if (relevanceFilter === 'IDENTITY') matchesRelevance = doc.category === 'IDENTITY';
    if (relevanceFilter === 'UNRELATED') matchesRelevance = doc.analysis?.isRelevant === false;

    return matchesCategory && matchesSearch && matchesRelevance;
  });

  // Handle local file selection with size & type validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnalysisError(null);
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];

      // Validate size (10 MB max)
      if (file.size > 10 * 1024 * 1024) {
        setAnalysisError('File size exceeds 10 MB limit. Please upload a smaller PDF or image.');
        return;
      }

      // Validate format
      const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) {
        setAnalysisError('Invalid file format. Supported formats: PDF, PNG, JPG, JPEG.');
        return;
      }

      setSelectedFileForUpload(file);
    }
  };

  // Upload and analyze document using backend Groq Document Intelligence
  const handleUploadAndAnalyze = async (forceReanalyze = false) => {
    if (!selectedFileForUpload && !forceReanalyze) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    const fileToProcess = selectedFileForUpload || (selectedDoc ? {
      name: selectedDoc.name || selectedDoc.title,
      size: selectedDoc.size || selectedDoc.fileSize,
      type: selectedDoc.type || selectedDoc.fileType
    } : null);

    if (!fileToProcess) {
      setIsAnalyzing(false);
      return;
    }

    try {
      const formattedSize = typeof fileToProcess.size === 'number' 
        ? `${(fileToProcess.size / (1024 * 1024)).toFixed(1)} MB` 
        : fileToProcess.size;

      const payload = await uploadClientDocument(
        activeCaseId,
        {
          name: fileToProcess.name,
          size: formattedSize,
          type: (fileToProcess as any).type || 'application/pdf'
        },
        undefined,
        { skipChatMessage: true, forceReanalyze }
      );

      setIsAnalyzing(false);
      setSelectedFileForUpload(null);

      if (payload.analysis?.documentId) {
        setSelectedDocId(payload.analysis.documentId);
      }
    } catch (err: any) {
      setIsAnalyzing(false);
      setAnalysisError(err.message || 'Failed to process document analysis. Please try again.');
    }
  };

  return (
    <div className="flex-1 bg-[#FAF8F5] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      {/* HEADER & VAULT METRICS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Encrypted Client Document Intelligence Vault
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Legal Case Document Vault</h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Organize, classify, and analyze identity cards, FIRs, notices, contracts, and supporting evidence with Groq AI.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-[#FCFBF7] border border-[#EFEBE1] px-4 py-2 rounded-2xl shadow-xs text-center">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Total Vault Docs</span>
            <span className="text-base font-extrabold text-slate-950">{vaultDocuments.length}</span>
          </div>

          <div className="bg-[#FCFBF7] border border-[#EFEBE1] px-4 py-2 rounded-2xl shadow-xs text-center">
            <span className="text-[10px] font-black uppercase text-amber-600 block">Readiness Contribution</span>
            <span className="text-base font-extrabold text-indigo-950">+{activeCase?.readinessScore || 0}%</span>
          </div>
        </div>
      </div>

      {/* PRIVACY NOTICE BANNER FOR SENSITIVE IDENTITY DOCUMENTS */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-xs">
        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <span>🔒 Sensitive Identity Document Privacy Protection</span>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">PII Masked</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-medium">
            Identity documents (Aadhaar, PAN, Passport) contain sensitive personal information (PII). NYAYAI automatically masks sensitive ID numbers (e.g. <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">XXXX-XXXX-1842</code>) and does <strong>not</strong> treat identity cards as legal case evidence or inflate your case readiness score. Upload identity cards only when relevant to your matter.
          </p>
        </div>
      </div>

      {/* CATEGORY SELECTOR TABS & SEARCH/FILTER BAR */}
      <div className="space-y-4">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#E8E2D5] pb-3">
          {[
            { id: 'ALL', label: 'All Documents', count: vaultDocuments.length },
            { id: 'IDENTITY', label: '1. Identity Documents', count: vaultDocuments.filter((d: any) => d.category === 'IDENTITY').length },
            { id: 'CASE_DOCUMENT', label: '2. Case Documents (FIR, Notice, Court)', count: vaultDocuments.filter((d: any) => d.category === 'CASE_DOCUMENT').length },
            { id: 'SUPPORTING_EVIDENCE', label: '3. Supporting Evidence (Deeds, Bills, Media)', count: vaultDocuments.filter((d: any) => d.category === 'SUPPORTING_EVIDENCE').length },
            { id: 'PERSONAL', label: '4. Personal / Background', count: vaultDocuments.filter((d: any) => d.category === 'PERSONAL').length }
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

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vault by document title, FIR #, sections, or dates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FCFBF7] text-xs text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-[#EFEBE1] focus:outline-none focus:ring-2 focus:ring-indigo-900/20 shadow-xs font-medium"
            />
          </div>

          {/* Relevance Filter Pills */}
          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-400 uppercase">Filter:</span>
            {(['ALL', 'RELEVANT', 'IDENTITY', 'UNRELATED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setRelevanceFilter(f)}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-smooth ${
                  relevanceFilter === f ? 'bg-indigo-950 text-amber-400' : 'bg-[#FCFBF7] text-slate-600 border border-[#EFEBE1] hover:bg-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* UPLOAD DROPZONE & QUEUE CARD */}
      <div className="bg-[#FCFBF7] rounded-3xl border border-[#EFEBE1] shadow-card p-5 sm:p-6 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Upload New Document for Groq LLM Intelligence Analysis</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Supported formats: PDF, PNG, JPG, JPEG (Max 10 MB per file).
            </p>
          </div>

          {/* Category Selector for Upload */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-500">Category:</span>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
              className="bg-slate-100 text-xs font-bold text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none"
            >
              <option value="CASE_DOCUMENT">Case Documents (FIR, Summons, Petition)</option>
              <option value="IDENTITY">Identity Documents (Aadhaar, PAN, Passport)</option>
              <option value="SUPPORTING_EVIDENCE">Supporting Evidence (Deeds, Bills, Media)</option>
              <option value="PERSONAL">Personal / Background Documents</option>
            </select>
          </div>
        </div>

        {/* Dropzone Container */}
        <div className="border-2 border-dashed border-slate-300 hover:border-indigo-900/50 rounded-2xl p-6 text-center space-y-3 transition-smooth bg-slate-50/50">
          <FileCheck2 className="w-10 h-10 text-indigo-900 mx-auto" />
          
          <div className="space-y-1">
            <p className="text-xs font-extrabold text-slate-900">
              Drag & drop your legal document here, or browse files
            </p>
            <p className="text-[11px] text-slate-500">
              Documents are processed securely via Groq LLM and stored in your encrypted vault.
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <label className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-subtle cursor-pointer inline-flex items-center space-x-2 transition-smooth">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Browse Files</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {selectedFileForUpload && (
              <button
                onClick={() => handleUploadAndAnalyze(false)}
                disabled={isAnalyzing}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-smooth inline-flex items-center space-x-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing with Groq...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Upload & Analyze Document</span>
                  </>
                )}
              </button>
            )}
          </div>

          {selectedFileForUpload && (
            <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-bold px-3.5 py-1.5 rounded-xl">
              <span>Selected: {selectedFileForUpload.name} ({(selectedFileForUpload.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          )}

          {analysisError && (
            <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl max-w-lg mx-auto flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}
        </div>

      </div>

      {/* MAIN VAULT WORKSPACE GRID (DOCUMENT LIST LEFT, DEEP ANALYSIS RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* DOCUMENT LIST QUEUE (LEFT) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vault Documents Queue ({filteredDocuments.length})
            </h3>
          </div>

          {!filteredDocuments.length ? (
            <div className="bg-[#FCFBF7] p-8 rounded-3xl border border-[#EFEBE1] text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No documents found matching your search filter.</p>
            </div>
          ) : (
            filteredDocuments.map((doc: any) => {
              const docName = doc.name || doc.title || 'Document.pdf';
              const isSelected = doc.id === effectiveSelectedDocId;
              const isIdentity = doc.category === 'IDENTITY';
              const isUnrelated = doc.analysis?.isRelevant === false;

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
                    <div className="flex items-center space-x-2.5 truncate max-w-[240px]">
                      <FileText className="w-4 h-4 text-indigo-900 shrink-0" />
                      <span className="text-xs font-extrabold text-slate-950 truncate">
                        {docName}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isIdentity
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isUnrelated
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {isIdentity ? 'IDENTITY (PII MASKED)' : isUnrelated ? 'STORED (0% BOOST)' : 'CASE RELEVANT'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium line-clamp-2">
                    {doc.summary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>{doc.size || doc.fileSize || '1.2 MB'} • {doc.documentType || doc.category || 'Legal Document'}</span>
                    <span>{doc.uploadDate || 'Today'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* STRUCTURED DOCUMENT ANALYSIS WORKSPACE (RIGHT) */}
        <div className="lg:col-span-7">
          {selectedDoc ? (
            <div className="bg-white rounded-3xl border border-[#EFEBE1] shadow-card p-6 space-y-6">
              
              {/* Card Header & Relevance Indicator */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                      {selectedDoc.category || 'CASE_DOCUMENT'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {selectedDoc.documentType || 'Legal Document'}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-950 leading-tight">
                    {selectedDoc.name || selectedDoc.title}
                  </h3>
                </div>

                {/* Relevance Badge */}
                <div className="text-right shrink-0">
                  {selectedDoc.category === 'IDENTITY' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>IDENTITY VERIFIED</span>
                    </span>
                  ) : selectedDoc.analysis?.isRelevant === false ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                      <span>UNRELATED TO CASE</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>CASE RELEVANT (+{selectedDoc.analysis?.readinessContribution || 10}%)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* UNRELATED DOCUMENT SPECIAL WARNING BANNER */}
              {selectedDoc.analysis?.isRelevant === false && (
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-medium text-slate-700 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <p>
                    This document appears to be unrelated to your current case, so I have stored it in your vault but did not use it to modify your case facts or readiness.
                  </p>
                </div>
              )}

              {/* SENSITIVE IDENTITY PII MASKING BANNER */}
              {selectedDoc.category === 'IDENTITY' && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-medium text-amber-900 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Sensitive identity document detected. PII Identifier Masked (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">{selectedDoc.analysis?.maskedIdentifier || 'XXXX-XXXX-1842'}</code>). Identity logged without mutating case readiness.
                  </p>
                </div>
              )}

              {/* EXECUTIVE FINDINGS SUMMARY */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-900" />
                  <span>Groq AI Executive Summary</span>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedDoc.summary}
                </p>
              </div>

              {/* STRUCTURED EXTRACTED ENTITIES GRID */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-950" />
                  <span>Structured Intelligence Extraction</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  
                  {/* Parties & Names */}
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1">
                    <span className="font-extrabold text-slate-900 block text-[11px]">Parties & Person Names</span>
                    <span className="text-slate-600 block">
                      {selectedDoc.analysis?.extractedEntities?.parties?.join(', ') || selectedDoc.analysis?.extractedEntities?.personNames?.join(', ') || 'Client Verified'}
                    </span>
                  </div>

                  {/* Dates & Deadlines */}
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1">
                    <span className="font-extrabold text-slate-900 block text-[11px]">Important Dates & Deadlines</span>
                    <span className="text-slate-600 block">
                      {selectedDoc.analysis?.extractedEntities?.importantDates?.join(', ') || selectedDoc.analysis?.extractedEntities?.deadlines?.join(', ') || 'Standard Timeline'}
                    </span>
                  </div>

                  {/* FIR / Case Numbers */}
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1">
                    <span className="font-extrabold text-slate-900 block text-[11px]">FIR / Case Numbers</span>
                    <span className="text-slate-600 block font-mono text-[11px]">
                      {selectedDoc.analysis?.extractedEntities?.firOrCaseNumbers?.join(', ') || 'Not Applicable'}
                    </span>
                  </div>

                  {/* Jurisdiction / Police Station */}
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D5] space-y-1">
                    <span className="font-extrabold text-slate-900 block text-[11px]">Court / Police Station</span>
                    <span className="text-slate-600 block">
                      {selectedDoc.analysis?.extractedEntities?.courtOrPoliceStation || selectedDoc.analysis?.extractedEntities?.jurisdiction || 'Bengaluru'}
                    </span>
                  </div>

                </div>
              </div>

              {/* EXTRACTED CASE FACTS */}
              {selectedDoc.analysis?.extractedCaseFacts?.length ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Extracted Case Facts
                  </h4>
                  <div className="space-y-1.5">
                    {selectedDoc.analysis.extractedCaseFacts.map((fact: string, idx: number) => (
                      <div key={idx} className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs font-medium text-emerald-950 flex items-start space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{fact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFullAnalysisModal(true)}
                    className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-smooth"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Full Analysis</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('copilot');
                    }}
                    className="flex items-center space-x-1.5 bg-indigo-950 hover:bg-indigo-900 text-amber-400 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-smooth"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask NYAYAI About This Document</span>
                  </button>
                </div>

                <button
                  onClick={() => handleUploadAndAnalyze(true)}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 transition-smooth"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>Analyze Again</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#EFEBE1] shadow-card p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Select a document from your vault queue to inspect findings.</p>
            </div>
          )}
        </div>

      </div>

      {/* FULL ANALYSIS MODAL */}
      {showFullAnalysisModal && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-950">Full Groq Document Intelligence Report</h3>
              <button
                onClick={() => setShowFullAnalysisModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs bg-slate-100 px-3 py-1 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block uppercase text-[10px]">Document Metadata</span>
                <p><strong>Filename:</strong> {selectedDoc.name || selectedDoc.title}</p>
                <p><strong>Category:</strong> {selectedDoc.category}</p>
                <p><strong>Detected Type:</strong> {selectedDoc.documentType || selectedDoc.category}</p>
                <p><strong>Relevance:</strong> {selectedDoc.analysis?.isRelevant ? 'Case Relevant' : 'Unrelated'}</p>
                {selectedDoc.analysis?.maskedIdentifier && (
                  <p><strong>PII Identifier:</strong> <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono font-bold">{selectedDoc.analysis.maskedIdentifier}</code></p>
                )}
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-900 block uppercase text-[10px]">Extracted Legal Provisions & Provisions</span>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                  <p>Sections: {selectedDoc.analysis?.extractedEntities?.legalSections?.join(', ') || 'None'}</p>
                  <p>Clauses: {selectedDoc.analysis?.extractedEntities?.clauses?.join(', ') || 'None'}</p>
                  <p>Obligations: {selectedDoc.analysis?.extractedEntities?.obligations?.join(', ') || 'None'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-900 block uppercase text-[10px]">Extracted Case Facts</span>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  {selectedDoc.analysis?.extractedCaseFacts?.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  )) || <li>No case facts extracted.</li>}
                </ul>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
