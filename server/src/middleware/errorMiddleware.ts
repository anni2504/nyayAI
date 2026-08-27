import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`API Error Handler [${req.method} ${req.url}] status=${statusCode}: ${message}`);

  // Never expose API key or stack traces in production response
  res.status(statusCode).json({
    error: statusCode === 400 ? 'Bad Request' :
           statusCode === 401 ? 'Unauthorized' :
           statusCode === 403 ? 'Forbidden' :
           statusCode === 404 ? 'Not Found' :
           statusCode === 413 ? 'Payload Too Large' :
           statusCode === 429 ? 'Too Many Requests' : 'Internal Server Error',
    message
  });
}
