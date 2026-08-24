import { PermissionKey } from '@core/constants/permissions';

export interface AdminUserInstitutionScope {
  institutionId: string;
  institutionName: string;
  branches: AdminUserScopeItem[];
  libraries: AdminUserScopeItem[];
}

export interface AdminUserAccessScope {
  institutionId?: string | null;
  institutionName?: string | null;
  institutionScopes: AdminUserInstitutionScope[];
  branches: AdminUserScopeItem[];
  libraries: AdminUserScopeItem[];
  summary: string;
}

export interface AdminUserScopeItem {
  id: string;
  name: string;
}

export interface AdminUser {
  id: string;
  email: string | null;
  userName: string | null;
  fullName: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  roles: string[];
  createdAtUtc: string;
  accessScope?: AdminUserAccessScope | null;
}

export interface AdminRole {
  id: string;
  name: string | null;
  isSystem?: boolean;
  institutionIds?: string[];
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

export interface AdminUserInstitutionScopeRequest {
  institutionId: string;
  branchIds?: string[];
  libraryIds?: string[];
}

export interface AdminCreateUserRequest {
  email: string;
  password: string;
  fullName?: string | null;
  isActive?: boolean;
  institutionScopes: AdminUserInstitutionScopeRequest[];
}

export interface AdminUpdateUserRequest {
  fullName?: string | null;
  isActive?: boolean | null;
  institutionScopes?: AdminUserInstitutionScopeRequest[];
}

export interface AdminAssignRolesRequest {
  roles: string[];
}

export interface AdminChangeUserPasswordRequest {
  newPassword: string;
  confirmPassword: string;
}
