import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, map } from 'rxjs';
import {
  AdminAuditLog,
  AdminRole,
  AdminRolePermissions,
  AdminUser,
  PermissionItem,
} from '@core/models/admin.models';
import { PermissionKey } from '@core/constants/permissions';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);
  private readonly base = 'admin';

  getUsers(): Observable<AdminUser[]> {
    return this.api.get<AdminUser[]>(`${this.base}/users`).pipe(map((r) => r.data ?? []));
  }

  getUserById(id: string): Observable<AdminUser> {
    return this.api.getById<AdminUser>(`${this.base}/users`, id).pipe(map((r) => r.data!));
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
}
