import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware.js';
import { handleClientChat } from '../controllers/aiController.js';

const router = Router();

router.post('/chat', requireRole('CLIENT'), handleClientChat);

export default router;
