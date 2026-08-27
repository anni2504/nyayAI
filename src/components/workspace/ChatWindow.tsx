import React, { useRef, useEffect } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { ChatInput } from './ChatInput';
import { Scale, BookOpen, Layers, FileText, ChevronRight } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const { activeCase, sendMessage } = useCaseContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCase?.messages]);

  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-warm-white">
        <div className="text-center space-y-3">
          <Scale className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-700">No active case selected</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-warm-white overflow-hidden">
      
      {/* WORKSPACE HEADER */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-subtle flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Case Workspace</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              {activeCase.practiceArea}
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">{activeCase.title}</h2>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Status</div>
            <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeCase.status}
            </div>
          </div>
        </div>
      </div>

      {/* CHAT MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
        
        {activeCase.messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div
              key={msg.id}
              className={`max-w-3xl ${isAi ? 'mr-auto' : 'ml-auto'} animate-in fade-in duration-200`}
            >
              
              <div className={`flex items-center space-x-2 mb-1.5 ${isAi ? '' : 'justify-end'}`}>
                {isAi ? (
                  <>
                    <div className="w-6 h-6 rounded-md bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shadow-xs">
                      <Scale className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">NYAYAI Copilot</span>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                    <span className="text-xs font-bold text-slate-700">You (Client)</span>
                  </>
                )}
              </div>

              {isAi ? (
                <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle text-slate-800 text-sm leading-relaxed">
                  <div className="whitespace-pre-line font-normal text-slate-800">
                    {msg.text}
                  </div>

                  {msg.attachment && (
                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center space-x-3 text-xs">
                      <FileText className="w-4 h-4 text-indigo-900" />
                      <div>
                        <span className="font-bold text-slate-900">{msg.attachment.name}</span>
                        <span className="text-[11px] text-slate-500 ml-2">({msg.attachment.size})</span>
                      </div>
                    </div>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-800" />
                        <span>Statutory Citations & Authority</span>
                      </div>
                      <div className="space-y-1">
                        {msg.sources.map((src, i) => (
                          <div key={i} className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 font-mono">
                            {src}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.concepts && msg.concepts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {msg.concepts.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          <Layers className="w-3 h-3 text-slate-500" /> {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Responses</div>
                      <div className="flex flex-wrap gap-2">
                        {msg.quickReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(reply)}
                            className="text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-950 px-3.5 py-2 rounded-xl border border-indigo-200 transition-smooth flex items-center gap-1.5 hover:shadow-xs"
                          >
                            <span>{reply}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-indigo-700" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-subtle text-sm leading-relaxed max-w-xl ml-auto">
                  {msg.text}
                  {msg.attachment && (
                    <div className="mt-2.5 p-2.5 bg-slate-800 rounded-xl border border-slate-700 flex items-center space-x-2 text-xs text-amber-300">
                      <FileText className="w-4 h-4" />
                      <span>{msg.attachment.name} ({msg.attachment.size})</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput />

    </div>
  );
};
