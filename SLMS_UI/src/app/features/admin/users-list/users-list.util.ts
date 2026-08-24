import { ROLE_DEFINITIONS } from '@core/constants/role-permissions';
import { AdminUser } from '@core/models/admin.models';
import { formatAppDate, formatAppDateTime } from '@core/utils/date-format.util';

export type UserStatusFilter = 'all' | 'Active' | 'Inactive';
export type UserDrawerTab = 'overview' | 'activity' | 'permissions' | 'audit' | 'security';

const HIDDEN_USER_ROLE_KEYS = new Set(['Members', 'SuperAdmin']);

export const STAFF_ROLE_OPTIONS = ROLE_DEFINITIONS.filter((r) => !HIDDEN_USER_ROLE_KEYS.has(r.key));

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

const STATUS_PROTECTED_ROLES = ['SuperAdmin', 'OrganisationAdmin'];

export function hasStatusProtectedRole(user: AdminUser): boolean {
  return user.roles.some((role) =>
    STATUS_PROTECTED_ROLES.some((protectedRole) => protectedRole.toLowerCase() === role.toLowerCase()),
  );
}

export function isStatusChangeProtected(user: AdminUser, currentUserId?: string | null): boolean {
  if (currentUserId && user.id === currentUserId) return true;
  return hasStatusProtectedRole(user);
}

export function canDeactivateUser(user: AdminUser, currentUserId?: string | null): boolean {
  return !isStatusChangeProtected(user, currentUserId);
}

export function formatUserDate(iso: string): string {
  return formatAppDateTime(iso);
}

export function formatUserDateOnly(iso: string): string {
  return formatAppDate(iso);
}

export function userScopeSummary(user: AdminUser): string {
  return user.accessScope?.summary?.trim() || 'Platform';
}

export type AuditEventCategory = 'activity' | 'audit';

export interface AuditEventMeta {
  label: string;
  category: AuditEventCategory;
  dotClass: string;
}

const AUDIT_EVENT_MAP: Record<string, AuditEventMeta> = {
  Login: { label: 'Sign in', category: 'activity', dotClass: 'bg-emerald-500' },
  Logout: { label: 'Sign out', category: 'activity', dotClass: 'bg-slate-400' },
  Register: { label: 'Account created', category: 'activity', dotClass: 'bg-sky-500' },
  RoleAssignment: { label: 'Role changed', category: 'audit', dotClass: 'bg-amber-500' },
  PermissionAssignment: { label: 'Permissions updated', category: 'audit', dotClass: 'bg-amber-500' },
  PasswordReset: { label: 'Password changed', category: 'audit', dotClass: 'bg-rose-500' },
  UserUpdate: { label: 'Profile updated', category: 'audit', dotClass: 'bg-sky-500' },
  UserDelete: { label: 'Account removed', category: 'audit', dotClass: 'bg-rose-600' },
  RoleCreate: { label: 'Role created', category: 'audit', dotClass: 'bg-violet-500' },
  RoleUpdate: { label: 'Role updated', category: 'audit', dotClass: 'bg-violet-500' },
};

export function auditEventLabel(eventType: string): string {
  return (
    AUDIT_EVENT_MAP[eventType]?.label ??
    eventType
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .trim()
  );
}

export function getAuditEventMeta(eventType: string): AuditEventMeta {
  return (
    AUDIT_EVENT_MAP[eventType] ?? {
      label: auditEventLabel(eventType),
      category: 'audit',
      dotClass: 'bg-slate-400',
    }
  );
}

export function isAuditActivityEvent(eventType: string): boolean {
  return getAuditEventMeta(eventType).category === 'activity';
}
