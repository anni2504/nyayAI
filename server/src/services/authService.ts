import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, UserRecord } from '../db/database.js';
import type { Role, UserSession } from '../types/index.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nyayai-production-secret-key-2026-super-secure-jwt';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
    title?: string;
    barNumber?: string;
  };
}

export function generateToken(user: UserRecord): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || (user.role === 'CLIENT' 
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'),
    title: user.title,
    barNumber: user.barNumber
  };
}

export async function seedDevAccounts(): Promise<void> {
  try {
    const existingClient = db.findUserByEmail('client@nyayai.demo');
    if (!existingClient) {
      const clientPasswordHash = await bcrypt.hash('Client123!', 10);
      db.createUser({
        id: 'usr-client-1',
        name: 'Rohan Sharma',
        email: 'client@nyayai.demo',
        password_hash: clientPasswordHash,
        role: 'CLIENT',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      logger.info('Seeded Client account: client@nyayai.demo');
    }

    const existingAdvocate = db.findUserByEmail('advocate@nyayai.demo');
    if (!existingAdvocate) {
      const advocatePasswordHash = await bcrypt.hash('Advocate123!', 10);
      db.createUser({
        id: 'usr-advocate-1',
        name: 'Adv. Rajesh Varma',
        email: 'advocate@nyayai.demo',
        password_hash: advocatePasswordHash,
        role: 'ADVOCATE',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
        title: 'Senior Criminal Defense Counsel',
        barNumber: 'KAR/2012/4819',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      logger.info('Seeded Advocate account: advocate@nyayai.demo');
    }
  } catch (err) {
    logger.error('Error seeding development accounts:', err);
  }
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  role: Role;
  title?: string;
  barNumber?: string;
}): Promise<AuthResponse> {
  const { name, email, password, role, title, barNumber } = params;

  if (!email || !password || !name || !role) {
    throw new Error('All required fields (name, email, password, role) must be provided.');
  }

  if (role !== 'CLIENT' && role !== 'ADVOCATE') {
    throw new Error('Invalid user role. Must be CLIENT or ADVOCATE.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const newId = `usr-${role.toLowerCase()}-${Date.now()}`;

  const newUser: UserRecord = {
    id: newId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password_hash,
    role,
    title: title?.trim(),
    barNumber: barNumber?.trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.createUser(newUser);
  const token = generateToken(newUser);

  return {
    token,
    user: sanitizeUser(newUser)
  };
}

export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { email, password } = params;

  if (!email || !password) {
    throw new Error('Please provide both email and password.');
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password.');
  }

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user)
  };
}

export function getAuthenticatedUser(userId: string) {
  const user = db.findUserById(userId);
  if (!user) {
    throw new Error('User account not found.');
  }
  return sanitizeUser(user);
}
