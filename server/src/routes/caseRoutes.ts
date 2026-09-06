import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { listCases, createCase, getCase, updateCase } from '../controllers/caseController.js';

const router = Router();

// Protected Case Endpoints (client-owned, IDOR-guarded)
router.get('/', requireRole('CLIENT'), listCases);
router.post('/', requireRole('CLIENT'), createCase);
router.get('/:caseId', requireRole('CLIENT'), getCase);
router.patch('/:caseId', requireRole('CLIENT'), updateCase);

export default router;