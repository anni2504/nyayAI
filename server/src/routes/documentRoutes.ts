import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware.js';
import { uploadDocumentHandler } from '../controllers/documentController.js';
import {
  listClientDocuments,
  storeDocument,
  getClientDocument,
  deleteClientDocument
} from '../controllers/clientDocumentController.js';
import { uploadMiddleware } from '../services/documentEngineService.js';

const router = Router();

// CLIENT PDF/PNG/JPG Document Upload Route (legacy AI-analyzed pipeline; kept for later doc-intelligence phase)
router.post('/upload', requireRole('CLIENT'), uploadMiddleware.single('file'), uploadDocumentHandler);

// Phase 1: Persistence + ownership only. NO automatic AI analysis.
router.get('/', requireRole('CLIENT'), listClientDocuments);
router.post('/', requireRole('CLIENT'), uploadMiddleware.single('file'), storeDocument);
router.get('/:docId', requireRole('CLIENT'), getClientDocument);
router.delete('/:docId', requireRole('CLIENT'), deleteClientDocument);

export default router;