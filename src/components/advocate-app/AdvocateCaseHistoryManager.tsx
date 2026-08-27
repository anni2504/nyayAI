import React, { useState } from 'react';
import { mockAdvocateCaseRecords } from '../../data/mockCaseHistories';
import type { AdvocateCaseRecord } from '../../data/mockCaseHistories';
import { Plus, CheckCircle2, Clock } from 'lucide-react';

export const AdvocateCaseHistoryManager: React.FC = () => {
  const [records, setRecords] = useState<AdvocateCaseRecord[]>(mockAdvocateCaseRecords);
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState({
    caseTitle: '',
    anonymizedTitle: '',
    court: 'Karnataka High Court',
    year: 2024,
    practiceArea: 'Criminal Defense',
    legalIssues: '',
    jurisdiction: 'Karnataka',
    proceduralStage: 'High Court Petition',
    outcome: '',
    relevantSections: '',
    caseSummary: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: AdvocateCaseRecord = {
      id: `rec-${Date.now()}`,
      advocateId: 'lawyer-1',
      caseTitle: form.caseTitle || 'State of Karnataka v. Respondent',
      anonymizedTitle: form.anonymizedTitle || 'Private Land Dispute Petition',
      court: form.court,
      year: Number(form.year),
      practiceArea: form.practiceArea,
      legalIssues: form.legalIssues ? form.legalIssues.split(',').map(s => s.trim()) : ['CrPC 482 Quashing'],
      jurisdiction: form.jurisdiction,
      proceduralStage: form.proceduralStage,
      outcome: form.outcome || 'Petition Allowed by High Court',
      relevantSections: form.relevantSections ? form.relevantSections.split(',').map(s => s.trim()) : ['CrPC Section 482'],
      caseSummary: form.caseSummary || 'Successfully argued petition quashing malicious criminal proceedings.',
      verificationStatus: 'PENDING'
    };

    setRecords([newRecord, ...records]);
    setIsAdding(false);
    setForm({
      caseTitle: '',
      anonymizedTitle: '',
      court: 'Karnataka High Court',
      year: 2024,
      practiceArea: 'Criminal Defense',
      legalIssues: '',
      jurisdiction: 'Karnataka',
      proceduralStage: 'High Court Petition',
      outcome: '',
      relevantSections: '',
      caseSummary: ''
    });
  };

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Advocate Precedent Repository</span>
          <h1 className="text-2xl font-extrabold text-white">Case History & Court Precedents</h1>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow transition-smooth flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdding ? 'Close Form' : 'Add Precedent Case'}</span>
        </button>
      </div>

      {/* ADD CASE FORM */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-2xl border border-amber-400/40 space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider">
            Submit New Case History for Platform Verification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Case Title / Cause Title</label>
              <input
                type="text"
                required
                placeholder="e.g. State of Karnataka v. S. Kumar"
                value={form.caseTitle}
                onChange={e => setForm({ ...form, caseTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Court / Tribunal</label>
              <select
                value={form.court}
                onChange={e => setForm({ ...form, court: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
              >
                <option>Karnataka High Court</option>
                <option>Supreme Court of India</option>
                <option>Bengaluru Sessions Court</option>
                <option>Delhi High Court</option>
                <option>Bombay High Court</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Year</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Practice Area</label>
              <input
                type="text"
                placeholder="e.g. Criminal Defense, Property, Civil"
                value={form.practiceArea}
                onChange={e => setForm({ ...form, practiceArea: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Relevant Statutory Sections (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. CrPC Section 482, IPC Section 506"
                value={form.relevantSections}
                onChange={e => setForm({ ...form, relevantSections: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Court Outcome</label>
              <input
                type="text"
                placeholder="e.g. Petition allowed; proceedings quashed"
                value={form.outcome}
                onChange={e => setForm({ ...form, outcome: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold mb-1">Case Summary & Legal Ratio</label>
            <textarea
              rows={3}
              placeholder="Brief summary of legal argument, facts, and court rationale..."
              value={form.caseSummary}
              onChange={e => setForm({ ...form, caseSummary: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow"
            >
              Submit for Platform Verification
            </button>
          </div>
        </form>
      )}

      {/* RECORD CARDS LIST */}
      <div className="space-y-4">
        {records.map((rec) => (
          <div key={rec.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded">
                  {rec.court} ({rec.year})
                </span>
                <span className="text-xs font-bold text-amber-400">{rec.practiceArea}</span>
              </div>

              {rec.verificationStatus === 'VERIFIED' ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Precedent
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-300 bg-amber-950 px-3 py-1 rounded border border-amber-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Pending Verification
                </span>
              )}
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">{rec.caseTitle}</h3>
              <p className="text-xs text-slate-400 mt-1">{rec.caseSummary}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] pt-1">
              <span className="font-bold text-slate-300">Sections:</span>
              {rec.relevantSections.map((sec, i) => (
                <span key={i} className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded border border-slate-800 font-mono">
                  {sec}
                </span>
              ))}
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-medium">
              <strong className="text-amber-400">Court Outcome:</strong> {rec.outcome}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
