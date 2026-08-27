import React, { createContext, useContext, useState } from 'react';
import type { Role, Permission } from '../auth/rbac';
import { hasPermission, canAccessRoute } from '../auth/rbac';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  title?: string;
  barNumber?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: Role;
  isAuthenticated: boolean;
  isRoleModalOpen: boolean;
  setIsRoleModalOpen: (open: boolean) => void;
  unauthorizedNotice: string | null;
  setUnauthorizedNotice: (notice: string | null) => void;
  loginAsRole: (selectedRole: Role) => void;
  logout: () => void;
  hasAccess: (permission: Permission) => boolean;
  canNavigateTo: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>({
    id: 'usr-client-1',
    name: 'Rohan Sharma',
    email: 'client@nyayai.demo',
    role: 'CLIENT',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  });

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [unauthorizedNotice, setUnauthorizedNotice] = useState<string | null>(null);

  const role: Role = user ? user.role : 'GUEST';
  const isAuthenticated = user !== null;

  const loginAsRole = (selectedRole: Role) => {
    if (selectedRole === 'CLIENT') {
      setUser({
        id: 'usr-client-1',
        name: 'Rohan Sharma',
        email: 'client@nyayai.demo',
        role: 'CLIENT',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      });
    } else if (selectedRole === 'ADVOCATE') {
      setUser({
        id: 'usr-advocate-1',
        name: 'Adv. Rajesh Varma',
        email: 'advocate@nyayai.demo',
        role: 'ADVOCATE',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
        title: 'Senior Criminal Defense Counsel',
        barNumber: 'KAR/2012/4819'
      });
    } else {
      setUser(null);
    }
    setIsRoleModalOpen(false);
    setUnauthorizedNotice(null);
  };

  const logout = () => {
    setUser(null);
    setUnauthorizedNotice(null);
  };

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
        isRoleModalOpen,
        setIsRoleModalOpen,
        unauthorizedNotice,
        setUnauthorizedNotice,
        loginAsRole,
        logout,
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
