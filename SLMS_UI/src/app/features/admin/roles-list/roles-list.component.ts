import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAlertTriangle,
  LucideCheck,
  LucideCopy,
  LucideHistory,
  LucideLock,
  LucidePencil,
  LucidePlus,
  LucideRotateCcw,
  LucideSearch,
  LucideShield,
  LucideTrash2,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminService } from '@core/services/admin.service';
import { ToastService } from '@core/services/toast.service';
import { SidebarService } from '../../../layouts/sidebar/sidebar.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import {
  GlassCardComponent,
  PageHeaderComponent,
  SectionHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import {
  AuditEntry,
  buildRoleViews,
  claimKeysToPermissionKeys,
  formatRoleDate,
  PERMISSION_CATALOG,
  PERMISSION_MODULES_UI,
  PermissionCatalogItem,
  permsByModule,
  RoleScope,
  RoleView,
} from './roles-list.util';
import { PermissionKey } from '@core/constants/permissions';

type ScopeFilter = 'all' | RoleScope;
type DrawerTab = 'perms' | 'members' | 'audit';

/** Default matrix columns: SuperAdmin, OrganisationAdmin, OrganisationManager, InstitutionAdmin */
const DEFAULT_MATRIX_ROLE_NAMES = [
  'SuperAdmin',
  'OrganisationAdmin',
  'OrganisationManager',
  'InstitutionAdmin',
] as const;

const MATRIX_ROLE_ABBREV: Record<string, string> = {
  SuperAdmin: 'SA',
  OrganisationAdmin: 'OA',
  OrganisationManager: 'OM',
  InstitutionAdmin: 'IA',
  InstitutionManager: 'IM',
  BranchAdmin: 'BA',
  BranchManager: 'BM',
  LibrarianAdmin: 'LA',
  LibrarianManager: 'LM',
  Librarians: 'LB',
  Teachers: 'TC',
  Members: 'MB',
};

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent,
    SectionHeaderComponent,
    GlassCardComponent,
    KpiCardComponent,
    ButtonComponent,
    StatusBadgeComponent,
    LucideShield,
    LucideLock,
    LucidePencil,
    LucideUsers,
    LucidePlus,
    LucideSearch,
    LucideCheck,
    LucideX,
    LucideCopy,
    LucideTrash2,
    LucideHistory,
    LucideAlertTriangle,
    LucideRotateCcw,
  ],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.css',
})
export class RolesListComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly sidebar = inject(SidebarService);

  readonly loading = signal(true);
  readonly roles = signal<RoleView[]>([]);
  readonly audit = signal<AuditEntry[]>([]);
  readonly users = signal<{ fullName: string | null; email: string | null; roles: string[]; isActive: boolean }[]>([]);

  readonly query = signal('');
  readonly scopeFilter = signal<ScopeFilter>('all');
  readonly selectedId = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editorRole = signal<RoleView | null>(null);
  readonly editorOriginal = signal<RoleView | null>(null);
  readonly editorSearch = signal('');
  readonly drawerTab = signal<DrawerTab>('perms');
  readonly saving = signal(false);

  readonly matrixSearch = signal('');
  readonly matrixModule = signal<string>('all');
  readonly matrixDiffOnly = signal(false);
  readonly matrixCollapsedModules = signal<Set<string>>(new Set());
  readonly matrixHighlightRoleId = signal<string | null>(null);
  readonly matrixSelectedRoleNames = signal<string[]>([...DEFAULT_MATRIX_ROLE_NAMES]);
  readonly matrixAddRolePick = signal('');
  readonly matrixReplaceIndex = signal<number | null>(null);
  readonly matrixReplacePick = signal('');

  readonly permissions = PERMISSION_CATALOG;
  readonly modules = PERMISSION_MODULES_UI;
  readonly fmt = formatRoleDate;

  readonly overlayLeft = computed(() => {
    if (this.sidebar.isMobile()) return '0';
    if (this.sidebar.isTablet()) return '4rem';
    return this.sidebar.collapsed() ? '4rem' : '16rem';
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const scope = this.scopeFilter();
    return this.roles().filter((r) => {
      if (scope !== 'all' && r.scope !== scope) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.permissions.some((p) => p.includes(q))
      );
    });
  });

  readonly totals = computed(() => {
    const list = this.roles();
    return {
      total: list.length,
      system: list.filter((r) => r.system).length,
      custom: list.filter((r) => !r.system).length,
      members: list.reduce((a, r) => a + r.members, 0),
    };
  });

  readonly selected = computed(() =>
    this.roles().find((r) => r.id === this.selectedId()) ?? null,
  );

  readonly roleAudit = computed(() => {
    const id = this.selectedId();
    if (!id) return [];
    const role = this.selected();
    return this.audit().filter(
      (a) => a.roleId === id || (role && a.roleName === role.name),
    );
  });

  readonly editorFilteredPermissions = computed(() => {
    const q = this.editorSearch().trim().toLowerCase();
    if (!q) return this.permissions;
    return this.permissions.filter(
      (p) =>
        p.id.includes(q) ||
        p.action.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  });

  readonly editorDiffCount = computed(() => {
    const role = this.editorRole();
    const original = this.editorOriginal();
    if (!role) return 0;
    if (!original) return role.permissions.length;
    const a = new Set(original.permissions);
    const b = new Set(role.permissions);
    let n = 0;
    a.forEach((x) => { if (!b.has(x)) n++; });
    b.forEach((x) => { if (!a.has(x)) n++; });
    return n;
  });

  readonly matrixRoles = computed(() => {
    const byName = new Map(this.roles().map((r) => [r.name, r]));
    return this.matrixSelectedRoleNames()
      .map((name) => byName.get(name))
      .filter((r): r is RoleView => !!r);
  });

  readonly matrixAvailableRoles = computed(() => {
    const selected = new Set(this.matrixSelectedRoleNames());
    return this.roles().filter((r) => !selected.has(r.name));
  });

  matrixReplaceCandidates(index: number): RoleView[] {
    const names = this.matrixSelectedRoleNames();
    const excluded = new Set(names.filter((_, i) => i !== index));
    return this.roles().filter((r) => !excluded.has(r.name));
  }

  readonly matrixModules = computed(() => {
    const mod = this.matrixModule();
    if (mod === 'all') return this.modules;
    return this.modules.filter((m) => m === mod);
  });

  readonly matrixPermissionCount = computed(() => {
    let count = 0;
    for (const m of this.matrixModules()) {
      count += this.matrixPermissionsForModule(m).length;
    }
    return count;
  });

  readonly scopeFilters: ScopeFilter[] = ['all', 'Global', 'Institution', 'Branch'];
  readonly editorScopes: RoleScope[] = ['Global', 'Institution', 'Branch'];

  ngOnInit(): void {
    forkJoin({
      roles: this.admin.getRoles().pipe(catchError(() => of([]))),
      users: this.admin.getUsers().pipe(catchError(() => of([]))),
      audit: this.admin.getAuditLogs().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ roles, users, audit }) => {
        this.roles.set(buildRoleViews(roles, users));
        this.users.set(users);
        this.syncMatrixRoleSelection();
        this.audit.set(
          audit.map((a) => ({
            id: String(a.id),
            roleId: '',
            roleName: a.eventType,
            actor: a.userId ?? 'System',
            action: a.eventType,
            detail: a.details ?? '',
            ts: a.createdAtUtc,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.roles.set(buildRoleViews([], []));
        this.loading.set(false);
        this.toast.error('Failed to load roles data');
      },
    });
  }

  permsByModule(ids: string[]) {
    return permsByModule(ids);
  }

  matrixPermissionsForModule(module: string): PermissionCatalogItem[] {
    const q = this.matrixSearch().trim().toLowerCase();
    const roles = this.matrixRoles();
    const diffOnly = this.matrixDiffOnly();

    return this.permissionsForModule(module).filter((p) => {
      if (q) {
        const matches =
          p.id.includes(q) ||
          p.action.toLowerCase().includes(q) ||
          p.module.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (diffOnly && this.isPermissionUniform(p.id, roles)) return false;
      return true;
    });
  }

  isModuleCollapsed(module: string): boolean {
    return this.matrixCollapsedModules().has(module);
  }

  toggleMatrixModule(module: string): void {
    this.matrixCollapsedModules.update((set) => {
      const next = new Set(set);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  expandAllMatrixModules(): void {
    this.matrixCollapsedModules.set(new Set());
  }

  collapseAllMatrixModules(): void {
    this.matrixCollapsedModules.set(new Set(this.matrixModules()));
  }

  isPermissionUniform(permissionId: string, roles: RoleView[]): boolean {
    if (!roles.length) return true;
    const first = roles[0].permissions.includes(permissionId);
    return roles.every((r) => r.permissions.includes(permissionId) === first);
  }

  roleHasPermission(role: RoleView, permissionId: string): boolean {
    return role.permissions.includes(permissionId);
  }

  moduleGrantForRole(role: RoleView, module: string): { granted: number; total: number } {
    const all = this.permissionsForModule(module);
    const granted = all.filter((p) => role.permissions.includes(p.id)).length;
    return { granted, total: all.length };
  }

  roleGrantTotal(role: RoleView): { granted: number; total: number } {
    return {
      granted: role.permissions.length,
      total: this.permissions.length,
    };
  }

  roleShortLabel(name: string): string {
    return name
      .replace('Organisation', 'Org')
      .replace('Institution', 'Inst')
      .replace('Librarian', 'Lib')
      .replace('Admin', 'Adm')
      .replace('Manager', 'Mgr')
      .replace('Members', 'Mbr')
      .replace('Teachers', 'Tchr')
      .replace('Librarians', 'Libs');
  }

  roleInitials(name: string): string {
    return MATRIX_ROLE_ABBREV[name] ?? name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  }

  matrixRoleAbbrev(name: string): string {
    return MATRIX_ROLE_ABBREV[name] ?? this.roleInitials(name);
  }

  addMatrixRole(roleName: string): void {
    if (!roleName || this.matrixSelectedRoleNames().includes(roleName)) return;
    this.matrixSelectedRoleNames.update((names) => [...names, roleName]);
    this.matrixAddRolePick.set('');
  }

  removeMatrixRole(roleName: string): void {
    if (this.matrixSelectedRoleNames().length <= 1) {
      this.toast.error('Keep at least one role in the matrix');
      return;
    }
    this.matrixSelectedRoleNames.update((names) => names.filter((n) => n !== roleName));
    if (this.matrixHighlightRoleId()) {
      const role = this.roles().find((r) => r.name === roleName);
      if (role && this.matrixHighlightRoleId() === role.id) {
        this.matrixHighlightRoleId.set(null);
      }
    }
  }

  startReplaceMatrixRole(index: number): void {
    this.matrixReplaceIndex.set(index);
    this.matrixReplacePick.set('');
  }

  cancelReplaceMatrixRole(): void {
    this.matrixReplaceIndex.set(null);
    this.matrixReplacePick.set('');
  }

  applyReplaceMatrixRole(): void {
    const index = this.matrixReplaceIndex();
    const newName = this.matrixReplacePick();
    if (index === null || !newName) return;
    this.matrixSelectedRoleNames.update((names) => {
      const next = [...names];
      next[index] = newName;
      return next;
    });
    this.cancelReplaceMatrixRole();
  }

  resetMatrixRoles(): void {
    this.syncMatrixRoleSelection(true);
    this.matrixHighlightRoleId.set(null);
  }

  private syncMatrixRoleSelection(forceDefault = false): void {
    const available = new Set(this.roles().map((r) => r.name));
    if (forceDefault) {
      const defaults = DEFAULT_MATRIX_ROLE_NAMES.filter((n) => available.has(n));
      this.matrixSelectedRoleNames.set(
        defaults.length ? [...defaults] : this.roles().slice(0, 4).map((r) => r.name),
      );
      return;
    }

    const current = this.matrixSelectedRoleNames().filter((n) => available.has(n));
    if (current.length) {
      this.matrixSelectedRoleNames.set(current);
      return;
    }

    const defaults = DEFAULT_MATRIX_ROLE_NAMES.filter((n) => available.has(n));
    this.matrixSelectedRoleNames.set(
      defaults.length ? [...defaults] : this.roles().slice(0, 4).map((r) => r.name),
    );
  }

  matrixGrantTone(granted: number, total: number): string {
    if (granted === 0) return 'text-muted-foreground/50';
    if (granted === total) return 'text-success';
    return 'text-amber-600 dark:text-amber-400';
  }

  toggleMatrixRoleHighlight(roleId: string): void {
    this.matrixHighlightRoleId.update((current) => (current === roleId ? null : roleId));
  }

  permissionsForModule(module: string): PermissionCatalogItem[] {
    return this.permissions.filter((p) => p.module === module);
  }

  grantedPermissionsForModule(module: string, permissionIds: string[]): PermissionCatalogItem[] {
    const set = new Set(permissionIds);
    return this.permissions.filter((p) => p.module === module && set.has(p.id));
  }

  editorPermissionsForModule(module: string): PermissionCatalogItem[] {
    return this.editorFilteredPermissions().filter((p) => p.module === module);
  }

  openCreate(): void {
    const role: RoleView = {
      id: `r_${Date.now()}`,
      name: '',
      key: '',
      description: '',
      scope: 'Branch',
      system: false,
      members: 0,
      permissions: [],
      permissionKeys: [],
      updatedAt: new Date().toISOString(),
    };
    this.editorRole.set(role);
    this.editorOriginal.set(null);
    this.editorSearch.set('');
    this.editorOpen.set(true);
  }

  openEdit(role: RoleView): void {
    this.editorRole.set(structuredClone(role));
    this.editorOriginal.set(structuredClone(role));
    this.editorSearch.set('');
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editorRole.set(null);
    this.editorOriginal.set(null);
  }

  closeDetail(): void {
    this.selectedId.set(null);
    this.drawerTab.set('perms');
  }

  selectRole(id: string): void {
    this.selectedId.set(id);
    this.drawerTab.set('perms');
  }

  membersForRole(role: RoleView) {
    return this.users().filter((u) => u.roles.includes(role.name));
  }

  cloneRole(role: RoleView): void {
    const copy: RoleView = {
      ...structuredClone(role),
      id: `r_${Date.now()}`,
      name: `${role.name} (copy)`,
      key: `${role.key}_copy`,
      system: false,
      members: 0,
      updatedAt: new Date().toISOString(),
    };
    this.roles.update((prev) => [copy, ...prev]);
    this.logAudit({
      roleId: copy.id,
      roleName: copy.name,
      actor: 'You',
      action: 'Role cloned',
      detail: `From ${role.name}`,
    });
    this.toast.success(`Cloned "${role.name}"`);
  }

  deleteRole(role: RoleView): void {
    if (role.system) {
      this.toast.error('System roles cannot be deleted');
      return;
    }
    if (role.members > 0) {
      this.toast.error('Reassign members before deleting');
      return;
    }
    this.roles.update((prev) => prev.filter((x) => x.id !== role.id));
    this.logAudit({
      roleId: role.id,
      roleName: role.name,
      actor: 'You',
      action: 'Role deleted',
      detail: role.description,
    });
    this.toast.success(`Deleted "${role.name}"`);
    if (this.selectedId() === role.id) this.closeDetail();
  }

  saveRole(): void {
    const next = this.editorRole();
    const prev = this.editorOriginal();
    if (!next) return;
    if (!next.name.trim()) {
      this.toast.error('Role name is required');
      return;
    }

    this.saving.set(true);
    const permissionKeys = claimKeysToPermissionKeys(next.permissions);
    const isNew = !prev;
    const updated: RoleView = {
      ...next,
      name: next.name.trim(),
      key: next.name.trim(),
      permissionKeys,
      updatedAt: new Date().toISOString(),
    };

    const finish = (role: RoleView) => {
      this.roles.update((rs) =>
        isNew ? [role, ...rs] : rs.map((r) => (r.id === role.id ? role : r)),
      );

      if (isNew) {
        this.logAudit({
          roleId: role.id,
          roleName: role.name,
          actor: 'You',
          action: 'Role created',
          detail: `${role.permissions.length} permissions, ${role.scope}`,
        });
      } else if (prev) {
        this.logPermissionDiff(prev, role);
      }

      this.toast.success(isNew ? `Created "${role.name}"` : `Saved "${role.name}"`);
      this.saving.set(false);
      this.closeEditor();
    };

    const hasApiId = !updated.id.startsWith('def_') && !updated.id.startsWith('r_');

    if (!isNew && hasApiId && prev && prev.name.trim() !== updated.name.trim()) {
      this.admin.updateRole(updated.id, updated.name.trim()).subscribe({
        next: (apiRole) => {
          const role = { ...updated, id: apiRole.id, name: apiRole.name ?? updated.name };
          this.saveRolePermissions(role, prev, isNew, permissionKeys, finish);
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Failed to update role name');
        },
      });
      return;
    }

    if (hasApiId && permissionKeys.length) {
      this.saveRolePermissions(updated, prev, isNew, permissionKeys, finish);
      return;
    }

    if (isNew) {
      this.admin.createRole(updated.name).subscribe({
        next: (apiRole) => {
          const role = { ...updated, id: apiRole.id };
          if (permissionKeys.length) {
            this.admin.assignRolePermissions(apiRole.id, permissionKeys).subscribe({
              next: () => finish(role),
              error: () => finish(role),
            });
          } else {
            finish(role);
          }
        },
        error: () => {
          finish(updated);
        },
      });
      return;
    }

    finish(updated);
  }

  private saveRolePermissions(
    updated: RoleView,
    prev: RoleView | null,
    isNew: boolean,
    permissionKeys: PermissionKey[],
    finish: (role: RoleView) => void,
  ): void {
    if (!permissionKeys.length) {
      finish(updated);
      return;
    }

    this.admin.assignRolePermissions(updated.id, permissionKeys).subscribe({
      next: () => finish(updated),
      error: () => {
        this.saving.set(false);
        this.toast.error('Failed to save role permissions');
      },
    });
  }

  togglePermission(id: string, on: boolean): void {
    const role = this.editorRole();
    if (!role) return;
    const set = new Set(role.permissions);
    if (on) set.add(id);
    else set.delete(id);
    this.editorRole.set({
      ...role,
      permissions: Array.from(set),
      permissionKeys: claimKeysToPermissionKeys(Array.from(set)),
    });
  }

  toggleModule(module: string, on: boolean): void {
    const role = this.editorRole();
    if (!role) return;
    const ids = this.permissions.filter((p) => p.module === module).map((p) => p.id);
    const set = new Set(role.permissions);
    ids.forEach((id) => (on ? set.add(id) : set.delete(id)));
    this.editorRole.set({
      ...role,
      permissions: Array.from(set),
      permissionKeys: claimKeysToPermissionKeys(Array.from(set)),
    });
  }

  resetEditor(): void {
    const original = this.editorOriginal();
    if (original) this.editorRole.set(structuredClone(original));
  }

  updateEditorField<K extends keyof RoleView>(field: K, value: RoleView[K]): void {
    const role = this.editorRole();
    if (!role) return;
    this.editorRole.set({ ...role, [field]: value });
  }

  moduleGrantedCount(module: string, permissionIds: string[]): number {
    const set = new Set(permissionIds);
    return this.permissions.filter((p) => p.module === module && set.has(p.id)).length;
  }

  moduleTotalCount(module: string): number {
    return this.permissions.filter((p) => p.module === module).length;
  }

  editorModuleAllOn(module: string): boolean {
    const role = this.editorRole();
    if (!role) return false;
    const all = this.permissions.filter((p) => p.module === module);
    return all.length > 0 && all.every((p) => role.permissions.includes(p.id));
  }

  permissionDiff(
    original: RoleView | null,
    id: string,
    on: boolean,
  ): 'added' | 'removed' | null {
    if (!original) return null;
    const wasOn = original.permissions.includes(id);
    if (on === wasOn) return null;
    return on ? 'added' : 'removed';
  }

  private logPermissionDiff(prev: RoleView, next: RoleView): void {
    const before = new Set(prev.permissions);
    const after = new Set(next.permissions);
    const added = [...after].filter((p) => !before.has(p));
    const removed = [...before].filter((p) => !after.has(p));

    if (prev.name !== next.name) {
      this.logAudit({
        roleId: next.id,
        roleName: next.name,
        actor: 'You',
        action: 'Role renamed',
        detail: `${prev.name} → ${next.name}`,
      });
    }
    if (prev.scope !== next.scope) {
      this.logAudit({
        roleId: next.id,
        roleName: next.name,
        actor: 'You',
        action: 'Scope changed',
        detail: `${prev.scope} → ${next.scope}`,
      });
    }
    if (prev.description !== next.description) {
      this.logAudit({
        roleId: next.id,
        roleName: next.name,
        actor: 'You',
        action: 'Description updated',
        detail: next.description.slice(0, 80),
      });
    }
    added.forEach((p) =>
      this.logAudit({
        roleId: next.id,
        roleName: next.name,
        actor: 'You',
        action: 'Permission added',
        detail: `+${p}`,
      }),
    );
    removed.forEach((p) =>
      this.logAudit({
        roleId: next.id,
        roleName: next.name,
        actor: 'You',
        action: 'Permission removed',
        detail: `-${p}`,
      }),
    );
  }

  private logAudit(entry: Omit<AuditEntry, 'id' | 'ts'>): void {
    this.audit.update((prev) => [
      {
        ...entry,
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ts: new Date().toISOString(),
      },
      ...prev,
    ]);
  }
}
