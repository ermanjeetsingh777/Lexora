export type RoleKey =
  | 'SuperAdmin'
  | 'InstitutionAdmin'
  | 'InstitutionManager'
  | 'BranchAdmin'
  | 'BranchManager'
  | 'LibrarianAdmin'
  | 'LibrarianManager'
  | 'Librarians'
  | 'Teachers'
  | 'Members';

export type PermissionKey =
  | 'dashboard.view'
  | 'members.view'
  | 'members.manage'
  | 'seats.view'
  | 'seats.manage'
  | 'attendance.view'
  | 'attendance.manage'
  | 'attendance.scanner.use'
  | 'institutions.manage'
  | 'branches.manage'
  | 'libraries.manage'
  | 'subscriptions.view'
  | 'subscriptions.manage'
  | 'payments.view'
  | 'books.view'
  | 'books.manage'
  | 'inventory.manage'
  | 'users.manage'
  | 'roles.manage'
  | 'reports.view'
  | 'notifications.manage'
  | 'profile.view'
  | 'settings.manage'
  | 'support.view';

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  description: string;
  permissions: PermissionKey[];
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [

  {
    key: 'SuperAdmin',
    label: 'SuperAdmin',
    description: 'Platform-wide configuration, full audit visibility and access.',
    permissions: [
      'dashboard.view',
      'members.view',
      'members.manage',
      'seats.view',
      'seats.manage',
      'attendance.view',
      'attendance.manage',
      'attendance.scanner.use',
      'institutions.manage',
      'branches.manage',
      'libraries.manage',
      'subscriptions.view',
      'subscriptions.manage',
      'payments.view',
      'books.view',
      'books.manage',
      'inventory.manage',
      'users.manage',
      'roles.manage',
      'reports.view',
      'notifications.manage',
      'profile.view',
      'settings.manage',
      'support.view',
    ],
  },
  {
    key: 'InstitutionAdmin',
    label: 'Institution Administrators',
    description: 'Manage entire institutional operations, branches, analytics and billing.',
    permissions: [
      'dashboard.view',
      'members.view',
      'members.manage',
      'seats.view',
      'seats.manage',
      'attendance.view',
      'attendance.manage',
      'attendance.scanner.use',
      'institutions.manage',
      'branches.manage',
      'libraries.manage',
      'subscriptions.view',
      'subscriptions.manage',
      'payments.view',
      'books.view',
      'books.manage',
      'inventory.manage',
      'users.manage',
      'roles.manage',
      'reports.view',
      'notifications.manage',
      'profile.view',
      'settings.manage',
      'support.view',
    ],
  },
  {
    key: 'InstitutionManager',
    label: 'Institution Managers',
    description: 'Operations support across branches and report generation.',
    permissions: [
      'dashboard.view',
      'members.view',
      'seats.view',
      'attendance.view',
      'attendance.manage',
      'institutions.manage',
      'branches.manage',
      'libraries.manage',
      'subscriptions.view',
      'payments.view',
      'books.view',
      'reports.view',
      'notifications.manage',
      'profile.view',
      'support.view',
    ],
  },
  {
    key: 'BranchAdmin',
    label: 'Branch Administrators',
    description: 'Branch-level operations, libraries, staff and member oversight.',
    permissions: [
      'dashboard.view',
      'members.view',
      'members.manage',
      'seats.view',
      'seats.manage',
      'attendance.view',
      'attendance.manage',
      'attendance.scanner.use',
      'branches.manage',
      'libraries.manage',
      'books.view',
      'reports.view',
      'notifications.manage',
      'profile.view',
      'support.view',
    ],
  },
  {
    key: 'BranchManager',
    label: 'Branch Managers',
    description: 'Daily branch operations, member/staff management and reports.',
    permissions: [
      'dashboard.view',
      'members.view',
      'members.manage',
      'seats.view',
      'attendance.view',
      'attendance.manage',
      'attendance.scanner.use',
      'branches.manage',
      'libraries.manage',
      'books.view',
      'reports.view',
      'notifications.manage',
      'profile.view',
      'support.view',
    ],
  },
  {
    key: 'LibrarianAdmin',
    label: 'Librarian Administrators',
    description: 'Full library ops: seat layouts, inventory and librarian staff.',
    permissions: [
      'dashboard.view',
      'members.view',
      'seats.view',
      'seats.manage',
      'attendance.view',
      'attendance.manage',
      'attendance.scanner.use',
      'libraries.manage',
      'books.view',
      'books.manage',
      'inventory.manage',
      'reports.view',
      'notifications.manage',
      'profile.view',
      'support.view',
    ],
  },
  {
    key: 'LibrarianManager',
    label: 'Librarian Managers',
    description: 'Day-to-day library operations, check-ins/check-outs and occupancy monitoring.',
    permissions: [
      'dashboard.view',
      'members.view',
      'seats.view',
      'attendance.view',
      'attendance.manage',
      'attendance.scanner.use',
      'libraries.manage',
      'books.view',
      'reports.view',
      'notifications.manage',
      'profile.view',
      'support.view',
    ],
  },
  {
    key: 'Librarians',
    label: 'Librarians',
    description: 'Perform library operations: check-in/check-out and book circulation.',
    permissions: [
      'dashboard.view',
      'members.view',
      'seats.view',
      'attendance.view',
      'attendance.manage',
      'attendance.scanner.use',
      'books.view',
      'reports.view',
      'profile.view',
      'support.view',
    ],
  },
  {
    key: 'Teachers',
    label: 'Teachers / Educators',
    description: 'Track attendance, subscription status and student progress reports.',
    permissions: [
      'dashboard.view',
      'members.view',
      'attendance.view',
      'subscriptions.view',
      'reports.view',
      'profile.view',
      'support.view',
    ],
  },
  {
    key: 'Members',
    label: 'Members / Students',
    description: 'Personal subscription and attendance details plus notifications.',
    permissions: [
      'dashboard.view',
      'attendance.view',
      'subscriptions.view',
      'reports.view',
      'profile.view',
    ],
  },
];

export function getRolePermissions(role: string | null | undefined): PermissionKey[] {
  if (!role) return [];
  return ROLE_DEFINITIONS.find((r) => r.key === (role as RoleKey))?.permissions ?? [];
}

