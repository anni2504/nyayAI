import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { analyzeDocumentContent } from '../services/documentEngineService.js';
import { getOrCreateCaseState } from '../services/caseEngineService.js';
import { logger } from '../utils/logger.js';

export async function uploadDocumentHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const caseId = (req.body && req.body.caseId) || (req.query && (req.query.caseId as string)) || 'case-1';
    const userMessage = (req.body && req.body.userMessage) || undefined;
    
    // Support file upload via Multer OR JSON metadata payload
    let filename = 'document.pdf';
    let fileSize = '1.2 MB';
    let fileType = 'application/pdf';

    if (req.file) {
      filename = req.file.originalname;
      fileSize = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`;
      fileType = req.file.mimetype;
    } else if (req.body && req.body.filename) {
      filename = req.body.filename;
      fileSize = req.body.fileSize || '1.2 MB';
      fileType = req.body.fileType || 'application/pdf';
    }

    logger.info(`[POST] /api/v1/documents/upload for caseId=${caseId}, filename=${filename}`, { userMessage });

    const caseState = getOrCreateCaseState(caseId);

    const { analysis, updatedCaseState } = analyzeDocumentContent(caseState, filename, fileSize, fileType, userMessage);

    const detectedPracticeArea = updatedCaseState.facts.matter.value
      ? (updatedCaseState.facts.matter.value.includes('Builder') ? 'RERA & Property Litigation' : 'Criminal Defense & Property')
      : 'Awaiting case details';

    res.status(200).json({
      message: 'Document uploaded and analyzed successfully.',
      analysis,
      document: {
        id: analysis.documentId,
        name: filename,
        size: fileSize,
        type: fileType,
        documentType: analysis.documentType,
        status: analysis.analysisStatus
      },
      reply: analysis.analysisResponseText,
      caseId: updatedCaseState.caseId,
      collectedFacts: updatedCaseState.facts,
      caseUnderstanding: updatedCaseState.caseUnderstanding,
      missingInformation: updatedCaseState.missingInformation,
      establishedFacts: updatedCaseState.establishedFacts,
      caseReadinessScore: updatedCaseState.readinessScore,
      readinessStage: updatedCaseState.readinessStage,
      scoreHistory: updatedCaseState.scoreHistory,
      discoveryStatus: updatedCaseState.discoveryStatus,
      recommendationData: updatedCaseState.recommendationData,
      quickResponses: updatedCaseState.quickResponses,
      legalAuthorities: updatedCaseState.legalAuthorities,
      documents: updatedCaseState.documents,
      practiceArea: detectedPracticeArea,
      jurisdiction: updatedCaseState.facts.jurisdiction.value || 'Not specified',
      proceduralStage: updatedCaseState.facts.proceduralStage.value || 'Not established'
    });
  } catch (err) {
    next(err);
  }
}
