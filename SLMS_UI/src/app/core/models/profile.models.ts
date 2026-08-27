import { PermissionKey } from '@core/constants/permissions';
import { AdminUserAccessScope } from '@core/models/admin.models';

export interface UserPermissionDetail {
  key: PermissionKey;
  code: string;
  name: string;
}

export interface UserAccessSummary {
  institutionCount: number;
  branchCount: number;
  libraryCount: number;
  isPlatformWide: boolean;
}

export interface UserProfile {
  id: string;
  email: string | null;
  userName: string | null;
  fullName: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  userType: number;
  onboardingStep: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  roles: string[];
  permissions: PermissionKey[];
  permissionDetails: UserPermissionDetail[];
  accessScope: AdminUserAccessScope;
  accessSummary: UserAccessSummary;
}

export interface UpdateProfileRequest {
  fullName?: string;
  userName?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
