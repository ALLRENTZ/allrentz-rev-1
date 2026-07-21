import type { UserRole } from '@/contexts/AuthContext';

const DASHBOARD_PATHS: Record<UserRole, string> = {
  customer: '/customer-dashboard',
  vendor: '/vendor-dashboard',
  admin: '/operations-center',
  manager: '/operations-center',
};

export function isRoleAllowed(
  role: UserRole,
  requiredRoles: readonly UserRole[],
): boolean {
  return requiredRoles.includes(role);
}

export function getDashboardPathForRole(role: UserRole): string {
  return DASHBOARD_PATHS[role];
}
