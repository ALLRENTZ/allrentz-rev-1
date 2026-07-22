import type { UserRole } from '@/contexts/AuthContext';

const DASHBOARD_PATHS: Record<UserRole, string> = {
  customer: '/customer-dashboard',
  vendor: '/vendor-dashboard',
  admin: '/operations-center',
  manager: '/operations-center',
};

export function isRoleAllowed(
  role: UserRole | null | undefined,
  requiredRoles: readonly UserRole[],
): boolean {
  return role !== null && role !== undefined && requiredRoles.includes(role);
}

export function getDashboardPathForRole(role: UserRole | null | undefined): string {
  return role === null || role === undefined ? '/' : DASHBOARD_PATHS[role];
}
