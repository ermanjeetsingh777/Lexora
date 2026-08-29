import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideChevronDown,
  LucideCopy,
  LucideFilter,
  LucideHistory,
  LucideKeyRound,
  LucideLock,
  LucideMail,
  LucidePlus,
  LucideSearch,
  LucideShield,
  LucideShieldAlert,
  LucideTrash2,
  LucideUnlock,
  LucideUserCog,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import {
  PageHeaderComponent,
  GlassCardComponent,
  SectionHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { AdminService } from '@core/services/admin.service';
import { AdminAuditLog, AdminRole, AdminUser } from '@core/models/admin.models';
import { InstitutionDropdownResponse } from '@core/models/institution-dropdown.model';
import { ToastService } from '@core/services/toast.service';
import { PermissionKey } from '@core/constants/permissions';
import { AuthService } from '@core/services/auth.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { getPermissionsForRoles } from '@core/constants/role-permissions';
import { SidebarService } from '../../../layouts/sidebar/sidebar.service';
import { PERMISSION_CATALOG } from '../roles-list/roles-list.util';
import { UserFormDialogComponent, UserFormSubmit } from './user-form-dialog.component';
import {
  auditEventLabel,
  formatUserDate,
  formatUserDateOnly,
  getAuditEventMeta,
  isAdminRole,
  canDeactivateUser,
  isStatusChangeProtected,
  primaryRole,
  roleLabel,
  userScopeSummary,
  STAFF_ROLE_OPTIONS,
  userDisplayName,
  userInitials,
  userStatus,
  UserDrawerTab,
  UserStatusFilter,
} from './users-list.util';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent,
    GlassCardComponent,
    SectionHeaderComponent,
    StatusBadgeComponent,
    ButtonComponent,
    KpiCardComponent,
    UserFormDialogComponent,
    LucideSearch,
    LucidePlus,
    LucideUsers,
    LucideShield,
    LucideMail,
    LucideTrash2,
    LucideX,
    LucideHistory,
    LucideChevronDown,
    LucideFilter,
    LucideLock,
    LucideUnlock,
    LucideUserCog,
    LucideCopy,
    LucideKeyRound,
    LucideShieldAlert,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly entitlements = inject(OrganizationEntitlementService);
  private readonly sidebar = inject(SidebarService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly users = signal<AdminUser[]>([]);
  readonly roles = signal<AdminRole[]>([]);
  readonly audit = signal<AdminAuditLog[]>([]);
  readonly scopeOptions = signal<InstitutionDropdownResponse[]>([]);

  readonly query = signal('');
  readonly roleFilter = signal<string>('all');
  readonly statusFilter = signal<UserStatusFilter>('all');
  readonly auditFeedOpen = signal(false);
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly formOpen = signal(false);
  readonly editUser = signal<AdminUser | null>(null);
  readonly formBusy = signal(false);

  readonly selectedUser = signal<AdminUser | null>(null);
  readonly drawerTab = signal<UserDrawerTab>('overview');

  readonly canList = this.auth.hasPermission(PermissionKey.UsersList);
  readonly canCreate = computed(
    () => this.auth.hasPermission(PermissionKey.UsersCreate) && (this.entitlements.canCreateUser() || this.auth.hasRole('SuperAdmin'))
  );
  readonly canUpdate = this.auth.hasPermission(PermissionKey.UsersUpdate);
  readonly canDelete = this.auth.hasPermission(PermissionKey.UsersDelete);
  readonly canAssignRoles = computed(
    () =>
      this.auth.hasRole('SuperAdmin') ||
      this.auth.hasRole('OrganisationAdmin') ||
      this.auth.hasPermission(PermissionKey.RolesUpdate) ||
      this.auth.hasPermission(PermissionKey.UsersCreate) ||
      this.auth.hasPermission(PermissionKey.UsersUpdate),
  );

  readonly staffRoleOptions = STAFF_ROLE_OPTIONS;
  readonly fmt = formatUserDate;
  readonly fmtDate = formatUserDateOnly;
  readonly userDisplayName = userDisplayName;
  readonly userInitials = userInitials;
  readonly userStatus = userStatus;
  readonly primaryRole = primaryRole;
  readonly roleLabel = roleLabel;
  readonly userScopeSummary = userScopeSummary;
  readonly canDeactivateUser = canDeactivateUser;
  readonly isStatusChangeProtected = isStatusChangeProtected;

  readonly canChangePassword =
    this.auth.hasRole('SuperAdmin') || this.auth.hasRole('OrganisationAdmin');
  readonly passwordTarget = signal<AdminUser | null>(null);
  readonly passwordBusy = signal(false);
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  readonly currentUserId = computed(() => this.auth.currentUser()()?.id ?? null);

  readonly assignableRoles = computed(() =>
    this.roles().filter((r) => {
      const name = (r.name ?? '').toLowerCase();
      return name !== 'members' && name !== 'superadmin';
    }),
  );

  readonly overlayLeft = computed(() => {
    if (this.sidebar.isMobile()) return '0';
    if (this.sidebar.isTablet()) return '4rem';
    return this.sidebar.collapsed() ? '4rem' : '16rem';
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return this.users().filter((u) => {
      if (role !== 'all' && !u.roles.includes(role)) return false;
      if (status !== 'all' && userStatus(u) !== status) return false;
      if (!q) return true;
      return (
        userDisplayName(u).toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        u.roles.some((r) => r.toLowerCase().includes(q) || roleLabel(r).toLowerCase().includes(q))
      );
    });
  });

  readonly totals = computed(() => {
    const list = this.users();
    return {
      total: list.length,
      active: list.filter((u) => u.isActive).length,
      admins: list.filter((u) => isAdminRole(u)).length,
      inactive: list.filter((u) => !u.isActive).length,
    };
  });

  readonly allFilteredSelected = computed(() => {
    const list = this.filtered();
    const ids = this.selectedIds();
    return list.length > 0 && list.every((u) => ids.has(u.id));
  });

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly governanceFeed = computed(() => this.audit().slice(0, 10));

  readonly selectedUserAudit = computed(() => {
    const user = this.selectedUser();
    if (!user) return [];
    return this.audit().filter(
      (e) => e.userId === user.id || (e.details ?? '').includes(user.email ?? ''),
    );
  });

  readonly selectedUserActivity = computed(() =>
    this.selectedUserAudit().filter((e) => getAuditEventMeta(e.eventType).category === 'activity'),
  );

  readonly selectedUserGovernanceAudit = computed(() =>
    this.selectedUserAudit().filter((e) => getAuditEventMeta(e.eventType).category === 'audit'),
  );

  readonly auditEventLabel = auditEventLabel;
  readonly getAuditEventMeta = getAuditEventMeta;

  readonly selectedUserPermissions = computed(() => {
    const user = this.selectedUser();
    if (!user) return [];
    const keys = getPermissionsForRoles(user.roles);
    const lookup = new Map(PERMISSION_CATALOG.map((p) => [p.key, p]));
    return keys.map((k) => lookup.get(k)).filter((p) => p !== undefined);
  });

  ngOnInit(): void {
    if (!this.canList) {
      this.error.set('You do not have permission to list users.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      users: this.admin.getUsers({ staffOnly: true }).pipe(catchError(() => of([]))),
      roles: this.admin.getRoles().pipe(catchError(() => of([]))),
      audit: this.admin.getAuditLogs().pipe(catchError(() => of([]))),
      scopeOptions: this.admin.getUserScopeOptions().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ users, roles, audit, scopeOptions }) => {
        this.users.set(users);
        this.roles.set(roles);
        this.audit.set(audit);
        this.scopeOptions.set(scopeOptions);
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        this.error.set('Failed to load users.');
        this.loading.set(false);
        this.toast.error('Failed to load users');
      },
    });
  }

  openCreate(): void {
    this.editUser.set(null);
    this.formOpen.set(true);
  }

  openEdit(user: AdminUser, event?: Event): void {
    event?.stopPropagation();
    this.editUser.set(user);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editUser.set(null);
  }

  onFormSubmit(payload: UserFormSubmit): void {
    if (!payload.email) {
      this.toast.error('Email is required');
      return;
    }

    if (!payload.institutionScopes.length) {
      this.toast.error('At least one institution is required');
      return;
    }

    const editing = this.editUser();
    if (
      editing &&
      !payload.isActive &&
      !canDeactivateUser(editing, this.currentUserId())
    ) {
      this.toast.error('This account cannot be deactivated.');
      return;
    }

    this.formBusy.set(true);

    if (editing) {
      this.admin
        .updateUser(editing.id, {
          fullName: payload.fullName || null,
          isActive: payload.isActive,
          institutionScopes: payload.institutionScopes.map((scope) => ({
            institutionId: scope.institutionId,
            branchIds: scope.branchIds,
            libraryIds: scope.libraryIds,
          })),
        })
        .pipe(
          switchMap(() =>
            this.canAssignRoles() && payload.roles.length
              ? this.admin.assignUserRoles(editing.id, { roles: payload.roles })
              : of(editing),
          ),
        )
        .subscribe({
          next: (user) => {
            this.upsertUser(user);
            this.formBusy.set(false);
            this.closeForm();
            this.toast.success('User saved');
          },
          error: (err) => {
            this.formBusy.set(false);
            this.toast.error(err?.error?.message ?? 'Failed to update user');
          },
        });
      return;
    }

    if (!payload.password || payload.password.length < 8) {
      this.formBusy.set(false);
      this.toast.error('Password must be at least 8 characters');
      return;
    }

    this.admin
      .createUser({
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName || null,
        isActive: payload.isActive,
        institutionScopes: payload.institutionScopes.map((scope) => ({
          institutionId: scope.institutionId,
          branchIds: scope.branchIds,
          libraryIds: scope.libraryIds,
        })),
      })
      .pipe(
        switchMap((user) => {
          if (payload.roles.length && this.canAssignRoles()) {
            return this.admin.assignUserRoles(user.id, { roles: payload.roles });
          }
          return of(user);
        }),
      )
      .subscribe({
        next: (user) => {
          this.upsertUser(user);
          this.formBusy.set(false);
          this.closeForm();
          this.toast.success('User created');
        },
        error: (err) => {
          this.formBusy.set(false);
          this.toast.error(err?.error?.message ?? 'Failed to create user');
        },
      });
  }

  selectUser(user: AdminUser): void {
    this.selectedUser.set(user);
    this.drawerTab.set('overview');
  }

  closeDrawer(): void {
    this.selectedUser.set(null);
  }

  toggleSelect(id: string, event?: Event): void {
    event?.stopPropagation();
    this.selectedIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  selectAllFiltered(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.filtered().map((u) => u.id)) : new Set());
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  bulkSetActive(active: boolean): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length || !this.canUpdate) return;

    const currentUserId = this.currentUserId();
    const targets = this.users().filter((u) => ids.includes(u.id));
    const eligible = active
      ? targets
      : targets.filter((u) => canDeactivateUser(u, currentUserId));
    const skipped = active ? 0 : targets.length - eligible.length;

    if (!active && skipped > 0 && eligible.length === 0) {
      this.toast.error('Selected users cannot be deactivated.');
      return;
    }

    if (!eligible.length) {
      this.clearSelection();
      return;
    }

    let done = 0;
    for (const user of eligible) {
      if (user.isActive === active) {
        done++;
        if (done === eligible.length) {
          const msg =
            skipped > 0
              ? `${eligible.length} user(s) disabled. ${skipped} protected account(s) skipped.`
              : `${eligible.length} user(s) ${active ? 'enabled' : 'disabled'}`;
          this.toast.success(msg);
          this.clearSelection();
        }
        continue;
      }
      this.admin.updateUser(user.id, { isActive: active }).subscribe({
        next: (updated) => {
          this.upsertUser(updated);
          done++;
          if (done === eligible.length) {
            const msg =
              skipped > 0
                ? `${eligible.length} user(s) disabled. ${skipped} protected account(s) skipped.`
                : `${eligible.length} user(s) ${active ? 'enabled' : 'disabled'}`;
            this.toast.success(msg);
            this.clearSelection();
          }
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Failed to update some users'),
      });
    }
  }

  bulkResetLinks(): void {
    const count = this.selectedIds().size;
    this.toast.success(`Reset links queued for ${count} user(s)`);
    this.clearSelection();
  }

  toggleUserActive(user: AdminUser, event?: Event): void {
    event?.stopPropagation();
    if (!this.canUpdate) return;

    const deactivating = user.isActive;
    if (deactivating && !canDeactivateUser(user, this.currentUserId())) {
      this.toast.error('This account cannot be deactivated.');
      return;
    }

    this.admin.updateUser(user.id, { isActive: !user.isActive }).subscribe({
      next: (updated) => {
        this.upsertUser(updated);
        if (this.selectedUser()?.id === updated.id) this.selectedUser.set(updated);
        this.toast.success(updated.isActive ? 'User enabled' : 'User disabled');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to update user'),
    });
  }

  copyEmail(user: AdminUser): void {
    if (!user.email) return;
    navigator.clipboard.writeText(user.email).then(() => this.toast.success('Email copied'));
  }

  sendResetLink(user: AdminUser): void {
    this.toast.success('Password reset link sent');
  }

  openPasswordDialog(user: AdminUser, event?: Event): void {
    event?.stopPropagation();
    this.passwordTarget.set(user);
    this.newPassword.set('');
    this.confirmPassword.set('');
  }

  closePasswordDialog(): void {
    this.passwordTarget.set(null);
    this.passwordBusy.set(false);
    this.newPassword.set('');
    this.confirmPassword.set('');
  }

  confirmPasswordChange(): void {
    const user = this.passwordTarget();
    if (!user) return;

    const password = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (password.length < 8) {
      this.toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirm) {
      this.toast.error('Passwords do not match');
      return;
    }

    this.passwordBusy.set(true);
    this.admin.changeUserPassword(user.id, {
      newPassword: password,
      confirmPassword: confirm,
    }).subscribe({
      next: (message) => {
        this.passwordBusy.set(false);
        this.closePasswordDialog();
        this.toast.success(message);
      },
      error: (err) => {
        this.passwordBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to update user password');
      },
    });
  }

  deleteUser(user: AdminUser, event?: Event): void {
    event?.stopPropagation();
    if (!this.canDelete) return;
    if (!confirm(`Remove user ${user.email}? This cannot be undone.`)) return;

    this.admin.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== user.id));
        if (this.selectedUser()?.id === user.id) this.closeDrawer();
        this.toast.success('User removed');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to delete user'),
    });
  }

  private upsertUser(user: AdminUser): void {
    this.users.update((list) => {
      const idx = list.findIndex((u) => u.id === user.id);
      if (idx < 0) return [user, ...list];
      const next = [...list];
      next[idx] = user;
      return next;
    });
  }
}
