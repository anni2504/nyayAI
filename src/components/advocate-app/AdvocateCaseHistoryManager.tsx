import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Clock, BookOpen, Trash2, FileText } from 'lucide-react';
import { fetchAdvocateCaseHistory, createAdvocateCaseHistory, deleteAdvocateCaseHistory, openCorpusPdf } from '../../services/api';
import type { AdvocateCaseHistoryRecord } from '../../services/api';

const EMPTY_FORM = {
  caseTitle: '',
  court: 'Karnataka High Court',
  year: 2024,
  caseType: '',
  practiceArea: 'Criminal Defense',
  jurisdiction: 'Karnataka',
  outcome: '',
  status: 'Judgment'
};

export const AdvocateCaseHistoryManager: React.FC = () => {
  const [records, setRecords] = useState<AdvocateCaseHistoryRecord[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    async function loadRecords() {
      try {
        const res = await fetchAdvocateCaseHistory();
        setRecords(res.records || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load case history.');
        setRecords([]);
      }
    }
    loadRecords();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await createAdvocateCaseHistory({
        caseTitle: form.caseTitle || 'State of Karnataka v. Respondent',
        court: form.court,
        year: Number(form.year) || new Date().getFullYear(),
        caseType: form.caseType || undefined,
        practiceArea: form.practiceArea || undefined,
        jurisdiction: form.jurisdiction || undefined,
        outcome: form.outcome || undefined,
        status: form.status || undefined
      });
      setRecords(prev => [res.record, ...prev]);
      setIsAdding(false);
      setForm({ ...EMPTY_FORM });
    } catch (err: any) {
      setError(err.message || 'Failed to submit case record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteAdvocateCaseHistory(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete case record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenFile = async (rec: AdvocateCaseHistoryRecord) => {
    if (!rec.doc_file_key) return;
    setFileBusy(rec.id);
    setFileError(null);
    const res = await openCorpusPdf(rec.doc_file_key);
    setFileBusy(null);
    if (!res.ok) setFileError(res.error || 'Could not open the case file.');
  };

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">

      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Precedent Repository
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">Case History & Experience Verification</h1>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-[#D89947] hover:bg-[#C58838] text-[#0B1024] font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#0B1024]" />
          <span>Add Case Record</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
          {error}
        </div>
      )}

      {fileError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center justify-between">
          <span>{fileError}</span>
          <button onClick={() => setFileError(null)} className="cursor-pointer text-rose-500 hover:text-rose-700">Dismiss</button>
        </div>
      )}

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
              <label className="block text-slate-400 font-bold mb-1">Case Type</label>
              <input
                type="text"
                placeholder="e.g. Criminal Appeal, Civil Writ"
                value={form.caseType}
                onChange={e => setForm({ ...form, caseType: e.target.value })}
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
              disabled={submitting}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Platform Verification'}
            </button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center space-y-3 max-w-md mx-auto my-12">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-extrabold text-white">No case history added yet.</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Add past judgments, court orders, and verified precedents to establish your court experience profile.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
          <div key={rec.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded">
                  {rec.court} ({rec.year})
                </span>
                <span className="text-xs font-bold text-amber-400">{rec.practice_area}</span>
              </div>

              <div className="flex items-center space-x-2">
                {rec.verification_status === 'verified' ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Precedent
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-300 bg-amber-950 px-3 py-1 rounded border border-amber-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending Verification
                  </span>
                )}
                {rec.doc_file_key && (
                  <button
                    onClick={() => handleOpenFile(rec)}
                    disabled={fileBusy === rec.id}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950 border border-amber-800 px-3 py-1 rounded hover:bg-amber-900 transition-colors cursor-pointer disabled:opacity-50"
                    title="Open the sealed case PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {fileBusy === rec.id ? 'Opening…' : 'View Case PDF'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(rec.id)}
                  disabled={deletingId === rec.id}
                  className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-40"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">{rec.case_title}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {rec.case_type ? `${rec.case_type} · ` : ''}{rec.jurisdiction} · Status: {rec.status || 'Judgment'}
              </p>
            </div>

            {rec.outcome && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-medium">
                <strong className="text-amber-400">Court Outcome:</strong> {rec.outcome}
              </div>
            )}
          </div>
        ))}
      </div>
      )}

    </div>
  );
};