import { Request, Response, NextFunction } from 'express';
import type { Role, UserSession } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export function requireRole(allowedRole: Role) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Read role from Header or query (for prototype demo authentication)
    const headerRole = (req.headers['x-nyayai-role'] as string) || (req.headers['authorization']?.includes('advocate') ? 'ADVOCATE' : 'CLIENT');
    const userRole: Role = headerRole.toUpperCase() === 'ADVOCATE' ? 'ADVOCATE' : 'CLIENT';

    req.user = {
      id: userRole === 'CLIENT' ? 'usr-client-1' : 'usr-advocate-1',
      name: userRole === 'CLIENT' ? 'Rohan Sharma' : 'Adv. Rajesh Varma',
      email: userRole === 'CLIENT' ? 'client@nyayai.demo' : 'advocate@nyayai.demo',
      role: userRole
    };

    if (userRole !== allowedRole) {
      logger.warn(`RBAC Access Denied: User role ${userRole} attempted to access ${allowedRole} endpoint ${req.originalUrl}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role RBAC Error: You are authenticated as '${userRole}', which does not have access to this '${allowedRole}' endpoint.`
      });
    }

    logger.info(`RBAC Granted: User role ${userRole} accessed ${req.originalUrl}`);
    next();
  };
}
