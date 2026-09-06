import React, { useRef, useEffect } from 'react';
import { useCaseContext } from '../../context/CaseContext';
import { useAuth } from '../../context/AuthContext';
import { ChatInput } from './ChatInput';
import { Scale, BookOpen, Layers, FileText, ChevronRight, Edit3, ArrowLeft, MapPin } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const { activeCase, sendMessage } = useCaseContext();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCase?.messages]);

  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FAF8F5]">
        <div className="text-center space-y-3 bg-white p-8 rounded-3xl border border-[#0B1024]/8 shadow-2xs">
          <Scale className="w-10 h-10 text-[#C88A32] mx-auto" />
          <h3 className="text-lg font-bold text-[#0B1024] font-serif">No active case selected</h3>
          <p className="text-xs text-[#4F586B]">Select or create a new case to start your consultation.</p>
        </div>
      </div>
    );
  }

  const practiceAreaDisplay = activeCase.practiceArea && activeCase.practiceArea !== 'Awaiting case details'
    ? activeCase.practiceArea
    : 'Criminal Defense & Property';

  const readinessPercentage = activeCase.readinessScore > 0 ? activeCase.readinessScore : 10;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF8F5] overflow-hidden">
      
      {/* WORKSPACE TOP HEADER BAR */}
      <div className="p-4 sm:p-5 bg-white border-b border-[#0B1024]/8 shadow-2xs space-y-2 shrink-0">
        
        {/* BACK LINK */}
        <button
          onClick={() => window.location.hash = '#/client/cases'}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#4F586B] hover:text-[#0B1024] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Cases</span>
        </button>

        {/* TITLE & EDIT ICON */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#0B1024] font-serif tracking-tight">
              {activeCase.title || 'New Legal Consultation'}
            </h2>
            <button className="p-1 text-slate-400 hover:text-[#0B1024] rounded-lg transition-colors cursor-pointer" title="Edit Case Title">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          {/* METADATA PILLS ROW */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* DOMAIN PILL */}
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-900 font-semibold text-xs shadow-2xs">
              <span>⚖️</span>
              <span>{practiceAreaDisplay}</span>
            </span>

            {/* STATUS PILL */}
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 font-semibold text-xs shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active · {activeCase.status || 'Analysis in Progress'}</span>
            </span>

            {/* READINESS PILL */}
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 font-bold text-xs shadow-2xs">
              <span>🎯</span>
              <span>Readiness: {readinessPercentage}%</span>
            </span>

            {/* TIMESTAMP */}
            <span className="text-xs text-slate-400 font-medium ml-1">
              Last updated: {activeCase.lastUpdated || 'Just now'}
            </span>
          </div>
        </div>

      </div>

      {/* CHAT MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {activeCase.messages.map((msg, index) => {
          const isAi = msg.sender === 'ai';
          const isFirstMessage = index === 0;

          return (
            <div
              key={msg.id}
              className={`max-w-3xl ${isAi ? 'mr-auto' : 'ml-auto'} animate-in fade-in duration-200 space-y-2`}
            >
              <div className={`flex items-start space-x-3 ${isAi ? '' : 'flex-row-reverse space-x-reverse'}`}>
                
                {/* AVATAR */}
                {isAi ? (
                  <div className="w-9 h-9 rounded-full bg-[#0B1024] text-[#D89947] flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 mt-1">
                    <Scale className="w-4 h-4 text-[#D89947]" />
                  </div>
                ) : (
                  <img
                    src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"}
                    alt="User"
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-[#0B1024]/15 shadow-2xs shrink-0 mt-1"
                  />
                )}

                {/* BUBBLE CONTENT */}
                <div className={`space-y-3 ${isAi ? 'flex-1' : 'max-w-xl'}`}>
                  
                  {isAi ? (
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#0B1024]/8 shadow-2xs text-[#0B1024] text-xs sm:text-sm leading-relaxed space-y-3">
                      <div className="whitespace-pre-line font-medium text-[#0B1024]">
                        {msg.text}
                      </div>

                      {msg.attachment && (
                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#0B1024]/8 flex items-center space-x-3 text-xs">
                          <FileText className="w-4 h-4 text-[#C88A32]" />
                          <div>
                            <span className="font-bold text-[#0B1024]">{msg.attachment.name}</span>
                            <span className="text-[11px] text-slate-500 ml-2">({msg.attachment.size})</span>
                          </div>
                        </div>
                      )}

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-3 border-t border-[#0B1024]/5 space-y-2">
                          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#C88A32] uppercase tracking-wider">
                            <BookOpen className="w-3.5 h-3.5 text-[#C88A32]" />
                            <span>Statutory Provisions & Authority</span>
                          </div>
                          <div className="space-y-1">
                            {msg.sources.map((src, i) => (
                              <div key={i} className="text-xs text-[#0B1024] bg-[#FAF8F5] p-2.5 rounded-lg border border-[#0B1024]/8 font-mono">
                                {src}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.concepts && msg.concepts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.concepts.map((c, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B1024] bg-[#FAF8F5] px-2.5 py-1 rounded-md border border-[#0B1024]/8">
                              <Layers className="w-3 h-3 text-[#C88A32]" /> {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#0B1024] text-white p-4 rounded-2xl shadow-xs text-xs sm:text-sm font-medium leading-relaxed">
                      {msg.text}
                      {msg.attachment && (
                        <div className="mt-2 p-2 bg-white/10 rounded-xl border border-white/15 flex items-center space-x-2 text-xs text-[#D89947]">
                          <FileText className="w-4 h-4" />
                          <span>{msg.attachment.name} ({msg.attachment.size})</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TIMESTAMP */}
                  <div className={`text-[10px] text-slate-400 font-medium ${isAi ? 'text-left pl-1' : 'text-right pr-1'}`}>
                    {msg.timestamp || '12:04 PM'}
                  </div>

                  {/* QUICK PROMPT CHIPS CONTAINER FOR FIRST WELCOME MESSAGE */}
                  {isAi && isFirstMessage && (
                    <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100/70 space-y-2.5 shadow-2xs mt-2">
                      <div className="text-xs font-bold text-slate-700">You can try asking:</div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "I had a fight with my neighbour",
                          "My builder delayed flat handover",
                          "Consumer contract breach issue",
                          "Police FIR / CSR filing query"
                        ].map((promptText, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(promptText)}
                            className="bg-white hover:bg-indigo-100/80 text-indigo-950 border border-indigo-200/90 text-xs font-medium px-3.5 py-1.5 rounded-full shadow-2xs transition-all cursor-pointer hover:border-indigo-300"
                          >
                            {promptText}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QUICK REPLIES CHIPS FOR SPECIFIC QUESTIONS (E.G. LOCATION PROMPT) */}
                  {isAi && !isFirstMessage && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100/70 space-y-2.5 shadow-2xs mt-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-700" />
                        <span>You can type your city or choose one below:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.quickReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(reply)}
                            className="bg-white hover:bg-indigo-100/80 text-indigo-950 border border-indigo-200/90 text-xs font-medium px-3.5 py-1.5 rounded-full shadow-2xs transition-all cursor-pointer flex items-center gap-1 hover:border-indigo-300"
                          >
                            <span>{reply}</span>
                            <ChevronRight className="w-3 h-3 text-indigo-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* FIXED BOTTOM COMPOSER */}
      <ChatInput />

    </div>
  );
};
