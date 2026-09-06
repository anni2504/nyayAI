import React, { useState } from 'react';
import { Users, ShieldAlert } from 'lucide-react';

export const AdvocateLeads: React.FC = () => {
  const [leads] = useState<any[]>([]);

  return (
    <div className="flex-1 bg-[#FAF8F5] text-[#0B1024] p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-[#0B1024]/8 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C88A32] bg-[#FAF6EE] px-2.5 py-0.5 rounded border border-[#C88A32]/20 font-sans">
            Client Intake
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B1024] mt-1 font-serif">Client Requests</h1>
        </div>
        <div className="text-xs text-[#4F586B] bg-white px-3 py-1.5 rounded-lg border border-[#0B1024]/8 shadow-2xs font-bold">
          Showing {leads.length} Requests
        </div>
      </div>

      {/* PRIVACY CONSENT NOTICE */}
      <div className="p-4 bg-[#FAF6EE] border border-[#C88A32]/20 rounded-2xl flex items-start space-x-3 text-xs text-[#0B1024] shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-[#C88A32] shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-[#0B1024]">Client Privacy & Matter Protection:</strong>
          Client case descriptions are sanitized for initial evaluation. Full private document access is granted only after client consultation authorization.
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#0B1024]/8 p-12 text-center space-y-3 max-w-md mx-auto my-12 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#FAF6EE] text-[#C88A32] flex items-center justify-center mx-auto border border-[#0B1024]/5">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-[#0B1024] font-serif">No client requests yet.</h3>
          <p className="text-xs text-[#4F586B] leading-relaxed">
            New consultation inquiries and representation requests will appear here once submitted by clients.
          </p>
        </div>
      ) : null}

    </div>
  );
};
