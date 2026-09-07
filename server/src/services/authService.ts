import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, UserRecord } from '../db/database.js';
import type { Role } from '../types/index.js';
import { logger } from '../utils/logger.js';

// JWT Configuration (never hardcoded for production)
const DEV_ONLY_JWT_SECRET = 'nyayai-dev-only-jwt-secret-do-not-use-in-prod';
let resolvedJwtSecret: string | null = null;

function getJwtSecret(): string {
  if (resolvedJwtSecret) return resolvedJwtSecret;

  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    resolvedJwtSecret = secret;
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production (openssl rand -hex 32).');
  }

  logger.warn('JWT_SECRET not configured. Using DEV-ONLY fallback secret. Set JWT_SECRET for any shared deployment.');
  resolvedJwtSecret = DEV_ONLY_JWT_SECRET;
  return resolvedJwtSecret;
}

function getJwtExpiry(): jwt.SignOptions['expiresIn'] {
  return (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
}

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

export class AuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export function generateToken(user: UserRecord): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiry() });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
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
    barNumber: user.barNumber,
    phone: user.phone,
    preferredLanguage: user.preferredLanguage,
    privacyConsent: user.privacyConsent
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validatePassword(policy: string): string | null {
  if (typeof policy !== 'string' || policy.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (policy.length > 72) {
    return 'Password must not exceed 72 characters.';
  }
  if (!/[a-zA-Z]/.test(policy)) {
    return 'Password must contain at least one letter.';
  }
  if (!/[0-9]/.test(policy)) {
    return 'Password must contain at least one number.';
  }
  return null;
}

/**
 * Seeds the two presentation/demo accounts as REAL database users.
 * Passwords are sourced from environment variables with a development-only default,
 * hashed with bcrypt at runtime, and NEVER logged or returned to callers.
 */
export async function seedDevAccounts(): Promise<void> {
  const clientEmail = 'client@nyayai.demo';
  const advocateEmail = 'advocate@nyayai.demo';

  const clientPassword = process.env.DEMO_CLIENT_PASSWORD || 'Client123!';
  const advocatePassword = process.env.DEMO_ADVOCATE_PASSWORD || 'Advocate123!';

  const hasClient = await db.findUserByEmail(clientEmail);
  if (!hasClient) {
    const passwordHash = await bcrypt.hash(clientPassword, 10);
    await db.createUser({
      id: 'usr-client-1',
      name: 'Rohan Sharma',
      email: clientEmail,
      password_hash: passwordHash,
      role: 'CLIENT',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    logger.info('Seeded Client demo account: client@nyayai.demo');
  }

  const hasAdvocate = await db.findUserByEmail(advocateEmail);
  if (!hasAdvocate) {
    const passwordHash = await bcrypt.hash(advocatePassword, 10);
    await db.createUser({
      id: 'usr-advocate-1',
      name: 'Adv. Rajesh Varma',
      email: advocateEmail,
      password_hash: passwordHash,
      role: 'ADVOCATE',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      title: 'Senior Criminal Defense & High Court Advocate',
      barNumber: 'KAR/2012/4819',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    logger.info('Seeded Advocate demo account: advocate@nyayai.demo');
  }

  // Seed verified advocate profile + case history (real, persisted rows).
  await seedAdvocateProfileAndHistory();

  await db.seedDefaultBookings();
}

/**
 * Seeds a structured advocate profile and case-history rows for the demo
 * advocate. Idempotent upserts so the data is durable and queryable without
 * fabricating data at request time.
 */
async function seedAdvocateProfileAndHistory(): Promise<void> {
  const existingProfile = await db.getAdvocateProfile('usr-advocate-1');
  const nowIso = new Date().toISOString();
  if (!existingProfile) {
    await db.upsertAdvocateProfile({
      advocate_id: 'usr-advocate-1',
      practice_areas: 'Criminal Defense, Property Litigation, RERA, High Court Appeals',
      jurisdiction: 'Karnataka',
      court: 'Karnataka High Court',
      experience_years: 13,
      consultation_fee: '₹3,500',
      bio: 'Senior criminal defense and property litigation advocate practicing before the High Court of Karnataka.',
      location: 'Bengaluru, Karnataka',
      verification_status: 'verified',
      languages: 'English, Hindi, Kannada',
      created_at: nowIso,
      updated_at: nowIso
    });
  }

  const existingHistory = await db.getAdvocateCaseHistory('usr-advocate-1');
  if (existingHistory.length === 0) {
    await db.addAdvocateCaseHistory({
      id: 'ach-501',
      advocate_id: 'usr-advocate-1',
      case_title: 'Boundary Dispute & Injunction',
      court: 'Karnataka High Court',
      year: 2025,
      case_type: 'Civil Injunction',
      practice_area: 'Property Litigation',
      jurisdiction: 'Karnataka',
      outcome: 'Interim injunction granted in favor of client',
      status: 'completed',
      created_at: nowIso
    });
    await db.addAdvocateCaseHistory({
      id: 'ach-502',
      advocate_id: 'usr-advocate-1',
      case_title: 'RERA Builder Refund Matter',
      court: 'Karnataka RERA Authority',
      year: 2024,
      case_type: 'RERA Complaint',
      practice_area: 'RERA & Property Litigation',
      jurisdiction: 'Karnataka',
      outcome: 'Full deposit refund ordered',
      status: 'completed',
      created_at: nowIso
    });
    await db.addAdvocateCaseHistory({
      id: 'ach-503',
      advocate_id: 'usr-advocate-1',
      case_title: 'Negotiable Instruments Act Recovery',
      court: 'Additional Chief Metropolitan Magistrate',
      year: 2026,
      case_type: 'Criminal Complaint',
      practice_area: 'Criminal Defense',
      jurisdiction: 'Karnataka',
      outcome: 'Proceedings underway',
      status: 'ongoing',
      created_at: nowIso
    });
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
  const { password, title, barNumber } = params;

  if (!params.name || typeof params.name !== 'string') {
    throw new AuthError(400, 'Full name is required.');
  }
  const name = params.name.trim();
  if (name.length < 2) {
    throw new AuthError(400, 'Name must be at least 2 characters long.');
  }
  if (name.length > 120) {
    throw new AuthError(400, 'Name must not exceed 120 characters.');
  }

  if (!params.email || typeof params.email !== 'string') {
    throw new AuthError(400, 'A valid email address is required.');
  }
  const email = normalizeEmail(params.email);
  if (!EMAIL_REGEX.test(email)) {
    throw new AuthError(400, 'Please provide a valid email address.');
  }

  if (!params.role || (params.role !== 'CLIENT' && params.role !== 'ADVOCATE')) {
    throw new AuthError(400, 'Invalid user role. Must be CLIENT or ADVOCATE.');
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new AuthError(400, passwordError);
  }

  if (title !== undefined && title !== null && String(title).trim().length > 120) {
    throw new AuthError(400, 'Specialization / title must not exceed 120 characters.');
  }
  if (barNumber !== undefined && barNumber !== null && String(barNumber).trim().length > 60) {
    throw new AuthError(400, 'Bar registration number must not exceed 60 characters.');
  }

  const existing = await db.findUserByEmail(email);
  if (existing) {
    throw new AuthError(409, 'An account with this email address already exists.');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const newId = `usr-${params.role.toLowerCase()}-${Date.now()}`;

  const newUser: UserRecord = {
    id: newId,
    name,
    email,
    password_hash,
    role: params.role,
    title: title ? title.trim() : undefined,
    barNumber: barNumber ? barNumber.trim() : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.createUser(newUser);
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
    throw new AuthError(400, 'Please provide both email and password.');
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await db.findUserByEmail(normalizedEmail);
  if (!user) {
    throw new AuthError(401, 'Invalid email or password.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AuthError(401, 'Invalid email or password.');
  }

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user)
  };
}

export async function getAuthenticatedUser(userId: string) {
  const user = await db.findUserById(userId);
  if (!user) {
    throw new Error('User account not found.');
  }
  return sanitizeUser(user);
}

export { getJwtSecret, getJwtExpiry };