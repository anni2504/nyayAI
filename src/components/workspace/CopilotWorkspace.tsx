import React from 'react';
import { ChatWindow } from './ChatWindow';
import { IntelligencePanel } from './IntelligencePanel';

export const CopilotWorkspace: React.FC = () => {
  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#FAF8F5] relative">
      {/* CENTER CHAT WORKSPACE */}
      <ChatWindow />

      {/* RIGHT CASE INTELLIGENCE PANEL */}
      <div className="hidden lg:block h-full shrink-0">
        <IntelligencePanel />
      </div>
    </div>
  );
};
