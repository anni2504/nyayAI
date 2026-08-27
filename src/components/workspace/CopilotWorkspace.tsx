import React from 'react';
import { CaseSidebar } from './CaseSidebar';
import { ChatWindow } from './ChatWindow';
import { IntelligencePanel } from './IntelligencePanel';

export const CopilotWorkspace: React.FC = () => {
  return (
    <div className="flex-1 flex h-[calc(100vh-4rem)] overflow-hidden bg-warm-white relative">
      {/* LEFT SIDEBAR */}
      <CaseSidebar />

      {/* CENTER CHAT */}
      <ChatWindow />

      {/* RIGHT INTELLIGENCE PANEL */}
      <div className="hidden lg:block h-full">
        <IntelligencePanel />
      </div>
    </div>
  );
};
