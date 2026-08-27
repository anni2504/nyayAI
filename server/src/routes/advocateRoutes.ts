import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware.js';
import {
  handleAdvocateChat as handleAdvocateAIChat,
  handleAdvocateDocumentAnalysis as handleAdvocateDocumentAnalyze,
  handleAdvocateLeads as handleGetAdvocates,
  handleAdvocateLeads as handleGetAdvocateLeads
} from '../controllers/advocateController.js';

const router = Router();

// ADVOCATE Security Routes
router.post('/ai/chat', requireRole('ADVOCATE'), handleAdvocateAIChat);
router.post('/documents/analyze', requireRole('ADVOCATE'), handleAdvocateDocumentAnalyze);
router.get('/matches', requireRole('ADVOCATE'), handleGetAdvocates);
router.get('/leads', requireRole('ADVOCATE'), handleGetAdvocateLeads);

export default router;
