import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import advocateRoutes from './routes/advocateRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { seedDevAccounts } from './services/authService.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS & Body Parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

// Seed Development Database Users
seedDevAccounts().catch(err => logger.error('Seed dev accounts error:', err));

// API Routes (v1)
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1', advocateRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start standalone HTTP Server if not running inside Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    logger.info(`NYAYAI Production-Ready Express Backend listening on port ${PORT}`);
    logger.info(`Groq Model configured: ${process.env.GROQ_MODEL || 'qwen/qwen3.6-27b'}`);
    logger.info(`API Base URL: http://localhost:${PORT}/api/v1`);
  });
}

export default app;
