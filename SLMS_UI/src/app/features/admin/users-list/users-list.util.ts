import { ROLE_DEFINITIONS } from '@core/constants/role-permissions';
import { AdminUser } from '@core/models/admin.models';

export type UserStatusFilter = 'all' | 'Active' | 'Inactive';
export type UserDrawerTab = 'overview' | 'activity' | 'permissions' | 'audit' | 'security';

export const STAFF_ROLE_OPTIONS = ROLE_DEFINITIONS.filter((r) => r.key !== 'Members');

export function userDisplayName(user: AdminUser): string {
  return user.fullName || user.userName || user.email || '—';
}

export function userInitials(user: AdminUser): string {
  const name = userDisplayName(user);
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function userStatus(user: AdminUser): 'Active' | 'Inactive' {
  return user.isActive ? 'Active' : 'Inactive';
}

export function primaryRole(user: AdminUser): string {
  if (!user.roles.length) return '—';
  const admin = user.roles.find((r) => r.toLowerCase().includes('admin'));
  return admin ?? user.roles[0];
}

export function roleLabel(roleName: string): string {
  const def = ROLE_DEFINITIONS.find((r) => r.key.toLowerCase() === roleName.toLowerCase());
  return def?.label ?? roleName;
}

export function isAdminRole(user: AdminUser): boolean {
  return user.roles.some((r) => r.toLowerCase().includes('admin'));
}

export function formatUserDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
