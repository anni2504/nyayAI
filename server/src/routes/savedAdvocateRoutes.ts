import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import {
  listSavedAdvocates,
  saveAdvocate,
  removeSavedAdvocate
} from '../controllers/savedAdvocateController.js';

const router = Router();

// Protected Saved Advocates Endpoints (client-owned)
router.get('/', requireRole('CLIENT'), listSavedAdvocates);
router.post('/', requireRole('CLIENT'), saveAdvocate);
router.delete('/:advocateId', requireRole('CLIENT'), removeSavedAdvocate);

export default router;