import {
  allPermissions,
  modulePermissions,
  PermissionKey,
  viewListPermissions,
} from './permissions';

/** Mirrors `SLMS_API/Common/Constants/RoleDefinitions.cs` */
export type RoleKey =
  | 'SuperAdmin'
  | 'OrganisationAdmin'
  | 'OrganisationManager'
  | 'InstitutionAdmin'
  | 'InstitutionManager'
  | 'BranchAdmin'
  | 'BranchManager'
  | 'LibrarianAdmin'
  | 'LibrarianManager'
  | 'Librarians'
  | 'Teachers'
  | 'Members';

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  description: string;
  permissions: PermissionKey[];
}

const M = modulePermissions;
const R = viewListPermissions;
const S = (key: PermissionKey): PermissionKey[] => [key];

function combine(...sets: PermissionKey[][]): PermissionKey[] {
  return [...new Set(sets.flat())];
}

const platformOperator = () =>
  combine(
    R(0), M(1), M(2), M(3), S(PermissionKey.AttendanceScannerUse),
    M(4), M(5), M(6), M(7), R(8),
    M(9), M(10), M(11), M(12), R(13), M(14), R(15), M(16), R(17),
  );

const institutionScope = () =>
  combine(
    R(0), M(1), M(2), M(3), S(PermissionKey.AttendanceScannerUse),
    M(4), M(5), M(6), M(7), R(8), M(9), M(10), M(11), M(12), R(13), M(14), R(15), M(16), R(17),
  );

const institutionOps = () =>
  combine(
    R(0), R(1), M(1), R(2), M(2), R(3), M(3), S(PermissionKey.AttendanceScannerUse),
    M(4), M(5), M(6), R(7), M(7), R(8), R(9), M(10), R(13), M(14), R(15), R(17),
  );

const branchAdminScope = () =>
  combine(R(0), M(1), M(2), M(3), M(5), M(6), M(11), R(13), M(14), M(16));

const branchOps = () =>
  combine(R(0), R(1), M(1), R(2), M(2), R(3), M(3), M(5), M(6), R(9), M(10), R(13), M(14), R(15));

const libraryAdminScope = () =>
  combine(R(0), M(1), M(2), M(3), S(PermissionKey.AttendanceScannerUse), M(5), M(6), M(9), M(10), M(11), R(13), M(14));

const libraryOps = () =>
  combine(R(0), R(1), R(2), R(3), S(PermissionKey.AttendanceScannerUse), M(6), R(9), M(10), R(13), R(15));

const libraryStaff = () =>
  combine(R(0), R(1), R(2), R(3), S(PermissionKey.AttendanceScannerUse), R(9), M(10), R(15));

const teacherScope = () => combine(R(0), R(1), R(3), R(7), R(9), R(13), R(15));

const memberPortal = () => combine(R(0), R(1), R(2), R(3), R(9), R(15), R(17));

const ROLE_PERMISSION_MAP: Record<RoleKey, PermissionKey[]> = {
  SuperAdmin: allPermissions(),
  OrganisationAdmin: platformOperator(),
  OrganisationManager: platformOperator(),
  InstitutionAdmin: institutionScope(),
  InstitutionManager: institutionOps(),
  BranchAdmin: branchAdminScope(),
  BranchManager: branchOps(),
  LibrarianAdmin: libraryAdminScope(),
  LibrarianManager: libraryOps(),
  Librarians: libraryStaff(),
  Teachers: teacherScope(),
  Members: memberPortal(),
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: 'SuperAdmin',
    label: 'Super Admin',
    description: 'Platform-wide configuration, full audit visibility and access.',
    permissions: ROLE_PERMISSION_MAP.SuperAdmin,
  },
  {
    key: 'OrganisationAdmin',
    label: 'Organisation Admin',
    description: 'Full platform operator access across organisations.',
    permissions: ROLE_PERMISSION_MAP.OrganisationAdmin,
  },
  {
    key: 'OrganisationManager',
    label: 'Organisation Manager',
    description: 'Platform operations and reporting across organisations.',
    permissions: ROLE_PERMISSION_MAP.OrganisationManager,
  },
  {
    key: 'InstitutionAdmin',
    label: 'Institution Admin',
    description: 'Manage entire institutional operations, branches, analytics and billing.',
    permissions: ROLE_PERMISSION_MAP.InstitutionAdmin,
  },
  {
    key: 'InstitutionManager',
    label: 'Institution Manager',
    description: 'Operations support across branches and report generation.',
    permissions: ROLE_PERMISSION_MAP.InstitutionManager,
  },
  {
    key: 'BranchAdmin',
    label: 'Branch Admin',
    description: 'Branch-level operations, libraries, staff and member oversight.',
    permissions: ROLE_PERMISSION_MAP.BranchAdmin,
  },
  {
    key: 'BranchManager',
    label: 'Branch Manager',
    description: 'Daily branch operations, member/staff management and reports.',
    permissions: ROLE_PERMISSION_MAP.BranchManager,
  },
  {
    key: 'LibrarianAdmin',
    label: 'Librarian Admin',
    description: 'Full library ops: seat layouts, inventory and librarian staff.',
    permissions: ROLE_PERMISSION_MAP.LibrarianAdmin,
  },
  {
    key: 'LibrarianManager',
    label: 'Librarian Manager',
    description: 'Day-to-day library operations, check-ins/check-outs and occupancy monitoring.',
    permissions: ROLE_PERMISSION_MAP.LibrarianManager,
  },
  {
    key: 'Librarians',
    label: 'Librarians',
    description: 'Perform library operations: check-in/check-out and book circulation.',
    permissions: ROLE_PERMISSION_MAP.Librarians,
  },
  {
    key: 'Teachers',
    label: 'Teachers / Educators',
    description: 'Track attendance, subscription status and student progress reports.',
    permissions: ROLE_PERMISSION_MAP.Teachers,
  },
  {
    key: 'Members',
    label: 'Members / Students',
    description: 'Personal subscription and attendance details plus notifications.',
    permissions: ROLE_PERMISSION_MAP.Members,
  },
];

export function getRolePermissions(role: string | null | undefined): PermissionKey[] {
  if (!role) return [];
  return ROLE_PERMISSION_MAP[role as RoleKey] ?? [];
}

export function getPermissionsForRoles(roles: string[]): PermissionKey[] {
  return [...new Set(roles.flatMap((r) => getRolePermissions(r)))];
}

export const ALL_ROLE_KEYS = Object.keys(ROLE_PERMISSION_MAP) as RoleKey[];
