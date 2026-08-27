import React, { useState } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { FileText, Upload, Cpu } from 'lucide-react';
import { mockDocumentsList } from '../../data/mockDocuments';
import type { LegalDocument } from '../../data/types';

export const ClientDocumentVault: React.FC = () => {
  const { uploadDocument } = useCaseContext();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(mockDocumentsList[0].id);

  const selectedDoc: LegalDocument = mockDocumentsList.find((d: LegalDocument) => d.id === selectedDocId) || mockDocumentsList[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      uploadDocument({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type
      });
    }
  };

  const suggestedQuestions = [
    "What are the key legal risks in this document?",
    "Does this clause comply with statutory acts?",
    "Summarize the main liabilities."
  ];

  return (
    <div className="flex-1 bg-warm-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
            Encrypted Document Storage
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Client Document Vault</h1>
        </div>

        <label className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-subtle transition-smooth cursor-pointer inline-flex items-center space-x-2">
          <Upload className="w-4 h-4 text-amber-400" />
          <span>Upload PDF / Image Document</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* DOCUMENT LIST */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Your Uploaded Vault Documents ({mockDocumentsList.length})
          </h3>

          {mockDocumentsList.map((doc: LegalDocument) => {
            const isSelected = doc.id === selectedDocId;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`p-4 rounded-2xl border transition-smooth cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-white border-indigo-900 shadow-floating ring-2 ring-indigo-950/10'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-subtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-5 h-5 text-indigo-900 shrink-0" />
                    <span className="text-xs font-extrabold text-slate-900 truncate max-w-[200px]">
                      {doc.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    doc.riskScore >= 70 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Risk: {doc.riskScore}/100
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>{doc.fileSize} • {doc.category}</span>
                  <span>{doc.uploadDate}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* DOCUMENT AI ANALYSIS WORKSPACE */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Document Copilot</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{selectedDoc.title}</h3>
              </div>

              <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                selectedDoc.riskScore >= 70 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {selectedDoc.riskLevel} ({selectedDoc.riskScore}/100)
              </span>
            </div>

            {/* SUMMARY */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-900" />
                <span>Executive Summary</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium">
                {selectedDoc.summary}
              </p>
            </div>

            {/* CLAUSES EXTRACTED */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Extracted Clause Analysis ({selectedDoc.extractedClauses.length})
              </h4>

              {selectedDoc.extractedClauses.map((clause, idx) => (
                <div key={idx} className="p-4 bg-warm-white rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{clause.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      clause.severity === 'red' ? 'bg-rose-100 text-rose-800' : clause.severity === 'yellow' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {clause.severity} Severity
                    </span>
                  </div>

                  <p className="text-slate-600 font-mono text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/80">
                    "{clause.text}"
                  </p>
                </div>
              ))}
            </div>

            {/* SUGGESTED PROMPTS */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suggested Copilot Prompts</div>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      window.location.hash = '#/client/copilot';
                    }}
                    className="text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-950 px-3 py-2 rounded-xl border border-indigo-200 transition-smooth"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
