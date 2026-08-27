import React from 'react';
import { UserCheck, Mail, Calendar, ArrowUpRight } from 'lucide-react';

export const AdvocateClients: React.FC = () => {
  const authorizedClients = [
    {
      id: 'cli-1',
      name: 'Rohan Sharma',
      matter: 'Neighbour Boundary Dispute & Physical Obstruction',
      status: 'Active Consultation',
      lastInteraction: 'Today, 2:15 PM',
      jurisdiction: 'Bengaluru, Karnataka',
      consultationDate: 'Tomorrow, Aug 27 at 4:30 PM'
    },
    {
      id: 'cli-2',
      name: 'Kavita Menon',
      matter: '22-Month Builder Possession Delay',
      status: 'RERA Draft Review',
      lastInteraction: 'Yesterday',
      jurisdiction: 'Whitefield, Bengaluru',
      consultationDate: 'Completed Aug 20'
    }
  ];

  return (
    <div className="flex-1 bg-slate-950 text-white p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Authorized Relationships</span>
          <h1 className="text-2xl font-extrabold text-white">My Client Directory</h1>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          Showing {authorizedClients.length} Authorized Clients
        </div>
      </div>

      <div className="space-y-4">
        {authorizedClients.map((client) => (
          <div key={client.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">{client.name}</h3>
                  <p className="text-xs text-slate-400">{client.jurisdiction}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded border border-emerald-800">
                {client.status}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <strong className="text-white block font-bold">{client.matter}</strong>
              <div className="flex items-center space-x-4 text-slate-400 text-[11px] pt-1">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-amber-400" /> {client.consultationDate}</span>
                <span>•</span>
                <span>Last active: {client.lastInteraction}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-1">
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-smooth flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span>Message Client</span>
              </button>
              <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-smooth flex items-center gap-1">
                <span>View Authorized Case</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
