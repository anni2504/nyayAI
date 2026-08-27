import React, { useState } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { FileText, Sparkles, ArrowRight, Download } from 'lucide-react';
import { mockDocumentsList } from '../../data/mockDocuments';

export const DocumentWorkspace: React.FC = () => {
  const { activeDocumentId, setActiveDocumentId } = useCaseContext();
  const [docMessages, setDocMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Document loaded into NYAYAI Document Intelligence. Ask any question or select a suggested prompt below.' }
  ]);
  const [inputQuery, setInputQuery] = useState('');

  const activeDoc = mockDocumentsList.find(d => d.id === activeDocumentId) || mockDocumentsList[0];

  const handleAsk = (query: string) => {
    if (!query.trim()) return;

    const userMsg = { sender: 'user' as const, text: query };
    let aiAns = `Analysis of "${activeDoc.title}" for query "${query}":\n\n`;

    if (query.toLowerCase().includes('decision') || query.toLowerCase().includes('outcome')) {
      aiAns += `The court directed full refund of principal deposit along with 10.25% interest under RERA Section 18 within 60 days.`;
    } else if (query.toLowerCase().includes('bail')) {
      aiAns += `Bail is discussed under Paragraph 14, where anticipatory protection was confirmed under Section 438 CrPC subject to a personal bond of ₹50,000.`;
    } else if (query.toLowerCase().includes('risk') || query.toLowerCase().includes('findings')) {
      aiAns += `Key Risk Clause Found: Clause 11.2 specifies an asymmetrical penalty of 18% p.a. on the buyer versus only ₹5/sq.ft on promoter delay.`;
    } else {
      aiAns += `Grounding extracted from Page 4 Clause 8: The obligation remains binding under Indian Contract Act 1872 Section 73.`;
    }

    setDocMessages(prev => [...prev, userMsg, { sender: 'ai', text: aiAns }]);
    setInputQuery('');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-warm-white overflow-hidden">
      
      {/* LEFT: DOCUMENT LIST */}
      <div className="w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Document Vault</h3>
          <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {mockDocumentsList.length} Files
          </span>
        </div>

        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {mockDocumentsList.map(doc => {
            const isSel = doc.id === activeDoc.id;
            return (
              <button
                key={doc.id}
                onClick={() => setActiveDocumentId(doc.id)}
                className={`w-full text-left p-3 rounded-xl transition-smooth border ${
                  isSel
                    ? 'bg-slate-900 text-white border-slate-900 shadow-subtle'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isSel ? 'text-amber-400' : 'text-slate-500'}`} />
                  <div className="overflow-hidden space-y-1">
                    <h4 className="text-xs font-bold truncate">{doc.title}</h4>
                    <p className={`text-[11px] truncate ${isSel ? 'text-slate-300' : 'text-slate-500'}`}>
                      {doc.category}
                    </p>
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className={isSel ? 'text-slate-400' : 'text-slate-400'}>{doc.fileSize}</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        doc.riskLevel === 'High Risk'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {doc.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER: DOCUMENT PREVIEW */}
      <div className="flex-1 bg-slate-100 p-4 lg:p-6 overflow-y-auto flex flex-col border-r border-slate-200">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 flex-1 flex flex-col space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-900">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">{activeDoc.title}</h2>
                <p className="text-xs text-slate-500">{activeDoc.category} • Uploaded {activeDoc.uploadDate}</p>
              </div>
            </div>

            <button
              onClick={() => alert(`Downloading ${activeDoc.title}...`)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-smooth"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Executive Summary</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                activeDoc.riskScore > 50 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                Risk Score: {activeDoc.riskScore}/100 ({activeDoc.riskLevel})
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {activeDoc.summary}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Extracted Clauses & Statutory Risk</h3>
            <div className="space-y-2.5">
              {activeDoc.extractedClauses.map((c, i) => (
                <div key={i} className="p-3.5 bg-warm-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{c.title}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      c.severity === 'red' ? 'bg-rose-100 text-rose-800' :
                      c.severity === 'yellow' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {c.severity.toUpperCase()} SEVERITY
                    </span>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px] bg-white p-2 rounded border border-slate-200/80">
                    "{c.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT: AI DOCUMENT INTELLIGENCE Q&A */}
      <div className="w-full lg:w-96 bg-white flex flex-col h-full shrink-0">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Document Copilot</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Grounded Q&A</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {docMessages.map((m, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl text-xs space-y-1 ${
              m.sender === 'ai' ? 'bg-slate-50 border border-slate-200 text-slate-800' : 'bg-slate-900 text-white ml-auto max-w-[85%]'
            }`}>
              <div className="font-bold text-[10px] uppercase text-slate-400 mb-1">
                {m.sender === 'ai' ? 'NYAYAI Doc Intelligence' : 'You'}
              </div>
              <div className="whitespace-pre-line leading-relaxed font-medium">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Questions</div>
          <div className="flex flex-col space-y-1.5">
            {[
              "What was the court's decision?",
              "Where is bail discussed?",
              "What were the key findings?",
              "Summarize this judgment."
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(q)}
                className="text-left text-xs text-indigo-950 font-semibold bg-white hover:bg-indigo-50 px-3 py-2 rounded-lg border border-slate-200 transition-smooth flex items-center justify-between"
              >
                <span>{q}</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-700" />
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk(inputQuery)}
            placeholder="Ask about this document..."
            className="flex-1 text-xs bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-900"
          />
          <button
            onClick={() => handleAsk(inputQuery)}
            className="bg-slate-900 text-white p-2.5 rounded-xl font-bold hover:bg-slate-800"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
