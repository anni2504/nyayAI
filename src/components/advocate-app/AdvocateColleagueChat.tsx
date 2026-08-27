import React, { useState } from 'react';
import { Send, ShieldCheck, Lock } from 'lucide-react';

export const AdvocateColleagueChat: React.FC = () => {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'Adv. Vikramaditya Singhania',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      time: '11:30 AM',
      text: 'Adv. Varma, do you have any recent Karnataka High Court Section 482 precedents on quashing boundary dispute FIRs where police CSR was delayed?'
    },
    {
      id: 'm2',
      sender: 'You (Adv. Rajesh Varma)',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      time: '11:35 AM',
      text: 'Yes, check State of Karnataka v. S. Kumar (2024). High Court granted complete quashing due to malafide delay and private civil nature of boundary altercation.'
    }
  ]);

  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([
      ...messages,
      {
        id: `m-${Date.now()}`,
        sender: 'You (Adv. Rajesh Varma)',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
        time: 'Just now',
        text: input
      }
    ]);
    setInput('');
  };

  return (
    <div className="flex-1 bg-warm-white text-slate-900 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 flex flex-col h-full">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded border border-amber-200">
            Professional Bar Counsel Channel
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 mt-1">Advocate Colleague Network</h1>
        </div>
        <div className="text-xs text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs font-bold">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Advocate Channel</span>
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
        {messages.map((m) => (
          <div key={m.id} className="p-4 bg-warm-white rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src={m.avatar} alt={m.sender} className="w-7 h-7 rounded-lg object-cover ring-1 ring-amber-500" />
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <span>{m.sender}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </span>
              </div>
              <span className="text-[10px] text-slate-400">{m.time}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed pl-9 font-medium">{m.text}</p>
          </div>
        ))}
      </div>

      {/* INPUT FORM */}
      <form onSubmit={handleSend} className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-subtle">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Consult with verified High Court advocate colleagues..."
          className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-900 focus:outline-none placeholder-slate-400 font-medium"
        />
        <button
          type="submit"
          className="bg-slate-950 hover:bg-slate-900 text-amber-400 p-3 rounded-xl font-bold transition-smooth shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
