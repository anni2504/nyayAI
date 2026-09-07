import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import { RequireRole } from './components/auth/RequireRole';

// PUBLIC & SHARED COMPONENTS
import { Navbar } from './components/navigation/Navbar';
import { LandingPage } from './components/landing/LandingPage';
import { MatchEvidenceDrawer } from './components/shared/MatchEvidenceDrawer';
import { ReadinessBreakdownModal } from './components/shared/ReadinessBreakdownModal';
import { AuthModal } from './components/auth/AuthModal';

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
import { ClientLegalResearch } from './components/client/ClientLegalResearch';

// ADVOCATE COMPONENTS
import { AdvocateNavbar } from './components/navigation/AdvocateNavbar';
import { AdvocateSidebar } from './components/navigation/AdvocateSidebar';
import { AdvocateDashboard } from './components/advocate-app/AdvocateDashboard';
import { AdvocateAIAssistant } from './components/advocate-app/AdvocateAIAssistant';

import { AdvocateLeads } from './components/advocate-app/AdvocateLeads';

import { AdvocateClients } from './components/advocate-app/AdvocateClients';
import { AdvocateCaseHistoryManager } from './components/advocate-app/AdvocateCaseHistoryManager';
import { AdvocateVerifiedCases } from './components/advocate-app/AdvocateVerifiedCases';
import { AdvocateProfileManager } from './components/advocate-app/AdvocateProfileManager';

import { AdvocateSettings } from './components/advocate-app/AdvocateSettings';
// VIDEO CONSULTATION COMPONENT
import { VideoConsultation } from './components/video/VideoConsultation';

const AppContent: React.FC = () => {
  const { unauthorizedNotice, isLoading } = useAuth();
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Wait for session restoration before rendering protected routes, so a valid
  // session is not briefly mistaken for a guest (avoids a flash of the landing page).
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F5EE] flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-5">
          <div className="relative">
            <img
              src="/assets/nyayai-logo.png"
              alt="NYAYAI"
              className="h-16 sm:h-20 w-auto object-contain animate-pulse"
            />
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest font-sans">
            <div className="w-2 h-2 rounded-full bg-[#C88A32] animate-ping" />
            <span>Restoring secure session…</span>
          </div>
        </div>
      </div>
    );
  }

  // PUBLIC LANDING ROUTE
  const isPublicRoute = currentHash === '#/' || currentHash === '' || currentHash === '#/signin' || currentHash === '#/about' || currentHash === '#/how-it-works';

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#F8F5EE] flex flex-col">
        <Navbar />
        <LandingPage />
        <MatchEvidenceDrawer />
        <ReadinessBreakdownModal />
        <AuthModal />
      </div>
    );
  }

  // CLIENT APP ROUTES (#/client/*)
  const isClientRoute = currentHash.startsWith('#/client');

  if (isClientRoute) {
    const isClientConsultation = currentHash.includes('/consultation/');
    const bookingId = currentHash.split('/consultation/')[1] || 'bk-501';

    return (
      <RequireRole allowedRoles={['CLIENT']}>
        {isClientConsultation ? (
          <VideoConsultation bookingId={bookingId} userRole="CLIENT" />
        ) : (
          <div className="h-screen bg-[#F8F5EE] flex overflow-hidden">
            <ClientSidebar currentPath={currentHash} />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <ClientNavbar />
              
              {unauthorizedNotice && (
                <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center shrink-0">
                  {unauthorizedNotice}
                </div>
              )}

              <main className="flex-1 flex overflow-hidden bg-[#F8F5EE]">
                {currentHash === '#/client' && <ClientDashboard />}
                {currentHash === '#/client/copilot' && <CopilotWorkspace />}
                {currentHash.startsWith('#/client/cases') && <ClientCaseWorkspace />}
                {currentHash.startsWith('#/client/documents') && <ClientDocumentVault />}
                {currentHash.startsWith('#/client/advocates') && <ClientAdvocateDiscovery />}
                {currentHash === '#/client/saved-advocates' && <ClientSavedAdvocates />}
                {currentHash === '#/client/bookings' && <ClientBookings />}
                {currentHash === '#/client/legal-research' && <ClientLegalResearch />}
                {currentHash === '#/client/settings' && <ClientSettings />}
              </main>
            </div>

            <MatchEvidenceDrawer />
            <ReadinessBreakdownModal />
            <AuthModal />
          </div>
        )}
      </RequireRole>
    );
  }

  // ADVOCATE APP ROUTES (#/advocate/*)
  const isAdvocateRoute = currentHash.startsWith('#/advocate');

  if (isAdvocateRoute) {
    const isAdvocateConsultation = currentHash.includes('/consultation/');
    const bookingId = currentHash.split('/consultation/')[1] || 'bk-501';

    return (
      <RequireRole allowedRoles={['ADVOCATE']}>
        {isAdvocateConsultation ? (
          <VideoConsultation bookingId={bookingId} userRole="ADVOCATE" />
        ) : (
          <div className="h-screen bg-[#F8F5EE] flex overflow-hidden">
            <AdvocateSidebar currentPath={currentHash} />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <AdvocateNavbar />

              {unauthorizedNotice && (
                <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center shrink-0">
                  {unauthorizedNotice}
                </div>
              )}

              <main className="flex-1 flex overflow-hidden bg-[#F8F5EE]">
                {currentHash === '#/advocate' && <AdvocateDashboard />}
                {currentHash === '#/advocate/ai-assistant' && <AdvocateAIAssistant />}

                {currentHash === '#/advocate/leads' && <AdvocateLeads />}

                {currentHash === '#/advocate/clients' && <AdvocateClients />}
                {currentHash === '#/advocate/case-history' && <AdvocateCaseHistoryManager />}
                {currentHash === '#/advocate/case-history/verified' && <AdvocateVerifiedCases />}
                {currentHash === '#/advocate/profile' && <AdvocateProfileManager />}

                {currentHash === '#/advocate/settings' && <AdvocateSettings />}
              </main>
            </div>

            <MatchEvidenceDrawer />
            <ReadinessBreakdownModal />
            <AuthModal />
          </div>
        )}
      </RequireRole>
    );
  }

  // FALLBACK ROUTE: DEFAULT TO PUBLIC LANDING
  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      <Navbar />
      <LandingPage />
      <AuthModal />
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
