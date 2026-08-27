import { Router } from 'express';
import { getHealth, getAIHealth } from '../controllers/healthController.js';

const router = Router();

router.get('/health', getHealth);
router.get('/ai/health', getAIHealth);

export default router;
