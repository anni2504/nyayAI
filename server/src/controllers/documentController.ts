import { Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { db } from '../db/database.js';

export async function uploadDocumentHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const caseId = (req.body && req.body.caseId) || (req.query && (req.query.caseId as string)) || null;
    const user = req.user;

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

    logger.info(`[POST] /api/v1/documents/upload store-only for caseId=${caseId}, filename=${filename}`);

    const now = new Date().toISOString();
    const record = await db.createDocument({
      id: `doc-${randomUUID().slice(0, 10)}`,
      client_id: user?.id || '',
      case_id: caseId && typeof caseId === 'string' ? caseId : null,
      name: filename,
      size: fileSize,
      type: fileType,
      category: 'CASE_DOCUMENT',
      document_type: 'PDF Document',
      summary: '',
      upload_date: now,
      analysis_status: 'STORED',
      created_at: now,
      updated_at: now
    });

    res.status(201).json({
      success: true,
      message: 'Document stored. Analysis is not run automatically; use Analyze explicitly.',
      document: {
        ...record,
        analysis: null
      },
      analysis: null,
      analysisStatus: 'STORED'
    });
  } catch (err) {
    next(err);
  }
}