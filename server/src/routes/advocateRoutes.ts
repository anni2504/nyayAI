import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware.js';
import {
  handleAdvocateChat as handleAdvocateAIChat,
  handleAdvocateDraft,
  handleAdvocateTimeline,
  handleAdvocateFacts,
  handleAdvocatePrecedents,
  handleAdvocateDocumentAnalysis as handleAdvocateDocumentAnalyze
} from '../controllers/advocateController.js';
import {
  getWorkspaceStats,
  listCaseHistory,
  createCaseHistory,
  updateCaseHistory,
  deleteCaseHistory,
  getOwnProfile,
  updateOwnProfile,
  getClientMatters
} from '../controllers/advocateWorkspaceController.js';

const router = Router();

const advocateOnly = requireRole('ADVOCATE');

// ADVOCATE AI Tools
router.post('/ai/chat', advocateOnly, handleAdvocateAIChat);
router.post('/ai/draft', advocateOnly, handleAdvocateDraft);
router.post('/ai/timeline', advocateOnly, handleAdvocateTimeline);
router.post('/ai/facts', advocateOnly, handleAdvocateFacts);
router.post('/ai/precedents', advocateOnly, handleAdvocatePrecedents);
router.post('/documents/analyze', advocateOnly, handleAdvocateDocumentAnalyze);

// ADVOCATE WORKSPACE
router.get('/stats', advocateOnly, getWorkspaceStats);
router.get('/case-history', advocateOnly, listCaseHistory);
router.post('/case-history', advocateOnly, createCaseHistory);
router.patch('/case-history/:id', advocateOnly, updateCaseHistory);
router.delete('/case-history/:id', advocateOnly, deleteCaseHistory);
router.get('/profile', advocateOnly, getOwnProfile);
router.patch('/profile', advocateOnly, updateOwnProfile);
router.get('/clients/:clientId/cases', advocateOnly, getClientMatters);

export default router;