import { PermissionKey } from '@core/constants/permissions';

export interface AdminUser {
  id: string;
  email: string | null;
  userName: string | null;
  fullName: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  roles: string[];
  createdAtUtc: string;
}

export interface AdminRole {
  id: string;
  name: string | null;
}

export interface PermissionItem {
  key: PermissionKey;
  value: string;
}

export interface AdminRolePermissions {
  roleId: string;
  roleName: string | null;
  permissions: PermissionItem[];
}

export interface AdminAuditLog {
  id: number;
  eventType: string;
  userId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAtUtc: string;
}
