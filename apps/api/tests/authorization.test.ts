export type OrganizationRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER';
export type Permission =
  | 'MANAGE_BILLING'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_TEAM'
  | 'MANAGE_REPOSITORIES'
  | 'CONFIGURE_INTEGRATIONS'
  | 'RUN_ANALYSIS'
  | 'GENERATE_TESTS'
  | 'SUBMIT_FEEDBACK'
  | 'VIEW_REPORTS'
  | 'VIEW_DASHBOARD';

const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  OWNER: [
    'MANAGE_BILLING',
    'MANAGE_SETTINGS',
    'MANAGE_TEAM',
    'MANAGE_REPOSITORIES',
    'CONFIGURE_INTEGRATIONS',
    'RUN_ANALYSIS',
    'GENERATE_TESTS',
    'SUBMIT_FEEDBACK',
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
  ADMIN: [
    'MANAGE_TEAM',
    'MANAGE_REPOSITORIES',
    'CONFIGURE_INTEGRATIONS',
    'RUN_ANALYSIS',
    'GENERATE_TESTS',
    'SUBMIT_FEEDBACK',
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
  DEVELOPER: [
    'RUN_ANALYSIS',
    'GENERATE_TESTS',
    'SUBMIT_FEEDBACK',
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
  MEMBER: [
    'RUN_ANALYSIS',
    'GENERATE_TESTS',
    'SUBMIT_FEEDBACK',
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
  VIEWER: [
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
};

function hasRole(userRole: string, currentOrgRole: OrganizationRole, allowedRoles: OrganizationRole[]): boolean {
  if (userRole === 'SYSTEM_ADMIN') return true;
  const effectiveRoles = allowedRoles.flatMap(r => r === 'DEVELOPER' ? ['DEVELOPER', 'MEMBER'] : [r]);
  return effectiveRoles.includes(currentOrgRole);
}

function hasPermission(userRole: string, currentOrgRole: OrganizationRole, permission: Permission): boolean {
  if (userRole === 'SYSTEM_ADMIN') return true;
  const granted = ROLE_PERMISSIONS[currentOrgRole] || [];
  return granted.includes(permission);
}

export async function runAuthorizationTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  // Test 1: Role-Based Access Control (Owner-only route)
  try {
    if (!hasRole('USER', 'OWNER', ['OWNER'])) {
      throw new Error('OWNER role was erroneously blocked from owner route');
    }

    if (hasRole('USER', 'DEVELOPER', ['OWNER'])) {
      throw new Error('DEVELOPER was improperly allowed into OWNER route');
    }

    if (hasRole('USER', 'VIEWER', ['ADMIN', 'DEVELOPER'])) {
      throw new Error('VIEWER was improperly allowed into ADMIN/DEVELOPER route');
    }

    results.push({ name: 'RBAC: OWNER role enforcement and privilege restriction', passed: true });
  } catch (err: any) {
    results.push({ name: 'RBAC: OWNER role enforcement and privilege restriction', passed: false, error: err.message });
  }

  // Test 2: Fine-grained Functional Permissions
  try {
    // Developer can run analysis
    if (!hasPermission('USER', 'DEVELOPER', 'RUN_ANALYSIS')) {
      throw new Error('DEVELOPER was blocked from RUN_ANALYSIS');
    }

    // Developer can generate tests
    if (!hasPermission('USER', 'DEVELOPER', 'GENERATE_TESTS')) {
      throw new Error('DEVELOPER was blocked from GENERATE_TESTS');
    }

    // Viewer CANNOT run analysis
    if (hasPermission('USER', 'VIEWER', 'RUN_ANALYSIS')) {
      throw new Error('VIEWER was erroneously granted RUN_ANALYSIS permission');
    }

    // Viewer CAN view reports
    if (!hasPermission('USER', 'VIEWER', 'VIEW_REPORTS')) {
      throw new Error('VIEWER was blocked from VIEW_REPORTS');
    }

    results.push({ name: 'RBAC: Functional permission resolution (DEVELOPER vs VIEWER)', passed: true });
  } catch (err: any) {
    results.push({ name: 'RBAC: Functional permission resolution (DEVELOPER vs VIEWER)', passed: false, error: err.message });
  }

  // Test 3: System Admin Superuser Override
  try {
    if (!hasPermission('SYSTEM_ADMIN', 'VIEWER', 'MANAGE_BILLING')) {
      throw new Error('SYSTEM_ADMIN was not granted platform superuser override');
    }

    results.push({ name: 'RBAC: SYSTEM_ADMIN platform override verification', passed: true });
  } catch (err: any) {
    results.push({ name: 'RBAC: SYSTEM_ADMIN platform override verification', passed: false, error: err.message });
  }

  return results;
}
