
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/contexts/AuthContext';
import { getDashboardPathForRole, isRoleAllowed } from '@/lib/routeAuthority';

type ProtectedRouteProps = {
  requiredRole: UserRole;
  requiredRoles?: never;
  children: React.ReactNode;
} | {
  requiredRole?: never;
  requiredRoles: readonly UserRole[];
  children: React.ReactNode;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, requiredRoles, children }) => {
  const { user, profile, loading } = useAuth();
  const allowedRoles: readonly UserRole[] = requiredRoles ?? [requiredRole];

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return null;

  if (!isRoleAllowed(profile.role_type, allowedRoles)) {
    return <Navigate to={getDashboardPathForRole(profile.role_type)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
