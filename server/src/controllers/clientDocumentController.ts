import { Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../db/database.js';
import { logger } from '../utils/logger.js';

export async function listClientDocuments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const records = await db.getDocumentsForClient(user.id);
    return res.status(200).json({ success: true, documents: records });
  } catch (err) {
    next(err);
  }
}

export async function storeDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user || user.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only clients can store documents' });
    }

    // Accept a configuration JSON body (no analysis is triggered in Phase 1).
    const { caseId, filename, fileSize, fileType } = req.body || {};

    let name = filename;
    let size = fileSize;
    let type = fileType;

    if (req.file) {
      name = req.file.originalname;
      size = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`;
      type = req.file.mimetype;
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "filename" (string) is required.' });
    }
    if (!size) size = '1.2 MB';
    if (!type) type = 'application/pdf';

    const now = new Date().toISOString();
    const category = 'CASE_DOCUMENT';
    const documentType = sanitizeDocumentType(type);

    if (caseId && typeof caseId === 'string') {
      const owned = await db.findCaseByIdAndClient(caseId, user.id);
      if (owned) {
        // link to owned case
      }
    }

    const record = await db.createDocument({
      id: `doc-${randomUUID().slice(0, 10)}`,
      client_id: user.id,
      case_id: caseId && typeof caseId === 'string' ? caseId : null,
      name,
      size,
      type,
      category,
      document_type: documentType,
      summary: '',
      upload_date: now,
      analysis_status: 'STORED',
      created_at: now,
      updated_at: now
    });

    logger.info(`Stored document ${record.id} for client ${user.id} (no AI analysis triggered)`);
    return res.status(201).json({
      success: true,
      document: {
        ...record,
        analysis: null
      }
    });
  } catch (err) {
    next(err);
  }
}

function sanitizeDocumentType(type: string): string {
  const lower = (type || '').toLowerCase();
  if (lower.includes('png') || lower.includes('jpg') || lower.includes('jpeg') || lower.includes('image')) return 'Image Document';
  if (lower.includes('pdf')) return 'PDF Document';
  return 'Legal Document';
}

export async function getClientDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const docId = req.params.docId as string;
    const record = await db.findDocumentByIdAndClient(docId, user.id);
    if (!record) {
      return res.status(404).json({ error: 'Not Found', message: `Document ${docId} not found or does not belong to you.` });
    }
    return res.status(200).json({ success: true, document: record });
  } catch (err) {
    next(err);
  }
}

export async function deleteClientDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    const docId = req.params.docId as string;
    const deleted = await db.deleteDocument(docId, user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: `Document ${docId} not found or does not belong to you.` });
    }
    return res.status(200).json({ success: true, message: 'Document deleted.' });
  } catch (err) {
    next(err);
  }
}