import { Request, Response, NextFunction } from 'express';
import type { Role, UserSession } from '../types/index.js';
import { verifyToken, getAuthenticatedUser } from '../services/authService.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

/**
 * Centralized JWT authentication middleware.
 * Verifies the Bearer token signature/expiry, then reloads the user from the
 * trusted database store to guarantee the role/session originates from the
 * backend (never from client-supplied claims).
 *  - Missing / invalid / expired token -> 401
 */
export async function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
    const user = await getAuthenticatedUser(payload.userId);
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

/**
 * Centralized RBAC authorization middleware.
 *  - Requires a valid authenticated session (401 otherwise).
 *  - Requires the authenticated role to be among the allowed roles (403 otherwise).
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    authenticateJWT(req, res, async () => {
      const userRole = req.user?.role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        logger.warn(`RBAC Access Denied: User role ${userRole} attempted to access [${allowedRoles.join('/')}] endpoint ${req.originalUrl}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Account role '${userRole}' is not authorized to access this '${allowedRoles.join('/')}' endpoint.`
        });
      }

      logger.info(`RBAC Granted: User ${req.user?.id} (${userRole}) accessed ${req.originalUrl}`);
      next();
    });
  };
}