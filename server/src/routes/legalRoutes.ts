// Phase 9 legal corpus + retrieval + RAG routes.
// Naming follows the existing routes/ + controllers/ convention.
import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import {
  handleLegalStatus,
  handleLegalIngest,
  handleLegalReindex,
  handleLegalDocuments,
  handleLegalSearch,
  handleLegalRag,
  handleLegalAdvocateCases
} from '../controllers/legalController.js';

const router = Router();

// Corpus management: ingested by ADVOCATEs (maintains the legal corpus).
router.get('/health', authenticateJWT, handleLegalStatus);
router.post('/corpus/ingest', requireRole('ADVOCATE'), handleLegalIngest);
router.post('/corpus/reindex', requireRole('ADVOCATE'), handleLegalReindex);
router.get('/corpus/status', authenticateJWT, handleLegalStatus);
router.get('/corpus/documents', authenticateJWT, handleLegalDocuments);

// Retrieval + RAG: any authenticated user.
router.post('/search', authenticateJWT, handleLegalSearch);
router.post('/rag', authenticateJWT, handleLegalRag);
router.post('/advocate-cases', authenticateJWT, handleLegalAdvocateCases);

export default router;