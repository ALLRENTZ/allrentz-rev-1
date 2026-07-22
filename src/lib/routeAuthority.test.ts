import { describe, expect, it } from 'vitest';
import { getDashboardPathForRole, isRoleAllowed } from './routeAuthority';

describe('operations route authority', () => {
  const operationsRoles = ['admin', 'manager'] as const;

  it('allows only admin and manager profiles into operations routes', () => {
    expect(isRoleAllowed('admin', operationsRoles)).toBe(true);
    expect(isRoleAllowed('manager', operationsRoles)).toBe(true);
    expect(isRoleAllowed('customer', operationsRoles)).toBe(false);
    expect(isRoleAllowed('vendor', operationsRoles)).toBe(false);
  });

  it('redirects each role to its own dashboard', () => {
    expect(getDashboardPathForRole('customer')).toBe('/customer-dashboard');
    expect(getDashboardPathForRole('vendor')).toBe('/vendor-dashboard');
    expect(getDashboardPathForRole('admin')).toBe('/operations-center');
    expect(getDashboardPathForRole('manager')).toBe('/operations-center');
  });

  it('fails closed when the profile role is missing', () => {
    expect(isRoleAllowed(null, operationsRoles)).toBe(false);
    expect(isRoleAllowed(undefined, operationsRoles)).toBe(false);
    expect(getDashboardPathForRole(null)).toBe('/');
    expect(getDashboardPathForRole(undefined)).toBe('/');
  });
});
