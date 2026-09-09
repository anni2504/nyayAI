import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'node:http';
import healthRoutes from './routes/healthRoutes.js';
import { initDatabase, isDatabaseInitialized, db } from './db/database.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import advocateRoutes from './routes/advocateRoutes.js';
import advocateDirectoryRoutes from './routes/advocateDirectoryRoutes.js';
import consultationRoutes from './routes/consultationRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import savedAdvocateRoutes from './routes/savedAdvocateRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import legalRoutes from './routes/legalRoutes.js';
import { attachRealtimeServer } from './realtime.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { seedDevAccounts } from './services/authService.js';
import { getLegalStack } from './controllers/legalController.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS: restrict to configured origins when provided, otherwise reflect request origin (dev-friendly)
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

// API Routes (Support both /api/v1 and /api aliases)
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.VERCEL === '1' ? 'vercel-serverless' : 'standalone',
    service: 'NYAYAI Express Backend',
    database: isDatabaseInitialized() ? 'ready' : 'initializing',
    databaseDriver: isDatabaseInitialized() ? db.driver : 'unknown',
    timestamp: new Date().toISOString()
  });
});

app.use(['/api/v1/auth', '/api/auth'], authRoutes);
app.use(['/api/v1/ai', '/api/ai'], aiRoutes);
app.use(['/api/v1/documents', '/api/documents'], documentRoutes);
app.use(['/api/v1/advocate', '/api/advocate'], advocateRoutes);
app.use(['/api/v1/advocates', '/api/advocates'], advocateDirectoryRoutes);
app.use(['/api/v1/consultations', '/api/consultations'], consultationRoutes);
app.use(['/api/v1/cases', '/api/cases'], caseRoutes);
app.use(['/api/v1/saved-advocates', '/api/saved-advocates'], savedAdvocateRoutes);
app.use(['/api/v1/profile', '/api/profile'], profileRoutes);
app.use(['/api/v1/legal', '/api/legal'], legalRoutes);
app.use(['/api/v1', '/api'], healthRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Startup pipeline: initialize the database store and seed demo accounts before serving traffic.
const startup = initDatabase()
  .then(meta => {
    logger.info(`NYAYAI database driver: ${meta.driver}${meta.driver === 'json' ? ' (file-backed JSON store; set DATABASE_URL to enable PostgreSQL)' : ''}`);
    return seedDevAccounts();
  })
  .then(async () => {
    // Explicit boot gate: ingestion NEVER runs implicitly in a default boot.
    // Set LEGAL_AUTO_INGEST=1 to index the corpus at startup (real S3 sources
    // only when CORPUS_SOURCE=s3 + S3_BUCKET are configured; otherwise the
    // local fixture tree). Durable thanks to the manifest + deterministic ids.
    if (process.env.LEGAL_AUTO_INGEST === '1') {
      logger.info('LEGAL_AUTO_INGEST=1: indexing legal corpus at boot...');
      try {
        const stats = await getLegalStack().ingest({ scope: 'all' });
        logger.info(`Boot ingest complete: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.failed} failed, ${stats.chunks} chunks`);
      } catch (err: any) {
        logger.error(`Boot ingest failed: ${err.message}`);
      }
    }
  })
  .catch(err => {
    logger.error('Database initialization failed:', err.message);
    throw err;
  });

// Standalone HTTP Server (skipped inside Vercel serverless runtime)
if (process.env.VERCEL !== '1') {
  startup
    .then(() => {
      const httpServer = http.createServer(app);
      const io = attachRealtimeServer(httpServer);
      httpServer.listen(Number(PORT), '0.0.0.0', () => {
        logger.info(`NYAYAI Production-Ready Express Backend listening on 0.0.0.0:${PORT}`);
        logger.info(`Realtime Socket.IO server attached: ${io ? 'ready' : 'unavailable'}`);
        logger.info(`Groq Model configured: ${process.env.GROQ_MODEL || 'qwen/qwen3.6-27b'}`);
        logger.info(`API Base URL: http://0.0.0.0:${PORT}/api/v1`);
      });
    })
    .catch(err => {
      logger.error('Server failed to start:', err.message);
      process.exit(1);
    });
}

export default app;