import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { listAdvocates, getCaseRecommendations } from '../controllers/advocateDirectoryController.js';

const router = Router();

router.get('/', authenticateJWT, listAdvocates);
router.get('/recommendations/:caseId', requireRole('CLIENT'), getCaseRecommendations);

export default router;