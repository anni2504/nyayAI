import React, { useState, useRef } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { Send, Paperclip, FileText, X, Sparkles, Loader2 } from 'lucide-react';

export const ChatInput: React.FC = () => {
  const { sendMessage } = useCaseContext();
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (isSending) return;
    if (!text.trim() && !attachment) return;

    setIsSending(true);

    try {
      const userMessageText = text.trim() || (attachment ? `Uploaded document: ${attachment.name}` : '');
      const currentAttachment = attachment || undefined;

      // Clear local composer state immediately to prevent duplicate sends
      setText('');
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Execute single send pipeline
      await sendMessage(userMessageText, currentAttachment);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && (text.trim() || attachment)) {
        handleSend();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size <= 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10 MB limit. Please select a smaller document.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const fileData = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type || 'application/pdf'
      };

      // Set pending attachment in composer (DOES NOT trigger API or AI response!)
      setAttachment(fileData);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 bg-white border-t border-slate-200 shadow-subtle">
      <div className="max-w-4xl mx-auto space-y-2">
        
        {/* ATTACHMENT CARD PREVIEW (PENDING / UN-SENT) */}
        {attachment && (
          <div className="flex items-center justify-between p-3 bg-indigo-50/90 rounded-xl border border-indigo-200 text-xs shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-900 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">{attachment.name}</span>
                <span className="text-[11px] text-slate-500">{attachment.size} • Attached (press Send to analyze)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveAttachment}
              disabled={isSending}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-smooth"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* INPUT CONTAINER */}
        <div className="relative bg-warm-white border border-slate-300 focus-within:border-indigo-900 focus-within:ring-2 focus-within:ring-indigo-900/10 rounded-2xl p-2 transition-smooth shadow-subtle flex items-end space-x-2">
          
          {/* FILE ATTACHMENT TRIGGER */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            disabled={isSending}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-50 rounded-xl transition-smooth shrink-0"
            title="Attach legal document or FIR copy"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* TEXTAREA */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder={
              attachment
                ? "Add an optional message or instructions for this document..."
                : "Describe your legal concern, facts, or ask a question about your case..."
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none py-2 max-h-32 min-h-[40px] disabled:opacity-50"
          />

          {/* SEND BUTTON */}
          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && !attachment) || isSending}
            className={`p-2.5 rounded-xl transition-smooth shrink-0 font-bold flex items-center justify-center ${
              (text.trim() || attachment) && !isSending
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>

        </div>

        {/* FOOTER NOTICE */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 font-medium">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" /> Grounded under Indian Penal Code & High Court Precedents
          </span>
          <span className="hidden sm:inline">Press Enter to send • Shift + Enter for new line</span>
        </div>

      </div>
    </div>
  );
};
