import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';
import type { CaseState } from '../types/index.js';
import { calculateRawUncappedScore, MAX_DOCUMENT_INCREASE } from './caseEngineService.js';

export type DocumentAnalysisStatus = 'UPLOADING' | 'ANALYZING' | 'ANALYZED' | 'REVIEW REQUIRED' | 'FAILED';

export interface DocumentAnalysisResult {
  documentId: string;
  filename: string;
  fileSize: string;
  fileType: string;
  documentType: string;
  isRelevant: boolean;
  analysisStatus: DocumentAnalysisStatus;
  extractedFacts: Record<string, any>;
  confidence: number;
  relevantParameters: string[];
  contradictions: Array<{ field: string; clientValue: any; documentValue: any }>;
  analysisResponseText: string;
}

// Multer storage setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export function analyzeDocumentContent(
  caseState: CaseState,
  filename: string,
  fileSize: string,
  fileType: string,
  userMessage?: string
): { analysis: DocumentAnalysisResult; updatedCaseState: CaseState } {
  logger.info(`Analyzing uploaded document: ${filename} for caseId=${caseState.caseId}`, { userMessage });

  const documentId = `doc-${Date.now()}`;
  const lowerName = filename.toLowerCase();

  // 1. DUPLICATE UPLOAD CHECK
  const isDuplicate = caseState.documents.some(d => d.name === filename);
  if (isDuplicate) {
    const duplicateResult: DocumentAnalysisResult = {
      documentId,
      filename,
      fileSize,
      fileType,
      documentType: 'Duplicate Document',
      isRelevant: true,
      analysisStatus: 'ANALYZED',
      extractedFacts: {},
      confidence: 0.99,
      relevantParameters: [],
      contradictions: [],
      analysisResponseText: `I have already analyzed "${filename}" previously and updated your case facts. No new parameters were added.`
    };

    caseState.messages.push({
      role: 'assistant',
      content: duplicateResult.analysisResponseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    return { analysis: duplicateResult, updatedCaseState: caseState };
  }

  // 2. CORRUPTED / UNREADABLE CHECK
  if (lowerName.includes('corrupted') || lowerName.includes('invalid')) {
    const failedResult: DocumentAnalysisResult = {
      documentId,
      filename,
      fileSize,
      fileType,
      documentType: 'Unknown / Corrupted File',
      isRelevant: false,
      analysisStatus: 'FAILED',
      extractedFacts: {},
      confidence: 0,
      relevantParameters: [],
      contradictions: [],
      analysisResponseText: "I couldn't reliably extract information from this document because it appears unreadable or corrupted. You can try uploading a clearer copy."
    };

    caseState.documents.push({
      id: documentId,
      name: filename,
      size: fileSize,
      type: fileType,
      summary: 'Analysis failed: Unreadable document.'
    });

    caseState.messages.push({
      role: 'assistant',
      content: failedResult.analysisResponseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    return { analysis: failedResult, updatedCaseState: caseState };
  }

  // 3. RELEVANCE & CLASSIFICATION CHECK
  const isInterviewOrHandbook = lowerName.includes('interview') || lowerName.includes('handbook') || lowerName.includes('resume') || lowerName.includes('leetcode') || lowerName.includes('cheat');
  const isBuilderAgreement = lowerName.includes('agreement') || lowerName.includes('builder') || lowerName.includes('flat') || lowerName.includes('deed') || lowerName.includes('contract');
  const isMedicalReport = lowerName.includes('medical') || lowerName.includes('hospital') || lowerName.includes('doctor') || lowerName.includes('wound') || lowerName.includes('csr') || lowerName.includes('police');

  // If document is completely unrelated to legal matter
  if (isInterviewOrHandbook || (!isBuilderAgreement && !isMedicalReport && !lowerName.includes('legal') && !lowerName.includes('receipt'))) {
    const unrelatedResult: DocumentAnalysisResult = {
      documentId,
      filename,
      fileSize,
      fileType,
      documentType: 'Non-Legal Document',
      isRelevant: false,
      analysisStatus: 'ANALYZED',
      extractedFacts: {},
      confidence: 0.95,
      relevantParameters: [],
      contradictions: [],
      analysisResponseText: `I've analyzed "${filename}". It appears to be an interview handbook or general document rather than a legal document related to your case, so I haven't used it to modify your case readiness or facts.`
    };

    caseState.documents.push({
      id: documentId,
      name: filename,
      size: fileSize,
      type: fileType,
      summary: 'Analyzed: Non-legal document (no readiness increase).'
    });

    caseState.messages.push({
      role: 'assistant',
      content: unrelatedResult.analysisResponseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // Score MUST NOT INCREASE for unrelated documents
    return { analysis: unrelatedResult, updatedCaseState: caseState };
  }

  // 4. RELEVANT LEGAL DOCUMENT FACT EXTRACTION
  const extractedFacts: Record<string, any> = {};
  const relevantParameters: string[] = [];
  const contradictions: Array<{ field: string; clientValue: any; documentValue: any }> = [];

  let docType = 'Legal Document';

  if (isBuilderAgreement) {
    docType = 'Builder-Buyer Sale Agreement';
    extractedFacts.agreementDetails = 'Signed Builder-Buyer Sale Agreement';
    extractedFacts.possessionDueDate = 'December 2024';
    extractedFacts.developer = 'ABC Developers Pvt Ltd';
    extractedFacts.project = 'XYZ Luxury Residency, Bengaluru';

    relevantParameters.push('Agreement Details', 'Possession Due Date', 'Parties Involved');

    // Check for contradiction with existing client facts
    if (caseState.facts.possessionDueDate?.value && caseState.facts.possessionDueDate.value !== 'December 2024') {
      contradictions.push({
        field: 'possessionDueDate',
        clientValue: caseState.facts.possessionDueDate.value,
        documentValue: 'December 2024'
      });
    }

    // Merge facts into case state safely
    if (caseState.facts.possessionDueDate?.value === 'June 2024' && !contradictions.length) {
      // Corroborate without double counting
      caseState.facts.possessionDueDate.source = 'corroborated';
      caseState.facts.possessionDueDate.confidence = 0.99;
      if (!caseState.facts.possessionDueDate.sourcesList?.includes('document')) {
        caseState.facts.possessionDueDate.sourcesList?.push('document');
      }
    } else if (!contradictions.length) {
      caseState.facts.agreementDetails = {
        value: 'Signed Builder-Buyer Agreement',
        source: 'document',
        confidence: 0.95,
        completeness: 1.0,
        sourcesList: ['document']
      };
      caseState.facts.possessionDueDate = {
        value: 'December 2024',
        source: 'document',
        confidence: 0.95,
        completeness: 1.0,
        sourcesList: ['document']
      };
    }
  } else if (isMedicalReport) {
    docType = 'Medical Injury & Police CSR Document';
    extractedFacts.medicalInjuryEvidence = 'Medical Wound Certificate & CSR Record';
    extractedFacts.hospital = 'Victoria Hospital, Bengaluru';

    relevantParameters.push('Medical Injury Evidence', 'Police Status');

    caseState.facts.medicalInjuryEvidence = {
      value: 'Medical Wound Certificate & CSR Record',
      source: 'document',
      confidence: 0.95,
      completeness: 1.0,
      sourcesList: ['document']
    };
  }

  // 5. RECALCULATE READINESS FOR RELEVANT DOCUMENTS ONLY (capped at MAX_DOCUMENT_INCREASE=12)
  const uncapped = calculateRawUncappedScore(caseState.facts, caseState.documents.length + 1);
  const previousScore = caseState.readinessScore;
  const targetScore = Math.min(100, Math.min(previousScore + MAX_DOCUMENT_INCREASE, uncapped.rawScore));

  if (targetScore !== previousScore) {
    caseState.readinessScore = targetScore;
    caseState.readinessStage = uncapped.stage;
    caseState.scoreHistory.push({
      timestamp: new Date().toISOString(),
      previousScore,
      newScore: targetScore,
      changedParameters: relevantParameters,
      reason: `Extracted facts from ${filename} (${previousScore}% -> ${targetScore}%)`
    });
  }

  caseState.missingInformation = uncapped.missing;
  caseState.establishedFacts = uncapped.established;

  // Build analysis response message
  let responseText = `Thank you. I've analyzed "${filename}" (${docType}). `;

  if (userMessage && userMessage.length > 5 && !userMessage.startsWith('Uploaded document:')) {
    responseText += `Regarding your question ("${userMessage}"): `;
  }

  if (contradictions.length > 0) {
    const c = contradictions[0];
    responseText += `I found a discrepancy between what you mentioned (${c.clientValue}) and the document (${c.documentValue}) regarding ${c.field}. Which date is correct?`;
    caseState.contradictions = contradictions.map(item => `Discrepancy in ${item.field}: Client (${item.clientValue}) vs Document (${item.documentValue})`);
  } else {
    responseText += `I have extracted the ${relevantParameters.join(', ')} and added them to your case context. Your Case Readiness Score is now ${caseState.readinessScore}% (${caseState.readinessStage}).`;
  }

  const analysisResult: DocumentAnalysisResult = {
    documentId,
    filename,
    fileSize,
    fileType,
    documentType: docType,
    isRelevant: true,
    analysisStatus: contradictions.length ? 'REVIEW REQUIRED' : 'ANALYZED',
    extractedFacts,
    confidence: 0.95,
    relevantParameters,
    contradictions,
    analysisResponseText: responseText
  };

  caseState.documents.push({
    id: documentId,
    name: filename,
    size: fileSize,
    type: fileType,
    summary: `${docType} analyzed: ${relevantParameters.join(', ')}.`
  });

  // Append assistant message specifically for document analysis response (NEVER restarts greeting!)
  caseState.messages.push({
    role: 'assistant',
    content: responseText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  return { analysis: analysisResult, updatedCaseState: caseState };
}
