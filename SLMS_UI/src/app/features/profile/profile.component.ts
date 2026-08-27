import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideBuilding2, LucideChevronDown, LucideChevronUp, LucideKeyRound, LucideLibrary,
  LucideLoader2, LucideMapPin, LucidePencil, LucideRefreshCw, LucideSave, LucideShield, LucideUser,
} from '@lucide/angular';
import { OnboardingSteps, UserTypes } from '@core/enums/OnbardingSteps';
import { CurrentUser } from '@core/models/AuthResponse.model';
import { UserProfile } from '@core/models/profile.models';
import { StorageService } from '@core/services/storage.service';
import { ToastService } from '@core/services/toast.service';
import { formatAppDateTime } from '@core/utils/date-format.util';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { ProfileService } from './profile.service';
import { accessSummaryText, formatRoleName, moduleLabel, permissionActionLabel } from './profile.util';

type ProfileTab = 'account' | 'security' | 'access' | 'permissions';

interface PermissionGroup {
  module: string;
  label: string;
  items: { code: string; name: string; action: string }[];
}

@Component({
  selector: 'app-profile',
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    PageHeaderComponent,
    SectionHeaderComponent,
    GlassCardComponent,
    StatusBadgeComponent,
    LucideUser,
    LucideLoader2,
    LucideRefreshCw,
    LucideShield,
    LucideKeyRound,
    LucideSave,
    LucideBuilding2,
    LucideMapPin,
    LucideLibrary,
    LucidePencil,
    LucideChevronDown,
    LucideChevronUp,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly savingProfile = signal(false);
  readonly changingPassword = signal(false);
  readonly profile = signal<UserProfile | null>(null);
  readonly activeTab = signal<ProfileTab>('account');
  readonly editingAccount = signal(false);
  readonly showTechnicalPermissions = signal(false);
  readonly expandedModules = signal<Set<string>>(new Set());

  readonly editFullName = signal('');
  readonly editUserName = signal('');
  readonly editEmail = signal('');
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  readonly tabs: { id: ProfileTab; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'security', label: 'Security' },
    { id: 'access', label: 'Workspace' },
    { id: 'permissions', label: 'Permissions' },
  ];

  readonly initials = computed(() => {
    const p = this.profile();
    const name = p?.fullName || p?.userName || p?.email || '?';
    return name.split(/\s+/).map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  });

  readonly primaryRole = computed(() => {
    const roles = this.profile()?.roles ?? [];
    return roles[0] ? formatRoleName(roles[0]) : 'User';
  });

  readonly allRoles = computed(() => (this.profile()?.roles ?? []).map(formatRoleName));

  readonly permissionGroups = computed<PermissionGroup[]>(() => {
    const details = this.profile()?.permissionDetails ?? [];
    const grouped = new Map<string, { code: string; name: string; action: string }[]>();
    for (const item of details) {
      const mod = item.code.split('.')[0] || 'other';
      const list = grouped.get(mod) ?? [];
      list.push({
        code: item.code,
        name: item.name,
        action: permissionActionLabel(item.code),
      });
      grouped.set(mod, list);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, items]) => ({
        module,
        label: moduleLabel(module),
        items,
      }));
  });

  readonly accessSummaryLine = computed(() => {
    const p = this.profile();
    if (!p) return '';
    if (p.accessSummary.isPlatformWide) {
      return 'Full platform access across all institutions.';
    }
    return accessSummaryText(
      p.accessSummary.institutionCount,
      p.accessSummary.branchCount,
      p.accessSummary.libraryCount,
    );
  });

  readonly formatAppDateTime = formatAppDateTime;
  readonly formatRoleName = formatRoleName;

  ngOnInit(): void {
    this.refreshProfile();
  }

  protected setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  protected isTab(tab: ProfileTab): boolean {
    return this.activeTab() === tab;
  }

  protected refreshProfile(): void {
    this.loading.set(true);
    this.profileService.getProfile().subscribe({
      next: (res) => {
        const data = res.data ?? null;
        this.profile.set(data);
        if (data) {
          this.resetEditForm(data);
          this.syncStorage(data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load profile');
      },
    });
  }

  protected startEditingAccount(): void {
    const p = this.profile();
    if (p) this.resetEditForm(p);
    this.editingAccount.set(true);
  }

  protected cancelEditingAccount(): void {
    const p = this.profile();
    if (p) this.resetEditForm(p);
    this.editingAccount.set(false);
  }

  protected saveProfile(): void {
    if (!this.editFullName().trim() || !this.editUserName().trim() || !this.editEmail().trim()) {
      this.toast.error('Full name, username, and email are required');
      return;
    }

    this.savingProfile.set(true);
    this.profileService.updateProfile({
      fullName: this.editFullName().trim(),
      userName: this.editUserName().trim(),
      email: this.editEmail().trim(),
    }).subscribe({
      next: (res) => {
        this.savingProfile.set(false);
        if (res.data) {
          this.profile.set(res.data);
          this.resetEditForm(res.data);
          this.syncStorage(res.data);
        }
        this.editingAccount.set(false);
        this.toast.success('Profile updated');
      },
      error: (err) => {
        this.savingProfile.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to update profile');
      },
    });
  }

  protected changePassword(): void {
    if (!this.currentPassword() || !this.newPassword() || !this.confirmPassword()) {
      this.toast.error('Fill in all password fields');
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.toast.error('New passwords do not match');
      return;
    }

    this.changingPassword.set(true);
    this.profileService.changePassword({
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
      confirmPassword: this.confirmPassword(),
    }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.toast.success('Password updated');
      },
      error: (err) => {
        this.changingPassword.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to change password');
      },
    });
  }

  protected toggleModule(module: string): void {
    this.expandedModules.update(set => {
      const next = new Set(set);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  protected isModuleExpanded(module: string): boolean {
    return this.expandedModules().has(module);
  }

  protected toggleTechnicalPermissions(): void {
    this.showTechnicalPermissions.update(v => !v);
  }

  protected accountTypeLabel(profile: UserProfile): string {
    if (profile.roles.length) {
      return formatRoleName(profile.roles[0]);
    }
    return this.userTypeLabel(profile.userType as UserTypes);
  }

  protected userTypeLabel(type?: UserTypes): string {
    switch (type) {
      case UserTypes.OrganizationOwner: return 'Organization owner';
      case UserTypes.Teacher: return 'Teacher';
      case UserTypes.Student: return 'Student';
      case UserTypes.Member: return 'Member';
      default: return 'User';
    }
  }

  protected onboardingLabel(step?: number): string {
    switch (step) {
      case OnboardingSteps.Registered: return 'Registered';
      case OnboardingSteps.Institute: return 'Institution setup';
      case OnboardingSteps.Branch: return 'Branch setup';
      case OnboardingSteps.Library: return 'Library setup';
      case OnboardingSteps.Completed: return 'Completed';
      default: return '—';
    }
  }

  private resetEditForm(profile: UserProfile): void {
    this.editFullName.set(profile.fullName ?? profile.userName ?? '');
    this.editUserName.set(profile.userName ?? '');
    this.editEmail.set(profile.email ?? '');
  }

  private syncStorage(profile: UserProfile): void {
    const current: CurrentUser = {
      id: profile.id,
      email: profile.email ?? '',
      userName: profile.userName ?? '',
      fullName: profile.fullName ?? '',
      isActive: profile.isActive,
      twoFactorEnabled: profile.twoFactorEnabled,
      onboardingStep: profile.onboardingStep as OnboardingSteps,
      usertype: profile.userType as UserTypes,
      createdAtUtc: profile.createdAtUtc,
      updatedAtUtc: profile.updatedAtUtc,
      roles: profile.roles,
      permissions: profile.permissions,
    };
    this.storage.setUser(current);
  }
}
