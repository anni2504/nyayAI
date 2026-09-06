import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LegalCase, AdvocateMatch } from '../data/types';
import { sendClientChatMessage } from '../services/api';
import {
  fetchClientCases,
  createClientCase,
  type LegalCaseSummary
} from '../services/api';
import { useAuth } from './AuthContext';

export type AppView = 'landing' | 'copilot' | 'documents' | 'advocates' | 'advocate-dashboard' | 'cases' | 'settings';

interface CaseContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  cases: LegalCase[];
  activeCaseId: string;
  activeCase: LegalCase | undefined;
  selectCase: (caseId: string) => void;
  startNewCase: (initialPrompt?: string) => void;
  sendMessage: (text: string, attachment?: { name: string; size: string; type: string }, opts?: { targetCaseId?: string }) => Promise<void>;
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
  isCasesLoading: boolean;
  casesError: string | null;
  refreshCases: () => Promise<void>;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return 'Just now';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'Just now';
  }
}

function summaryToLegalCase(s: LegalCaseSummary): LegalCase {
  const messages = (s.messages || []).map((m, idx) => ({
    id: `m-${s.id}-${idx}`,
    sender: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
    text: m.content,
    timestamp: m.timestamp || 'Just now',
    quickReplies: (m.role === 'assistant' || m.role === 'ai') && idx === 0 && s.quickResponses?.length ? s.quickResponses : undefined,
    sources: (m.role === 'assistant' || m.role === 'ai') && s.legalAuthorities?.length ? s.legalAuthorities : undefined,
  }));

  return {
    id: s.id,
    title: s.title,
    practiceArea: s.practiceArea,
    jurisdiction: s.jurisdiction,
    proceduralStage: s.proceduralStage,
    lastUpdated: formatRelativeTime(s.lastUpdated),
    status: s.status,
    readinessScore: s.readinessScore,
    readinessBreakdown: s.readinessBreakdown,
    caseUnderstanding: s.caseUnderstanding || [],
    missingInformation: s.missingInformation || [],
    legalDomain: s.legalDomain,
    messages,
    documents: s.documents || [],
    recommendations: s.recommendations || [],
  };
}

const WELCOME_TEXT = "Hello! I'm NYAYAI. Tell me what legal issue you're dealing with, and I'll help you understand your options, calculate your case readiness, and match relevant advocates.";
const WELCOME_QUICK_REPLIES = [
  'I had a fight with my neighbour',
  'My builder delayed flat handover for 2 years',
  'Consumer contract breach issue',
  'Police FIR / CSR filing query'
];

function createLocalPlaceholder(id: string, initialPrompt?: string): LegalCase {
  return {
    id,
    title: initialPrompt ? initialPrompt.slice(0, 30) + '...' : 'New Legal Consultation',
    practiceArea: 'Awaiting case details',
    jurisdiction: 'Not specified',
    proceduralStage: 'Not established',
    lastUpdated: 'Just now',
    status: 'Analysis in Progress',
    readinessScore: 0,
    readinessBreakdown: {
      matterClarity: 0, facts: 0, jurisdiction: 0, legalDomain: 0,
      proceduralStage: 0, documents: 0, otherEvidence: 0
    },
    caseUnderstanding: [
      { key: 'matter', label: 'Matter', value: initialPrompt || 'Not established', status: initialPrompt ? 'pending' : 'missing' },
      { key: 'jurisdiction', label: 'Jurisdiction', value: 'Not specified', status: 'missing' },
      { key: 'practiceArea', label: 'Practice Area', value: 'Not established', status: 'missing' },
      { key: 'proceduralStage', label: 'Procedural Stage', value: 'Not established', status: 'missing' }
    ],
    missingInformation: ['Describe your legal concern'],
    legalDomain: 'Awaiting case details',
    messages: [{
      id: `m-welcome-${Date.now()}`,
      sender: 'ai',
      text: WELCOME_TEXT,
      timestamp: 'Just now',
      quickReplies: WELCOME_QUICK_REPLIES
    }],
    documents: [],
    recommendations: []
  };
}

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [casesList, setCasesList] = useState<LegalCase[]>(() => [createLocalPlaceholder('case-1')]);
  const [activeCaseId, setActiveCaseId] = useState<string>('case-1');
  const [activeDocumentId, setActiveDocumentId] = useState<string>('doc-101');
  const [selectedAdvocateForMatchModal, setSelectedAdvocateForMatchModal] = useState<AdvocateMatch | null>(null);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isCasesLoading, setIsCasesLoading] = useState<boolean>(false);
  const [casesError, setCasesError] = useState<string | null>(null);

  const isClient = isAuthenticated && role === 'CLIENT';

  const refreshCases = useCallback(async () => {
    if (!isClient) return;
    setIsCasesLoading(true);
    setCasesError(null);
    try {
      const res = await fetchClientCases();
      const mapped = res.cases.map(summaryToLegalCase);
      setCasesList(mapped);
      if (mapped.length > 0) {
        setActiveCaseId(prev => mapped.some(c => c.id === prev) ? prev : mapped[0].id);
      }
      setCasesError(null);
    } catch (err: any) {
      console.warn('[CaseContext] Failed to load cases from backend:', err);
      setCasesError(err.message || 'Could not load your cases.');
    } finally {
      setIsCasesLoading(false);
    }
  }, [isClient]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (isClient) {
      refreshCases();
    } else {
      setCasesList([createLocalPlaceholder('case-1')]);
      setActiveCaseId('case-1');
      setCasesError(null);
      setIsCasesLoading(false);
    }
  }, [isClient, isAuthLoading]);

  const activeCase = casesList.find(c => c.id === activeCaseId) || casesList[0];

  const selectCase = (caseId: string) => {
    setActiveCaseId(caseId);
    setCurrentView('copilot');
    setIsMobileSidebarOpen(false);
  };

  const startNewCase = async (initialPrompt?: string) => {
    setCurrentView('copilot');
    setIsMobileSidebarOpen(false);

    if (isClient) {
      try {
        const res = await createClientCase(initialPrompt || 'New Legal Consultation');
        const newCase = summaryToLegalCase(res.case);
        setCasesList(prev => [newCase, ...prev]);
        setActiveCaseId(newCase.id);
        setCasesError(null);
        if (initialPrompt) {
          await sendMessage(initialPrompt, undefined, { targetCaseId: newCase.id });
        }
        return;
      } catch (err: any) {
        console.warn('[CaseContext] Backend create failed, using local fallback:', err);
        setCasesError(err.message || 'Could not create case on server.');
      }
    }

    const newCaseId = `case-${Date.now()}`;
    const newCase = createLocalPlaceholder(newCaseId, initialPrompt);
    setCasesList(prev => [newCase, ...prev]);
    setActiveCaseId(newCaseId);
    if (initialPrompt) {
      await sendMessage(initialPrompt, undefined, { targetCaseId: newCaseId });
    }
  };

  const sendMessage = async (
    text: string,
    attachment?: { name: string; size: string; type: string },
    opts?: { targetCaseId?: string }
  ): Promise<void> => {
    const targetId = opts?.targetCaseId || activeCaseId;
    const targetCase = casesList.find(c => c.id === targetId) || casesList[0];
    if (!targetCase) return;

    const userMsgId = `m-usr-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user' as const,
      text: text || (attachment ? `Uploaded document: ${attachment.name}` : ''),
      timestamp: 'Just now',
      attachment
    };

    const updatedMessages = [...targetCase.messages, userMsg];

    setCasesList(prev => prev.map(c =>
      c.id === targetId ? { ...c, messages: updatedMessages, lastUpdated: 'Just now' } : c
    ));

    try {
      const apiPayload = await sendClientChatMessage(targetId, text, attachment);

      const aiMsg = {
        id: `m-ai-${Date.now()}`,
        sender: 'ai' as const,
        text: apiPayload.reply,
        timestamp: 'Just now',
        sources: apiPayload.legalAuthorities,
        quickReplies: apiPayload.quickResponses
      };

      setCasesList(prev => prev.map(c => {
        if (c.id === targetId) {
          const latestSummary = apiPayload;
          return {
            ...c,
            practiceArea: latestSummary.practiceArea,
            jurisdiction: latestSummary.jurisdiction,
            proceduralStage: latestSummary.proceduralStage,
            readinessScore: latestSummary.caseReadinessScore,
            caseUnderstanding: latestSummary.caseUnderstanding,
            missingInformation: latestSummary.missingInformation,
            recommendations: latestSummary.recommendationData,
            documents: latestSummary.documents || c.documents,
            messages: [...updatedMessages, aiMsg],
            lastUpdated: 'Just now'
          };
        }
        return c;
      }));
    } catch (err) {
      console.warn('[CaseContext] sendMessage API call failed, using fallback:', err);
      const aiMsg = {
        id: `m-ai-${Date.now()}`,
        sender: 'ai' as const,
        text: attachment
          ? `I've received "${attachment.name}". Document Intelligence has logged it in your case vault.`
          : `I have recorded your update regarding "${text}".`,
        timestamp: 'Just now'
      };

      setCasesList(prev => prev.map(c =>
        c.id === targetId ? { ...c, messages: [...updatedMessages, aiMsg] } : c
      ));
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
        setIsMobileSidebarOpen,
        isCasesLoading,
        casesError,
        refreshCases
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
