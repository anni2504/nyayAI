import React, { useState, useRef } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { Send, Paperclip, FileText, X, Loader2, Mic } from 'lucide-react';

export const ChatInput: React.FC = () => {
  const { sendMessage } = useCaseContext();
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (isSending) return;
    if (!text.trim() && !attachment) return;

    setIsSending(true);

    try {
      const userMessageText = text.trim() || (attachment ? `Uploaded document: ${attachment.name}` : '');
      const currentAttachment = attachment || undefined;

      setText('');
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await sendMessage(userMessageText, currentAttachment);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isSending && (text.trim() || attachment)) {
        handleSend();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

      setAttachment(fileData);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleMic = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setText(prev => prev + (prev ? ' ' : '') + 'Pune, Maharashtra');
    }
  };

  return (
    <div className="p-4 bg-[#FAF8F5] border-t border-[#0B1024]/8 shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        
        {/* ATTACHMENT CARD PREVIEW (UN-SENT) */}
        {attachment && (
          <div className="flex items-center justify-between p-3 bg-[#FAF6EE] rounded-xl border border-[#D89947]/30 text-xs shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#0B1024] text-[#D89947] flex items-center justify-center font-bold shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-[#0B1024] block">{attachment.name}</span>
                <span className="text-[11px] text-slate-500">{attachment.size} • Attached (press Send to analyze)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveAttachment}
              disabled={isSending}
              className="p-1.5 text-slate-400 hover:text-[#0B1024] hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* INPUT CONTAINER BAR */}
        <div className="relative bg-white border border-[#0B1024]/12 focus-within:border-[#0B1024] focus-within:ring-2 focus-within:ring-[#0B1024]/5 rounded-2xl p-2 transition-all shadow-2xs flex items-center space-x-2">
          
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
            className="p-2.5 text-slate-500 hover:text-[#0B1024] hover:bg-[#FAF8F5] disabled:opacity-50 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="Attach legal document or FIR copy"
          >
            <Paperclip className="w-5 h-5 text-slate-500" />
          </button>

          {/* SINGLE-LINE INPUT FIELD */}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder={
              attachment
                ? "Add an optional message or instructions for this document..."
                : "Type your message here... (e.g. Pune, Maharashtra)"
            }
            className="flex-1 bg-transparent text-xs sm:text-sm text-[#0B1024] placeholder:text-slate-400 focus:outline-none py-2 px-1 disabled:opacity-50 font-medium"
          />

          {/* MICROPHONE BUTTON */}
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
              isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-500 hover:text-[#0B1024] hover:bg-[#FAF8F5]'
            }`}
            title="Voice message input"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* SEND BUTTON */}
          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && !attachment) || isSending}
            className={`p-3 rounded-xl transition-all shrink-0 font-bold flex items-center justify-center ${
              (text.trim() || attachment) && !isSending
                ? 'bg-[#0B1024] hover:bg-[#1B2238] text-white shadow-xs cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#D89947]" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>

        </div>

        {/* SUB-CAPTION */}
        <div className="text-[10px] text-slate-400 text-center font-medium pt-0.5">
          NYAYAI may reference relevant legal provisions. This is not a substitute for professional legal advice.
        </div>

      </div>
    </div>
  );
};
