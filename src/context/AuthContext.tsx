import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Role, Permission } from '../auth/rbac';
import { hasPermission, canAccessRoute } from '../auth/rbac';
import {
  loginApi,
  registerApi,
  getMeApi,
  logoutApi,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
  type AuthUserResponse
} from '../services/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  title?: string;
  barNumber?: string;
  phone?: string;
  preferredLanguage?: string;
  privacyConsent?: boolean;
}

function mapAuthUser(u: AuthUserResponse): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    avatar: u.avatar || (u.role === 'CLIENT'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'),
    title: u.title,
    barNumber: u.barNumber,
    phone: u.phone,
    preferredLanguage: u.preferredLanguage,
    privacyConsent: u.privacyConsent
  };
}

interface AuthContextType {
  user: AuthUser | null;
  role: Role;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalDefaultRole: Role;
  setAuthModalDefaultRole: (role: Role) => void;
  authModalDefaultMode: 'signin' | 'signup';
  setAuthModalDefaultMode: (mode: 'signin' | 'signup') => void;
  unauthorizedNotice: string | null;
  setUnauthorizedNotice: (notice: string | null) => void;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: Role; title?: string; barNumber?: string }) => Promise<void>;
  logout: () => Promise<void>;
  openAuthModal: (role?: Role, mode?: 'signin' | 'signup') => void;
  refreshUser: () => Promise<void>;
  hasAccess: (permission: Permission) => boolean;
  canNavigateTo: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalDefaultRole, setAuthModalDefaultRole] = useState<Role>('CLIENT');
  const [authModalDefaultMode, setAuthModalDefaultMode] = useState<'signin' | 'signup'>('signin');
  const [unauthorizedNotice, setUnauthorizedNotice] = useState<string | null>(null);

  // Restore authenticated session on refresh
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await getMeApi(token);
        setUser(mapAuthUser(res.user));
      } catch (error) {
        console.warn('Session restoration failed:', error);
        setStoredToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Centralized session-expiry handling: whenever a protected API call returns
  // 401, clear the local session and surface the sign-in prompt.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setUnauthorizedNotice('Your session has expired. Please sign in again to continue.');
      setIsAuthModalOpen(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const role: Role = user ? user.role : 'GUEST';
  const isAuthenticated = user !== null;

  const openAuthModal = (targetRole?: Role, mode: 'signin' | 'signup' = 'signin') => {
    if (targetRole) {
      setAuthModalDefaultRole(targetRole);
    }
    setAuthModalDefaultMode(mode);
    setIsAuthModalOpen(true);
    setUnauthorizedNotice(null);
  };

  const login = async (credentials: { email: string; password: string }) => {
    const res = await loginApi(credentials);
    setStoredToken(res.token);
    const u = res.user;
    setUser(mapAuthUser(u));
    setIsAuthModalOpen(false);
    setUnauthorizedNotice(null);

    // Route to appropriate workspace
    if (u.role === 'CLIENT') {
      window.location.hash = '#/client';
    } else if (u.role === 'ADVOCATE') {
      window.location.hash = '#/advocate';
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    title?: string;
    barNumber?: string;
  }) => {
    const res = await registerApi({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role as 'CLIENT' | 'ADVOCATE',
      title: data.title,
      barNumber: data.barNumber
    });
    setStoredToken(res.token);
    const u = res.user;
    setUser(mapAuthUser(u));
    setIsAuthModalOpen(false);
    setUnauthorizedNotice(null);

    if (u.role === 'CLIENT') {
      window.location.hash = '#/client';
    } else if (u.role === 'ADVOCATE') {
      window.location.hash = '#/advocate';
    }
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    setUnauthorizedNotice(null);
    window.location.hash = '#/';
  };

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const res = await getMeApi(token);
      setUser(mapAuthUser(res.user));
    } catch {
      // Leave existing user state untouched on failure.
    }
  }, []);

  const hasAccess = (permission: Permission) => {
    return hasPermission(role, permission);
  };

  const canNavigateTo = (path: string) => {
    return canAccessRoute(role, path);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalDefaultRole,
        setAuthModalDefaultRole,
        authModalDefaultMode,
        setAuthModalDefaultMode,
        unauthorizedNotice,
        setUnauthorizedNotice,
        login,
        register,
        logout,
        openAuthModal,
        refreshUser,
        hasAccess,
        canNavigateTo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
