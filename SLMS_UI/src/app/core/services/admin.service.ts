import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, map } from 'rxjs';
import {
  AdminAuditLog,
  AdminAssignRolesRequest,
  AdminChangeUserPasswordRequest,
  AdminCreateUserRequest,
  AdminRole,
  AdminRolePermissions,
  AdminUpdateUserRequest,
  AdminUser,
  PermissionItem,
} from '@core/models/admin.models';
import { PermissionKey } from '@core/constants/permissions';
import { InstitutionDropdownResponse } from '@core/models/institution-dropdown.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);
  private readonly base = 'admin';

  getUsers(options?: { staffOnly?: boolean }): Observable<AdminUser[]> {
    const params = options?.staffOnly ? { staffOnly: true } : undefined;
    return this.api
      .get<AdminUser[]>(`${this.base}/users`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  getUserById(id: string): Observable<AdminUser> {
    return this.api.getById<AdminUser>(`${this.base}/users`, id).pipe(map((r) => r.data!));
  }

  createUser(request: AdminCreateUserRequest): Observable<AdminUser> {
    return this.api.post<AdminUser>(`${this.base}/users`, request).pipe(map((r) => r.data!));
  }

  updateUser(id: string, request: AdminUpdateUserRequest): Observable<AdminUser> {
    return this.api.putTo<AdminUser>(`${this.base}/users/${id}`, request).pipe(map((r) => r.data!));
  }

  changeUserPassword(id: string, request: AdminChangeUserPasswordRequest): Observable<string> {
    return this.api
      .post<{ message: string }>(`${this.base}/users/${id}/password`, request)
      .pipe(map((r) => r.message ?? 'User password updated successfully.'));
  }

  deleteUser(id: string): Observable<void> {
    return this.api.deleteByPath(`${this.base}/users/${id}`).pipe(map(() => undefined));
  }

  assignUserRoles(id: string, request: AdminAssignRolesRequest): Observable<AdminUser> {
    return this.api
      .post<AdminUser>(`${this.base}/users/${id}/roles`, request)
      .pipe(map((r) => r.data!));
  }

  getRoles(): Observable<AdminRole[]> {
    return this.api.get<AdminRole[]>(`${this.base}/roles`).pipe(map((r) => r.data ?? []));
  }

  createRole(name: string): Observable<AdminRole> {
    return this.api.post<AdminRole>(`${this.base}/roles`, { name }).pipe(map((r) => r.data!));
  }

  updateRole(id: string, name: string): Observable<AdminRole> {
    return this.api.putTo<AdminRole>(`${this.base}/roles/${id}`, { name }).pipe(map((r) => r.data!));
  }

  getPermissions(): Observable<PermissionItem[]> {
    return this.api.get<PermissionItem[]>(`${this.base}/permissions`).pipe(map((r) => r.data ?? []));
  }

  getRolePermissions(roleId: string): Observable<AdminRolePermissions> {
    return this.api
      .get<AdminRolePermissions>(`${this.base}/roles/${roleId}/permissions`)
      .pipe(map((r) => r.data!));
  }

  assignRolePermissions(roleId: string, permissionKeys: PermissionKey[]): Observable<AdminRolePermissions> {
    return this.api
      .putTo<AdminRolePermissions>(`${this.base}/roles/${roleId}/permissions`, { permissions: permissionKeys })
      .pipe(map((r) => r.data!));
  }

  getAuditLogs(): Observable<AdminAuditLog[]> {
    return this.api.get<AdminAuditLog[]>(`${this.base}/audit-logs`).pipe(map((r) => r.data ?? []));
  }

  getUserScopeOptions(): Observable<InstitutionDropdownResponse[]> {
    return this.api
      .get<InstitutionDropdownResponse[]>(`${this.base}/users/scope-options`)
      .pipe(map((r) => r.data ?? []));
  }
}
