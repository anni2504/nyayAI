export type Role = 'CLIENT' | 'ADVOCATE' | 'GUEST';

export type Permission =
  | 'create_case'
  | 'use_copilot'
  | 'upload_documents'
  | 'analyze_documents'
  | 'discover_advocates'
  | 'save_advocates'
  | 'request_consultation'
  | 'view_own_cases'
  | 'view_assigned_client_cases'
  | 'manage_advocate_profile'
  | 'manage_case_history'
  | 'submit_case_history'
  | 'view_verified_case_history'
  | 'view_lead_requests'
  | 'accept_lead'
  | 'manage_clients'
  | 'advocate_analytics'
  | 'client_readiness_workflow'
  | 'edit_own_profile';

const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  GUEST: [
    'discover_advocates',
    'view_verified_case_history'
  ],
  CLIENT: [
    'create_case',
    'use_copilot',
    'upload_documents',
    'analyze_documents',
    'discover_advocates',
    'save_advocates',
    'request_consultation',
    'view_own_cases',
    'client_readiness_workflow',
    'edit_own_profile'
  ],
  ADVOCATE: [
    'view_assigned_client_cases',
    'manage_advocate_profile',
    'manage_case_history',
    'submit_case_history',
    'view_verified_case_history',
    'view_lead_requests',
    'accept_lead',
    'manage_clients',
    'advocate_analytics',
    'edit_own_profile'
  ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

export function canAccessRoute(role: Role, path: string): boolean {
  if (path === '/' || path === '/signin' || path.startsWith('/public')) {
    return true;
  }

  if (path.startsWith('/client')) {
    return role === 'CLIENT';
  }

  if (path.startsWith('/advocate')) {
    return role === 'ADVOCATE';
  }

  return false;
}
