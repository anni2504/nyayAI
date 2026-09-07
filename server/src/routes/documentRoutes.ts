import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware.js';
import { uploadDocumentHandler } from '../controllers/documentController.js';
import {
  listClientDocuments,
  storeDocument,
  getClientDocument,
  analyzeClientDocument,
  deleteClientDocument
} from '../controllers/clientDocumentController.js';
import { uploadMiddleware } from '../services/documentEngineService.js';

const router = Router();

// Legacy broadcast upload endpoint. Store-only: uploads MUST NOT auto-trigger AI
// analysis (Phase 4 rule). Explicit analysis happens via POST /documents/:docId/analyze.
router.post('/upload', requireRole('CLIENT'), uploadMiddleware.single('file'), uploadDocumentHandler);

// Phase 1: Persistence + ownership only. NO automatic AI analysis.
router.get('/', requireRole('CLIENT'), listClientDocuments);
router.post('/', requireRole('CLIENT'), uploadMiddleware.single('file'), storeDocument);
router.get('/:docId', requireRole('CLIENT'), getClientDocument);
// Phase 4: explicit one-time Document Intelligence run for a stored, owned document.
router.post('/:docId/analyze', requireRole('CLIENT'), analyzeClientDocument);
router.delete('/:docId', requireRole('CLIENT'), deleteClientDocument);

export default router;