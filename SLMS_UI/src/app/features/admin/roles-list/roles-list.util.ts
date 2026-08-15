import {
  modulePermissions,
  PERMISSION_MODULES,
  PermissionKey,
  toClaimValue,
} from '@core/constants/permissions';
import { ROLE_DEFINITIONS, RoleKey } from '@core/constants/role-permissions';
import { AdminRole, AdminUser } from '@core/models/admin.models';

export type RoleScope = 'Global' | 'Institution' | 'Branch';

export interface PermissionCatalogItem {
  id: string;
  key: PermissionKey;
  module: string;
  action: string;
  description: string;
  sensitive?: boolean;
}

export interface RoleView {
  id: string;
  name: string;
  key: string;
  description: string;
  scope: RoleScope;
  system: boolean;
  members: number;
  permissions: string[];
  permissionKeys: PermissionKey[];
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  roleId: string;
  roleName: string;
  actor: string;
  action: string;
  detail: string;
  ts: string;
}

const MODULE_LABELS = PERMISSION_MODULES.map(
  (m) => m.charAt(0).toUpperCase() + m.slice(1),
);

const ACTION_LABELS = ['View', 'List', 'Create', 'Edit', 'Update', 'Delete'] as const;

const SENSITIVE_KEYS = new Set<PermissionKey>([
  PermissionKey.MembersDelete,
  PermissionKey.UsersDelete,
  PermissionKey.RolesDelete,
  PermissionKey.SettingsUpdate,
  PermissionKey.InstitutionsDelete,
  PermissionKey.BranchesDelete,
  PermissionKey.LibrariesDelete,
  PermissionKey.AttendanceScannerUse,
]);

export const PERMISSION_CATALOG: PermissionCatalogItem[] = buildCatalog();

export const PERMISSION_MODULES_UI = Array.from(
  new Set(PERMISSION_CATALOG.map((p) => p.module)),
);

function buildCatalog(): PermissionCatalogItem[] {
  const items: PermissionCatalogItem[] = [];

  for (let mi = 0; mi < PERMISSION_MODULES.length; mi++) {
    const keys = modulePermissions(mi);
    for (let ai = 0; ai < keys.length; ai++) {
      const key = keys[ai];
      items.push({
        id: toClaimValue(key),
        key,
        module: MODULE_LABELS[mi],
        action: ACTION_LABELS[ai],
        description: `${ACTION_LABELS[ai]} ${MODULE_LABELS[mi].toLowerCase()} resources`,
        sensitive: SENSITIVE_KEYS.has(key) || ai === 5,
      });
    }
  }

  items.push({
    id: toClaimValue(PermissionKey.AttendanceScannerUse),
    key: PermissionKey.AttendanceScannerUse,
    module: 'Attendance',
    action: 'Scanner',
    description: 'Use the attendance QR scanner',
    sensitive: true,
  });

  return items;
}

export function roleScope(key: RoleKey): RoleScope {
  switch (key) {
    case 'SuperAdmin':
    case 'OrganisationAdmin':
    case 'OrganisationManager':
    case 'Members':
      return 'Global';
    case 'InstitutionAdmin':
    case 'InstitutionManager':
      return 'Institution';
    default:
      return 'Branch';
  }
}

export function permsByModule(permissionIds: string[]) {
  const set = new Set(permissionIds);
  return PERMISSION_MODULES_UI.map((module) => {
    const all = PERMISSION_CATALOG.filter((p) => p.module === module);
    return {
      module,
      total: all.length,
      granted: all.filter((p) => set.has(p.id)).length,
    };
  });
}

export function formatRoleDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function countMembersByRole(users: AdminUser[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const user of users) {
    for (const role of user.roles) {
      counts.set(role, (counts.get(role) ?? 0) + 1);
    }
  }
  return counts;
}

export function buildRoleViews(apiRoles: AdminRole[], users: AdminUser[]): RoleView[] {
  const apiByName = new Map(
    apiRoles
      .filter((r) => r.name)
      .map((r) => [r.name!.toLowerCase(), r]),
  );
  const memberCounts = countMembersByRole(users);
  const now = new Date().toISOString();

  const views: RoleView[] = ROLE_DEFINITIONS.map((def) => {
    const api = apiByName.get(def.key.toLowerCase());
    return {
      id: api?.id ?? `def_${def.key}`,
      name: def.key,
      key: def.key,
      description: def.description,
      scope: roleScope(def.key),
      system: true,
      members: memberCounts.get(def.key) ?? 0,
      permissionKeys: [...def.permissions],
      permissions: def.permissions.map(toClaimValue),
      updatedAt: now,
    };
  });

  for (const api of apiRoles) {
    const name = api.name ?? '';
    const exists = ROLE_DEFINITIONS.some(
      (d) => d.key.toLowerCase() === name.toLowerCase(),
    );
    if (!exists) {
      views.push({
        id: api.id,
        name: name || 'Unnamed',
        key: name || api.id,
        description: 'Custom identity role',
        scope: 'Branch',
        system: false,
        members: memberCounts.get(name) ?? 0,
        permissionKeys: [],
        permissions: [],
        updatedAt: now,
      });
    }
  }

  return views;
}

export function claimKeysToPermissionKeys(claims: string[]): PermissionKey[] {
  const lookup = new Map(PERMISSION_CATALOG.map((p) => [p.id, p.key]));
  return claims
    .map((c) => lookup.get(c))
    .filter((k): k is PermissionKey => k !== undefined);
}
