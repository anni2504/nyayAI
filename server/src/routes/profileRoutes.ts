import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const router = Router();

// Protected Profile Endpoints (any authenticated user manages their OWN profile)
router.get('/', authenticateJWT, getProfile);
router.patch('/', authenticateJWT, updateProfile);

export default router;