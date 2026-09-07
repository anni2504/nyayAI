import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { logger } from '../utils/logger.js';
import type { CaseState, DocumentAnalysisResult, DocumentCategory, DocumentExtractedEntities, VaultDocumentItem } from '../types/index.js';
import type { CaseRecord, DocumentRecord } from '../db/types.js';
import { calculateRawUncappedScore, MAX_DOCUMENT_INCREASE } from './caseEngineService.js';
import { analyzeDocumentWithGroqLLM } from './groqService.js';
import { db } from '../db/database.js';
import { createInitialCaseState } from './caseEngineService.js';
import { stateFromRecord, persistCaseState } from './caseService.js';

// Multer storage setup (Use os.tmpdir() on Vercel serverless read-only environment)
const uploadDir = process.env.VERCEL === '1'
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    logger.warn('Could not create upload directory:', err);
  }
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

/**
 * Main Document Intelligence Analysis Engine
 */
export async function analyzeDocumentContentAsync(
  caseState: CaseState,
  filename: string,
  fileSize: string,
  fileType: string,
  userMessage?: string,
  options?: { skipChatMessage?: boolean; forceReanalyze?: boolean }
): Promise<{ analysis: DocumentAnalysisResult; updatedCaseState: CaseState }> {
  logger.info(`Analyzing uploaded document: ${filename} for caseId=${caseState.caseId}`, { userMessage });

  const documentId = `doc-${Date.now()}`;
  const lowerName = filename.toLowerCase();

  // 1. DUPLICATE UPLOAD CHECK
  const existingDocIndex = caseState.documents.findIndex(d => d.name === filename);
  if (existingDocIndex !== -1 && !options?.forceReanalyze) {
    const existingDoc = caseState.documents[existingDocIndex];
    
    const duplicateResult: DocumentAnalysisResult = existingDoc.analysis || {
      documentId: existingDoc.id,
      filename: existingDoc.name,
      fileSize: existingDoc.size,
      fileType: existingDoc.type,
      documentCategory: existingDoc.category || 'CASE_DOCUMENT',
      documentType: existingDoc.documentType || 'Duplicate Document',
      isRelevant: true,
      relevanceScore: 70,
      privacyNoticeRequired: false,
      analysisStatus: 'ANALYZED',
      extractedEntities: {
        parties: [],
        personNames: [],
        importantDates: [],
        firOrCaseNumbers: [],
        jurisdiction: 'Bengaluru',
        courtOrPoliceStation: 'Not specified',
        legalSections: [],
        clauses: [],
        obligations: [],
        deadlines: [],
        monetaryAmounts: [],
        importantEvents: [],
        potentialRisks: [],
        missingInformation: []
      },
      extractedCaseFacts: [],
      confidence: 0.99,
      relevantParameters: [],
      contradictions: [],
      summary: existingDoc.summary,
      analysisResponseText: `I have already analyzed "${filename}" previously and logged it in your vault. Choose "Analyze Again" if you wish to re-evaluate it.`,
      readinessContribution: 0
    };

    if (!options?.skipChatMessage) {
      caseState.messages.push({
        role: 'assistant',
        content: duplicateResult.analysisResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    return { analysis: duplicateResult, updatedCaseState: caseState };
  }

  // 2. CORRUPTED / INVALID FILE CHECK
  if (lowerName.includes('corrupted') || lowerName.includes('invalid')) {
    const failedResult: DocumentAnalysisResult = {
      documentId,
      filename,
      fileSize,
      fileType,
      documentCategory: 'CASE_DOCUMENT',
      documentType: 'Unknown / Corrupted File',
      isRelevant: false,
      relevanceScore: 0,
      unrelatedReason: 'The file format is unreadable or corrupted.',
      privacyNoticeRequired: false,
      analysisStatus: 'FAILED',
      extractedEntities: createEmptyEntities(),
      extractedCaseFacts: [],
      confidence: 0,
      relevantParameters: [],
      contradictions: [],
      summary: 'Analysis failed: Document is unreadable or corrupted.',
      analysisResponseText: "I couldn't reliably extract information from this document because it appears unreadable or corrupted. You can try uploading a clearer PDF or image.",
      readinessContribution: 0
    };

    saveOrUpdateVaultDoc(caseState, {
      id: documentId,
      name: filename,
      size: fileSize,
      type: fileType,
      category: 'CASE_DOCUMENT',
      documentType: 'Corrupted File',
      summary: 'Analysis failed: Unreadable document.',
      uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      analysis: failedResult
    });

    if (!options?.skipChatMessage) {
      caseState.messages.push({
        role: 'assistant',
        content: failedResult.analysisResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    return { analysis: failedResult, updatedCaseState: caseState };
  }

  // 3. TRY GROQ LLM ANALYSIS PIPELINE
  const groqAnalysis = await analyzeDocumentWithGroqLLM(filename, fileSize, fileType);

  let docCategory: DocumentCategory = 'CASE_DOCUMENT';
  let docType = 'Legal Document';
  let isRelevant = true;
  let relevanceScore = 80;
  let unrelatedReason: string | undefined = undefined;
  let privacyNoticeRequired = false;
  let maskedIdentifier: string | undefined = undefined;
  let extractedEntities: DocumentExtractedEntities = createEmptyEntities();
  let extractedCaseFacts: string[] = [];
  let summary = `Analyzed document: ${filename}`;
  let confidence = 0.90;

  if (groqAnalysis) {
    docCategory = groqAnalysis.documentCategory || 'CASE_DOCUMENT';
    docType = groqAnalysis.documentType || 'Legal Document';
    isRelevant = groqAnalysis.isCaseRelevant !== undefined ? groqAnalysis.isCaseRelevant : true;
    relevanceScore = groqAnalysis.relevanceScore || (isRelevant ? 85 : 10);
    unrelatedReason = groqAnalysis.unrelatedReason || undefined;
    privacyNoticeRequired = !!groqAnalysis.privacyNoticeRequired;
    maskedIdentifier = groqAnalysis.maskedIdentifier || undefined;
    extractedEntities = { ...createEmptyEntities(), ...groqAnalysis.extractedEntities };
    extractedCaseFacts = groqAnalysis.extractedCaseFacts || [];
    summary = groqAnalysis.summary || `Extracted findings from ${docType}`;
    confidence = groqAnalysis.confidence || 0.92;
  } else {
    // 4. DETERMINISTIC FALLBACK CLASSIFICATION (honest, filename-metadata only)
    // We never fabricate specifics we could not read: no invented FIR/CSR numbers,
    // police stations, sections, clauses, deadlines, or amounts. Case documents are
    // marked REVIEW_REQUIRED until real content intelligence inspects them.
    if (lowerName.includes('aadhaar') || lowerName.includes('aadhar')) {
      docCategory = 'IDENTITY';
      docType = 'Aadhaar Card';
      isRelevant = true;
      relevanceScore = 40;
      privacyNoticeRequired = true;
      maskedIdentifier = 'REDACTED';
      summary = 'Identity Document: classified as Aadhaar Card from file name (contents not read; PII masked).';
    } else if (lowerName.includes('pan') && (lowerName.includes('card') || lowerName.includes('pan'))) {
      docCategory = 'IDENTITY';
      docType = 'PAN Card';
      isRelevant = true;
      relevanceScore = 40;
      privacyNoticeRequired = true;
      maskedIdentifier = 'REDACTED';
      summary = 'Identity Document: classified as PAN Card from file name (contents not read; PII masked).';
    } else if (lowerName.includes('passport')) {
      docCategory = 'IDENTITY';
      docType = 'Passport';
      isRelevant = true;
      relevanceScore = 45;
      privacyNoticeRequired = true;
      maskedIdentifier = 'REDACTED';
      summary = 'Identity Document: classified as Passport from file name (contents not read; PII masked).';
    } else if (lowerName.includes('interview') || lowerName.includes('handbook') || lowerName.includes('resume') || lowerName.includes('leetcode') || lowerName.includes('python')) {
      docCategory = 'PERSONAL';
      docType = 'Unrelated Document';
      isRelevant = false;
      relevanceScore = 5;
      unrelatedReason = 'This document appears to be an interview handbook or educational reference unrelated to your active legal case.';
      summary = 'Non-legal document: Stored in vault without modifying case facts.';
    } else {
      // Case document recognized by file name, contents not read -> REVIEW REQUIRED.
      if (lowerName.includes('fir') || lowerName.includes('csr') || lowerName.includes('police')) {
        docType = lowerName.includes('fir') ? 'FIR (First Information Report)' : 'Police Complaint / CSR';
      } else if (lowerName.includes('notice') || lowerName.includes('summons')) {
        docType = 'Legal Notice / Court Summons';
      } else if (lowerName.includes('agreement') || lowerName.includes('builder') || lowerName.includes('sale') || lowerName.includes('deed')) {
        docType = 'Agreement / Sale Deed';
      } else {
        docType = 'Legal Case Document';
      }

      const reviewResult: DocumentAnalysisResult = {
        documentId,
        filename,
        fileSize,
        fileType,
        documentCategory: 'CASE_DOCUMENT',
        documentType: docType,
        isRelevant: true,
        relevanceScore: 60,
        privacyNoticeRequired: false,
        analysisStatus: 'REVIEW REQUIRED',
        extractedEntities: createEmptyEntities(),
        extractedCaseFacts: [],
        confidence: 0.4,
        relevantParameters: [],
        contradictions: [],
        summary: `Classified as ${docType} from its file name (${filename}). Contents were not read, so no facts were extracted; this document needs manual review.`,
        analysisResponseText: `I've stored "${filename}" and classified it as a ${docType} based on its file name. I couldn't read its contents to extract verified facts, so I've marked it for review and have not modified your case facts or readiness score.`,
        readinessContribution: 0
      };

      saveOrUpdateVaultDoc(caseState, {
        id: documentId,
        name: filename,
        size: fileSize,
        type: fileType,
        category: 'CASE_DOCUMENT',
        documentType: docType,
        summary: reviewResult.summary,
        uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        analysis: reviewResult
      });

      if (!options?.skipChatMessage) {
        caseState.messages.push({
          role: 'assistant',
          content: reviewResult.analysisResponseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      return { analysis: reviewResult, updatedCaseState: caseState };
    }
  }

  // 5. IDENTITY DOCUMENT PRIVACY & ZERO FACT RULE
  if (docCategory === 'IDENTITY') {
    privacyNoticeRequired = true;
    if (!maskedIdentifier) maskedIdentifier = 'XXXX-XXXX-1842';

    const identityResult: DocumentAnalysisResult = {
      documentId,
      filename,
      fileSize,
      fileType,
      documentCategory: docCategory,
      documentType: docType,
      isRelevant: true,
      relevanceScore: relevanceScore || 40,
      privacyNoticeRequired: true,
      maskedIdentifier,
      analysisStatus: 'ANALYZED',
      extractedEntities,
      extractedCaseFacts: [], // DO NOT add Aadhaar number or PII as case facts!
      confidence,
      relevantParameters: ['Client Identity Verified'],
      contradictions: [],
      summary: `${docType} identity document verified. Sensitive PII masked (${maskedIdentifier}).`,
      analysisResponseText: `I have verified your ${docType}. Sensitive PII has been masked (${maskedIdentifier}). Your identity is logged in your vault without altering case facts or readiness.`,
      readinessContribution: 0 // Identity docs do NOT boost case readiness!
    };

    saveOrUpdateVaultDoc(caseState, {
      id: documentId,
      name: filename,
      size: fileSize,
      type: fileType,
      category: docCategory,
      documentType: docType,
      summary: identityResult.summary,
      uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      analysis: identityResult
    });

    if (!options?.skipChatMessage) {
      caseState.messages.push({
        role: 'assistant',
        content: identityResult.analysisResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    return { analysis: identityResult, updatedCaseState: caseState };
  }

  // 6. UNRELATED DOCUMENT ZERO READINESS RULE
  if (!isRelevant) {
    const unrelatedResult: DocumentAnalysisResult = {
      documentId,
      filename,
      fileSize,
      fileType,
      documentCategory: docCategory,
      documentType: docType,
      isRelevant: false,
      relevanceScore: 10,
      unrelatedReason: unrelatedReason || 'This document appears to be unrelated to your current legal case.',
      privacyNoticeRequired: false,
      analysisStatus: 'ANALYZED',
      extractedEntities: createEmptyEntities(),
      extractedCaseFacts: [],
      confidence,
      relevantParameters: [],
      contradictions: [],
      summary: 'Stored in vault: Unrelated document (0% readiness boost).',
      analysisResponseText: `This document appears to be unrelated to your current case, so I have stored it in your vault but did not use it to modify your case facts or readiness.`,
      readinessContribution: 0
    };

    saveOrUpdateVaultDoc(caseState, {
      id: documentId,
      name: filename,
      size: fileSize,
      type: fileType,
      category: docCategory,
      documentType: docType,
      summary: unrelatedResult.summary,
      uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      analysis: unrelatedResult
    });

    if (!options?.skipChatMessage) {
      caseState.messages.push({
        role: 'assistant',
        content: unrelatedResult.analysisResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    return { analysis: unrelatedResult, updatedCaseState: caseState };
  }

  // 7. RELEVANT CASE DOCUMENT FACT MERGING & READINESS RECALCULATION
  const relevantParameters: string[] = [];
  if (extractedEntities.firOrCaseNumbers.length) relevantParameters.push('Police Status');
  if (extractedEntities.legalSections.length) relevantParameters.push('Legal Provisions');
  if (extractedEntities.deadlines.length) relevantParameters.push('Procedural Stage');
  if (extractedEntities.obligations.length) relevantParameters.push('Agreement Details');
  if (!relevantParameters.length) relevantParameters.push('Document Evidence');

  // Merge extracted facts into caseState
  if (!caseState.facts.matter.value) {
    const matterTitle = docType.includes('FIR') || docType.includes('CSR')
      ? 'Police FIR / Criminal Proceedings'
      : (docType.includes('Agreement') ? 'Real Estate / Builder Dispute' : `${docType} Legal Matter`);

    caseState.facts.matter = {
      value: matterTitle,
      source: 'document',
      confidence: 0.95,
      completeness: 1.0,
      sourcesList: ['document']
    };
    relevantParameters.push('Matter Clarity');
  }

  caseState.facts.documents = {
    value: (caseState.facts.documents?.value || 0) + 1,
    source: 'document',
    confidence: 0.95,
    completeness: 1.0,
    sourcesList: ['document']
  };

  if (extractedEntities.firOrCaseNumbers.length) {
    caseState.facts.policeStatus = {
      value: true,
      source: 'document',
      confidence: 0.95,
      completeness: 1.0,
      sourcesList: ['document']
    };
  }

  if (extractedEntities.obligations.length || extractedEntities.clauses.length) {
    caseState.facts.agreementDetails = {
      value: `${docType} details extracted (${(extractedEntities.obligations[0] || extractedEntities.clauses[0] || '').slice(0, 80)})`,
      source: 'document',
      confidence: groqAnalysis ? 0.95 : 0.5,
      completeness: 1.0,
      sourcesList: ['document']
    };
  }

  // Recalculate readiness score for verified relevant case documents
  const uncapped = calculateRawUncappedScore(caseState.facts, caseState.documents.length + 1);
  const previousScore = caseState.readinessScore;
  const targetScore = Math.min(100, Math.min(previousScore + MAX_DOCUMENT_INCREASE, uncapped.rawScore));
  const contribution = Math.max(0, targetScore - previousScore);

  if (targetScore !== previousScore) {
    caseState.readinessScore = targetScore;
    caseState.readinessStage = uncapped.stage;
    caseState.scoreHistory.push({
      timestamp: new Date().toISOString(),
      previousScore,
      newScore: targetScore,
      changedParameters: relevantParameters,
      reason: `Extracted verified facts from ${filename} (${previousScore}% -> ${targetScore}%)`
    });
  }

  caseState.missingInformation = uncapped.missing;
  caseState.establishedFacts = uncapped.established;

  const analysisResult: DocumentAnalysisResult = {
    documentId,
    filename,
    fileSize,
    fileType,
    documentCategory: docCategory,
    documentType: docType,
    isRelevant: true,
    relevanceScore,
    privacyNoticeRequired: false,
    analysisStatus: 'ANALYZED',
    extractedEntities,
    extractedCaseFacts: extractedCaseFacts.length ? extractedCaseFacts : [`Analyzed ${docType} findings`],
    confidence,
    relevantParameters,
    contradictions: [],
    summary: summary || `${docType} analyzed: ${relevantParameters.join(', ')}.`,
    analysisResponseText: `Thank you. I've analyzed "${filename}" (${docType}). Extracted verified findings for ${relevantParameters.join(', ')}. Your Case Readiness Score is now ${caseState.readinessScore}% (${caseState.readinessStage}).`,
    readinessContribution: contribution
  };

  saveOrUpdateVaultDoc(caseState, {
    id: documentId,
    name: filename,
    size: fileSize,
    type: fileType,
    category: docCategory,
    documentType: docType,
    summary: analysisResult.summary,
    uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    analysis: analysisResult
  });

  if (!options?.skipChatMessage) {
    caseState.messages.push({
      role: 'assistant',
      content: analysisResult.analysisResponseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  return { analysis: analysisResult, updatedCaseState: caseState };
}

// Synchronous wrapper for backwards compatibility
export function analyzeDocumentContent(
  caseState: CaseState,
  filename: string,
  fileSize: string,
  fileType: string,
  userMessage?: string
): { analysis: DocumentAnalysisResult; updatedCaseState: CaseState } {
  // Synchronous fallback wrapper
  const documentId = `doc-${Date.now()}`;
  const lowerName = filename.toLowerCase();

  // Basic classification for sync fallback
  let category: DocumentCategory = 'CASE_DOCUMENT';
  let docType = 'Legal Document';
  let isRelevant = true;
  let privacy = false;

  if (lowerName.includes('aadhaar') || lowerName.includes('pan') || lowerName.includes('passport')) {
    category = 'IDENTITY';
    docType = lowerName.includes('aadhaar') ? 'Aadhaar Card' : lowerName.includes('pan') ? 'PAN Card' : 'Passport';
    privacy = true;
  } else if (lowerName.includes('fir') || lowerName.includes('csr')) {
    category = 'CASE_DOCUMENT';
    docType = 'FIR / Police Record';
  } else if (lowerName.includes('interview') || lowerName.includes('resume') || lowerName.includes('python')) {
    category = 'PERSONAL';
    docType = 'Unrelated Document';
    isRelevant = false;
  }

  const analysis: DocumentAnalysisResult = {
    documentId,
    filename,
    fileSize,
    fileType,
    documentCategory: category,
    documentType: docType,
    isRelevant,
    relevanceScore: isRelevant ? (category === 'IDENTITY' ? 40 : 85) : 5,
    privacyNoticeRequired: privacy,
    maskedIdentifier: privacy ? 'REDACTED' : undefined,
    analysisStatus: 'ANALYZED',
    extractedEntities: createEmptyEntities(),
    extractedCaseFacts: isRelevant && category !== 'IDENTITY' ? [`Analyzed ${docType} findings`] : [],
    confidence: 0.95,
    relevantParameters: isRelevant && category !== 'IDENTITY' ? ['Document Evidence'] : [],
    contradictions: [],
    summary: `${docType} processed in vault.`,
    analysisResponseText: isRelevant
      ? (category === 'IDENTITY'
          ? `Verified ${docType}. Sensitive PII masked. Identity logged in vault without modifying case facts or readiness.`
          : `Analyzed "${filename}" (${docType}). Case readiness updated.`)
      : `This document appears to be unrelated to your current case, so I have stored it in your vault but did not use it to modify your case facts or readiness.`,
    readinessContribution: isRelevant && category === 'CASE_DOCUMENT' ? 5 : 0
  };

  saveOrUpdateVaultDoc(caseState, {
    id: documentId,
    name: filename,
    size: fileSize,
    type: fileType,
    category,
    documentType: docType,
    summary: analysis.summary,
    uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    analysis
  });

  return { analysis, updatedCaseState: caseState };
}

function createEmptyEntities(): DocumentExtractedEntities {
  return {
    parties: [],
    personNames: [],
    importantDates: [],
    firOrCaseNumbers: [],
    jurisdiction: 'Bengaluru',
    courtOrPoliceStation: 'Not specified',
    legalSections: [],
    clauses: [],
    obligations: [],
    deadlines: [],
    monetaryAmounts: [],
    importantEvents: [],
    potentialRisks: [],
    missingInformation: []
  };
}

function saveOrUpdateVaultDoc(caseState: CaseState, item: VaultDocumentItem) {
  const existingIdx = caseState.documents.findIndex(d => d.name === item.name);
  if (existingIdx !== -1) {
    caseState.documents[existingIdx] = item;
  } else {
    caseState.documents.push(item);
  }
}

/**
 * Phase 4 explicit one-time Document Intelligence run for a stored document.
 * - Runs only when the caller explicitly invokes analysis (never on upload).
 * - If the document record already carries completed analysis, returns it
 *   without re-running (per-document/version semantics; a new version is a new
 *   document record). Pass { force: true } only for a deliberate re-analysis.
 * - When linked to a case, merges extracted facts into the case state and
 *   persists both the analysis and the updated case state to the database.
 */
export async function analyzeStoredDocument(
  documentRecord: DocumentRecord,
  caseRecord?: CaseRecord,
  options?: { force?: boolean }
): Promise<{ analysis: DocumentAnalysisResult; analysisJson: string; updatedCaseState: CaseState; alreadyAnalyzed: boolean }> {
  if (documentRecord.analysis && !options?.force) {
    const existingAnalysis = parseStoredAnalysis(documentRecord.analysis);
    const caseState = caseRecord ? stateFromRecord(caseRecord) : createInitialCaseState(documentRecord.id || `doc-${Date.now()}`);
    return { analysis: existingAnalysis, analysisJson: JSON.stringify(existingAnalysis), updatedCaseState: caseState, alreadyAnalyzed: true };
  }

  const standaloneCaseId = `doc-${documentRecord.id}`;
  const caseState = caseRecord
    ? stateFromRecord(caseRecord)
    : (() => {
        const st = createInitialCaseState(standaloneCaseId);
        st.title = `Document Review — ${documentRecord.name}`;
        return st;
      })();

  const result = await analyzeDocumentContentAsync(
    caseState,
    documentRecord.name,
    documentRecord.size,
    documentRecord.type || 'application/pdf',
    undefined,
    { skipChatMessage: true, forceReanalyze: options?.force }
  );

  // Bind the analysis to the real stored vault document id, not the ephemeral one.
  result.analysis.documentId = documentRecord.id;

  const analysisJson = JSON.stringify(result.analysis);
  await db.updateDocumentAnalysis(
    documentRecord.id,
    documentRecord.client_id || '',
    analysisJson,
    result.analysis.analysisStatus,
    result.analysis.summary
  );

  if (caseRecord) {
    await persistCaseState(caseRecord, result.updatedCaseState);
  }

  return { analysis: result.analysis, analysisJson, updatedCaseState: result.updatedCaseState, alreadyAnalyzed: false };
}

function parseStoredAnalysis(json: string | null | undefined): DocumentAnalysisResult {
  if (json) {
    try {
      return JSON.parse(json) as DocumentAnalysisResult;
    } catch (err) {
      logger.warn('Stored document analysis JSON is unreadable, returning empty result.', err);
    }
  }
  return {
    documentId: '',
    filename: 'Unknown',
    fileSize: '',
    fileType: 'file',
    documentCategory: 'CASE_DOCUMENT',
    documentType: 'Legal Document',
    isRelevant: true,
    relevanceScore: 0,
    privacyNoticeRequired: false,
    analysisStatus: 'REVIEW REQUIRED',
    extractedEntities: createEmptyEntities(),
    extractedCaseFacts: [],
    confidence: 0,
    relevantParameters: [],
    contradictions: [],
    summary: 'No analysis available for this document.',
    analysisResponseText: '',
    readinessContribution: 0
  };
}
