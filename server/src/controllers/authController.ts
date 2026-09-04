import { Request, Response } from 'express';
import { registerUser, loginUser, getAuthenticatedUser } from '../services/authService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

export async function handleRegister(req: Request, res: Response) {
  try {
    const { name, email, password, role, title, barNumber } = req.body;
    const result = await registerUser({ name, email, password, role, title, barNumber });
    logger.info(`User registered successfully: ${email} (${role})`);
    return res.status(201).json(result);
  } catch (error: any) {
    logger.error('Registration failed:', error.message);
    return res.status(400).json({
      error: 'Registration Failed',
      message: error.message || 'Unable to register user.'
    });
  }
}

export async function handleLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    logger.info(`User logged in successfully: ${email} (${result.user.role})`);
    return res.status(200).json(result);
  } catch (error: any) {
    logger.warn('Login failed:', error.message);
    return res.status(401).json({
      error: 'Invalid Credentials',
      message: error.message || 'Invalid email or password.'
    });
  }
}

export async function handleLogout(req: Request, res: Response) {
  // Stateless JWT: logout acknowledges invalidation on client side
  return res.status(200).json({
    message: 'Successfully logged out.'
  });
}

export async function handleMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated.' });
    }
    const user = getAuthenticatedUser(req.user.id);
    return res.status(200).json({ user });
  } catch (error: any) {
    return res.status(401).json({ error: 'Unauthorized', message: 'User session not found.' });
  }
}
