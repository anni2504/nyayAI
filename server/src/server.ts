import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import advocateRoutes from './routes/advocateRoutes.js';
import consultationRoutes from './routes/consultationRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { seedDevAccounts } from './services/authService.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS & Body Parsers
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

// Seed Development Database Users
seedDevAccounts().catch(err => logger.error('Seed dev accounts error:', err));

// Top-level Health Check Endpoints (Support /api/health, /health, /api/v1/health)
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.VERCEL === '1' ? 'vercel-serverless' : 'standalone',
    timestamp: new Date().toISOString()
  });
});

// API Routes (Support both /api/v1 and /api aliases)
app.use(['/api/v1/auth', '/api/auth'], authRoutes);
app.use(['/api/v1/ai', '/api/ai'], aiRoutes);
app.use(['/api/v1/documents', '/api/documents'], documentRoutes);
app.use(['/api/v1/advocate', '/api/advocate'], advocateRoutes);
app.use(['/api/v1/consultations', '/api/consultations'], consultationRoutes);
app.use(['/api/v1', '/api'], healthRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start standalone HTTP Server if not running inside Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`NYAYAI Production-Ready Express Backend listening on 0.0.0.0:${PORT}`);
    logger.info(`Groq Model configured: ${process.env.GROQ_MODEL || 'qwen/qwen3.6-27b'}`);
    logger.info(`API Base URL: http://0.0.0.0:${PORT}/api/v1`);
  });
}

export default app;
