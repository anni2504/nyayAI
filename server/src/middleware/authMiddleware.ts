import { Request, Response, NextFunction } from 'express';
import type { Role, UserSession } from '../types/index.js';
import { verifyToken, getAuthenticatedUser } from '../services/authService.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`Authentication Error: No Bearer token provided for ${req.originalUrl}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please sign in to access this resource.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    const user = getAuthenticatedUser(payload.userId);
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    next();
  } catch (err: any) {
    logger.warn(`JWT Verification Failed for ${req.originalUrl}: ${err.message}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session token. Please sign in again.'
    });
  }
}

export function requireRole(allowedRole: Role) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // First ensure JWT authentication
    authenticateJWT(req, res, () => {
      const userRole = req.user?.role;
      if (!userRole || userRole !== allowedRole) {
        logger.warn(`RBAC Access Denied: User role ${userRole} attempted to access ${allowedRole} endpoint ${req.originalUrl}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Account role '${userRole}' is not authorized to access this '${allowedRole}' endpoint.`
        });
      }

      logger.info(`RBAC Granted: User ${req.user?.id} (${userRole}) accessed ${req.originalUrl}`);
      next();
    });
  };
}
