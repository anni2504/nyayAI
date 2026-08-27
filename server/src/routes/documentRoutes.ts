import { Router } from 'express';
import { requireRole } from '../middleware/authMiddleware.js';
import { uploadDocumentHandler } from '../controllers/documentController.js';
import { uploadMiddleware } from '../services/documentEngineService.js';

const router = Router();

// CLIENT PDF/PNG/JPG Document Upload Route
router.post('/upload', requireRole('CLIENT'), uploadMiddleware.single('file'), uploadDocumentHandler);

export default router;
