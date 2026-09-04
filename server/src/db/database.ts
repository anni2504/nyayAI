import fs from 'fs';
import path from 'path';
import type { Role } from '../types/index.js';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  avatar?: string;
  title?: string;
  barNumber?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseSchema {
  users: UserRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDirectoryExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readDb(): DatabaseSchema {
  ensureDataDirectoryExists();
  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = { users: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading database file, resetting schema:', error);
    const initialData: DatabaseSchema = { users: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
}

function writeDb(data: DatabaseSchema): void {
  ensureDataDirectoryExists();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

export const db = {
  findUserByEmail(email: string): UserRecord | undefined {
    const data = readDb();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserById(id: string): UserRecord | undefined {
    const data = readDb();
    return data.users.find(u => u.id === id);
  },

  createUser(user: UserRecord): UserRecord {
    const data = readDb();
    // Check duplicate email
    if (data.users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new Error(`User with email ${user.email} already exists`);
    }
    data.users.push(user);
    writeDb(data);
    return user;
  },

  updateUser(id: string, updates: Partial<Omit<UserRecord, 'id' | 'created_at'>>): UserRecord | undefined {
    const data = readDb();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;

    const existing = data.users[index];
    const updated: UserRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };
    data.users[index] = updated;
    writeDb(data);
    return updated;
  },

  getAllUsers(): UserRecord[] {
    const data = readDb();
    return data.users;
  }
};
