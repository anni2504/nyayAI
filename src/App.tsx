import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import { RequireRole } from './components/auth/RequireRole';

// PUBLIC & SHARED COMPONENTS
import { Navbar } from './components/navigation/Navbar';
import { LandingPage } from './components/landing/LandingPage';
import { MatchEvidenceDrawer } from './components/shared/MatchEvidenceDrawer';
import { ReadinessBreakdownModal } from './components/shared/ReadinessBreakdownModal';

// CLIENT COMPONENTS
import { ClientNavbar } from './components/navigation/ClientNavbar';
import { ClientSidebar } from './components/navigation/ClientSidebar';
import { ClientDashboard } from './components/client/ClientDashboard';
import { CopilotWorkspace } from './components/workspace/CopilotWorkspace';
import { ClientCaseWorkspace } from './components/client/ClientCaseWorkspace';
import { ClientDocumentVault } from './components/client/ClientDocumentVault';
import { ClientAdvocateDiscovery } from './components/client/ClientAdvocateDiscovery';
import { ClientSavedAdvocates } from './components/client/ClientSavedAdvocates';
import { ClientBookings } from './components/client/ClientBookings';
import { ClientSettings } from './components/client/ClientSettings';

// ADVOCATE COMPONENTS
import { AdvocateNavbar } from './components/navigation/AdvocateNavbar';
import { AdvocateSidebar } from './components/navigation/AdvocateSidebar';
import { AdvocateDashboard } from './components/advocate-app/AdvocateDashboard';
import { AdvocateAIAssistant } from './components/advocate-app/AdvocateAIAssistant';
import { AdvocateColleagueChat } from './components/advocate-app/AdvocateColleagueChat';
import { AdvocateLeads } from './components/advocate-app/AdvocateLeads';
import { AdvocateMatches } from './components/advocate-app/AdvocateMatches';
import { AdvocateClients } from './components/advocate-app/AdvocateClients';
import { AdvocateCaseHistoryManager } from './components/advocate-app/AdvocateCaseHistoryManager';
import { AdvocateVerifiedCases } from './components/advocate-app/AdvocateVerifiedCases';
import { AdvocateProfileManager } from './components/advocate-app/AdvocateProfileManager';
import { AdvocateAnalytics } from './components/advocate-app/AdvocateAnalytics';
import { AdvocateSettings } from './components/advocate-app/AdvocateSettings';

const AppContent: React.FC = () => {
  const { unauthorizedNotice } = useAuth();
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // PUBLIC LANDING ROUTE
  const isPublicRoute = currentHash === '#/' || currentHash === '' || currentHash === '#/signin' || currentHash === '#/about' || currentHash === '#/how-it-works';

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-warm-white flex flex-col">
        <Navbar />
        <LandingPage />
        <MatchEvidenceDrawer />
        <ReadinessBreakdownModal />
      </div>
    );
  }

  // CLIENT APP ROUTES (#/client/*)
  const isClientRoute = currentHash.startsWith('#/client');

  if (isClientRoute) {
    return (
      <RequireRole allowedRoles={['CLIENT']}>
        <div className="min-h-screen bg-warm-white flex flex-col">
          <ClientNavbar />
          
          {unauthorizedNotice && (
            <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center">
              {unauthorizedNotice}
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            <ClientSidebar currentPath={currentHash} />
            <main className="flex-1 flex overflow-hidden">
              {currentHash === '#/client' && <ClientDashboard />}
              {currentHash === '#/client/copilot' && <CopilotWorkspace />}
              {currentHash.startsWith('#/client/cases') && <ClientCaseWorkspace />}
              {currentHash.startsWith('#/client/documents') && <ClientDocumentVault />}
              {currentHash.startsWith('#/client/advocates') && <ClientAdvocateDiscovery />}
              {currentHash === '#/client/saved-advocates' && <ClientSavedAdvocates />}
              {currentHash === '#/client/bookings' && <ClientBookings />}
              {currentHash === '#/client/settings' && <ClientSettings />}
            </main>
          </div>

          <MatchEvidenceDrawer />
          <ReadinessBreakdownModal />
        </div>
      </RequireRole>
    );
  }

  // ADVOCATE APP ROUTES (#/advocate/*)
  const isAdvocateRoute = currentHash.startsWith('#/advocate');

  if (isAdvocateRoute) {
    return (
      <RequireRole allowedRoles={['ADVOCATE']}>
        <div className="min-h-screen bg-warm-white flex flex-col">
          <AdvocateNavbar />

          {unauthorizedNotice && (
            <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center">
              {unauthorizedNotice}
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            <AdvocateSidebar currentPath={currentHash} />
            <main className="flex-1 flex overflow-hidden">
              {currentHash === '#/advocate' && <AdvocateDashboard />}
              {currentHash === '#/advocate/ai-assistant' && <AdvocateAIAssistant />}
              {currentHash === '#/advocate/colleagues' && <AdvocateColleagueChat />}
              {currentHash === '#/advocate/leads' && <AdvocateLeads />}
              {currentHash === '#/advocate/matches' && <AdvocateMatches />}
              {currentHash === '#/advocate/clients' && <AdvocateClients />}
              {currentHash === '#/advocate/case-history' && <AdvocateCaseHistoryManager />}
              {currentHash === '#/advocate/case-history/verified' && <AdvocateVerifiedCases />}
              {currentHash === '#/advocate/profile' && <AdvocateProfileManager />}
              {currentHash === '#/advocate/analytics' && <AdvocateAnalytics />}
              {currentHash === '#/advocate/settings' && <AdvocateSettings />}
            </main>
          </div>

          <MatchEvidenceDrawer />
          <ReadinessBreakdownModal />
        </div>
      </RequireRole>
    );
  }

  // FALLBACK ROUTE: DEFAULT TO PUBLIC LANDING
  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      <Navbar />
      <LandingPage />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CaseProvider>
        <AppContent />
      </CaseProvider>
    </AuthProvider>
  );
};

export default App;
