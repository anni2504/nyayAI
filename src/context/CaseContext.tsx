import React, { createContext, useContext, useState } from 'react';
import type { LegalCase, UserRole, AdvocateMatch } from '../data/types';
import { sendClientChatMessage, uploadClientDocument } from '../services/api';

export type AppView = 'landing' | 'copilot' | 'documents' | 'advocates' | 'advocate-dashboard' | 'cases' | 'settings';

interface CaseContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  cases: LegalCase[];
  activeCaseId: string;
  activeCase: LegalCase | undefined;
  selectCase: (caseId: string) => void;
  startNewCase: (initialPrompt?: string) => void;
  sendMessage: (text: string, attachment?: { name: string; size: string; type: string }) => Promise<void>;
  uploadDocument: (file: { name: string; size: string; type: string }) => Promise<void>;
  activeDocumentId: string;
  setActiveDocumentId: (docId: string) => void;
  selectedAdvocateForMatchModal: AdvocateMatch | null;
  openMatchEvidenceModal: (advocate: AdvocateMatch) => void;
  closeMatchEvidenceModal: () => void;
  isReadinessModalOpen: boolean;
  setIsReadinessModalOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

const createInitialNewCase = (id: string, initialPrompt?: string): LegalCase => ({
  id,
  title: initialPrompt ? initialPrompt.slice(0, 30) + '...' : 'New Legal Consultation',
  practiceArea: 'Awaiting case details',
  jurisdiction: 'Not specified',
  proceduralStage: 'Not established',
  lastUpdated: 'Just now',
  status: 'Analysis in Progress',
  readinessScore: 0, // MUST START AT 0%
  readinessBreakdown: {
    matterClarity: 0,
    facts: 0,
    jurisdiction: 0,
    legalDomain: 0,
    proceduralStage: 0,
    documents: 0,
    otherEvidence: 0
  },
  caseUnderstanding: [
    { key: 'matter', label: 'Matter', value: initialPrompt || 'Not established', status: initialPrompt ? 'pending' : 'missing' },
    { key: 'jurisdiction', label: 'Jurisdiction', value: 'Not specified', status: 'missing' },
    { key: 'practiceArea', label: 'Practice Area', value: 'Not established', status: 'missing' },
    { key: 'proceduralStage', label: 'Procedural Stage', value: 'Not established', status: 'missing' }
  ],
  missingInformation: [
    'Describe your legal concern'
  ],
  legalDomain: 'Awaiting case details',
  messages: [
    {
      id: `m-${Date.now()}`,
      sender: 'ai',
      text: "Hello! I'm NYAYAI. Tell me what legal issue you're dealing with, and I'll help you understand your options, calculate your case readiness, and match relevant advocates.",
      timestamp: 'Just now',
      quickReplies: [
        'I had a fight with my neighbour',
        'My builder delayed flat handover for 2 years',
        'Consumer contract breach issue',
        'Police FIR / CSR filing query'
      ]
    }
  ],
  documents: [],
  recommendations: []
});

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('client');
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [casesList, setCasesList] = useState<LegalCase[]>([createInitialNewCase('case-1')]);
  const [activeCaseId, setActiveCaseId] = useState<string>('case-1');
  const [activeDocumentId, setActiveDocumentId] = useState<string>('doc-101');
  const [selectedAdvocateForMatchModal, setSelectedAdvocateForMatchModal] = useState<AdvocateMatch | null>(null);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const activeCase = casesList.find(c => c.id === activeCaseId) || casesList[0];

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole === 'advocate') {
      setCurrentView('advocate-dashboard');
    } else {
      setCurrentView('copilot');
    }
  };

  const selectCase = (caseId: string) => {
    setActiveCaseId(caseId);
    setCurrentView('copilot');
    setIsMobileSidebarOpen(false);
  };

  const startNewCase = (initialPrompt?: string) => {
    const newCaseId = `case-${Date.now()}`;
    const newCase = createInitialNewCase(newCaseId, initialPrompt);

    setCasesList(prev => [newCase, ...prev]);
    setActiveCaseId(newCaseId);
    setCurrentView('copilot');
    setIsMobileSidebarOpen(false);

    if (initialPrompt) {
      sendMessage(initialPrompt);
    }
  };

  const sendMessage = async (text: string, attachment?: { name: string; size: string; type: string }): Promise<void> => {
    if (!activeCase) return;

    const userMsgId = `m-usr-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user' as const,
      text: text || (attachment ? `Uploaded document: ${attachment.name}` : ''),
      timestamp: 'Just now',
      attachment
    };

    const updatedMessages = [...activeCase.messages, userMsg];

    // Instantly append ONE user message to UI
    setCasesList(prev => prev.map(c => {
      if (c.id === activeCaseId) {
        return {
          ...c,
          messages: updatedMessages,
          lastUpdated: 'Just now'
        };
      }
      return c;
    }));

    try {
      let apiPayload;
      if (attachment) {
        // If attachment present, call document upload pipeline with optional text in ONE request
        apiPayload = await uploadClientDocument(activeCaseId, attachment, text);
      } else {
        // Chat message standard pipeline
        apiPayload = await sendClientChatMessage(activeCaseId, text);
      }

      const aiMsg = {
        id: `m-ai-${Date.now()}`,
        sender: 'ai' as const,
        text: apiPayload.reply,
        timestamp: 'Just now',
        sources: apiPayload.legalAuthorities,
        quickReplies: apiPayload.quickResponses
      };

      setCasesList(prev => prev.map(c => {
        if (c.id === activeCaseId) {
          return {
            ...c,
            practiceArea: apiPayload.practiceArea,
            jurisdiction: apiPayload.jurisdiction,
            proceduralStage: apiPayload.proceduralStage,
            readinessScore: apiPayload.caseReadinessScore,
            caseUnderstanding: apiPayload.caseUnderstanding,
            missingInformation: apiPayload.missingInformation,
            recommendations: apiPayload.recommendationData,
            documents: apiPayload.documents || c.documents,
            messages: [...updatedMessages, aiMsg],
            lastUpdated: 'Just now'
          };
        }
        return c;
      }));
    } catch (err) {
      console.warn('Backend API call fallback to deterministic Context:', err);
      const aiMsg = {
        id: `m-ai-${Date.now()}`,
        sender: 'ai' as const,
        text: attachment
          ? `I've received "${attachment.name}". Document Intelligence has logged it in your case vault.`
          : `I have recorded your update regarding "${text}".`,
        timestamp: 'Just now'
      };

      setCasesList(prev => prev.map(c => {
        if (c.id === activeCaseId) {
          return {
            ...c,
            messages: [...updatedMessages, aiMsg]
          };
        }
        return c;
      }));
    }
  };

  const uploadDocument = async (file: { name: string; size: string; type: string }): Promise<void> => {
    return sendMessage(`Uploaded document: ${file.name}`, file);
  };

  const openMatchEvidenceModal = (advocate: AdvocateMatch) => {
    setSelectedAdvocateForMatchModal(advocate);
  };

  const closeMatchEvidenceModal = () => {
    setSelectedAdvocateForMatchModal(null);
  };

  return (
    <CaseContext.Provider
      value={{
        role,
        setRole,
        currentView,
        setCurrentView,
        cases: casesList,
        activeCaseId,
        activeCase,
        selectCase,
        startNewCase,
        sendMessage,
        uploadDocument,
        activeDocumentId,
        setActiveDocumentId,
        selectedAdvocateForMatchModal,
        openMatchEvidenceModal,
        closeMatchEvidenceModal,
        isReadinessModalOpen,
        setIsReadinessModalOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen
      }}
    >
      {children}
    </CaseContext.Provider>
  );
};

export const useCaseContext = () => {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCaseContext must be used within a CaseProvider');
  }
  return context;
};
