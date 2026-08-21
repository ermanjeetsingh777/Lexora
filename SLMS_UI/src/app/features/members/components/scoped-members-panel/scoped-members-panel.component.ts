import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideEye,
  LucideSearch,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { MemberListResponse } from '@core/models/MemberRequest';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { MemberService } from '../../MemberService';
import { MemberAvatarComponent } from '../member-avatar/member-avatar.component';
import { CommonService } from '@core/services/common.service';
import { computeMemberLifecycle, MemberLifecycle } from '../../member-lifecycle.util';
import { memberCreateLink, memberDetailLink as buildMemberDetailLink } from '@core/utils/entity-routes.util';

export type MemberScope = 'institution' | 'branch' | 'library';

interface ScopedMemberRow extends MemberListResponse {
  life: MemberLifecycle;
}

const PAGE_SIZE_OPTS = [10, 15, 25, 50] as const;
const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'] as const;

@Component({
  selector: 'app-scoped-members-panel',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    ButtonComponent,
    SectionHeaderComponent,
    StatusBadgeComponent,
    MemberAvatarComponent,
    LucideSearch,
    LucideUsers,
    LucideEye,
    LucideX,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
  ],
  providers: [MemberService],
  templateUrl: './scoped-members-panel.component.html',
  styleUrl: './scoped-members-panel.component.css',
})
export class ScopedMembersPanelComponent {
  private readonly memberService = inject(MemberService);
  private readonly router = inject(Router);
  readonly commonService = inject(CommonService);

  readonly scope = input.required<MemberScope>();
  readonly institutionId = input.required<string>();
  readonly branchId = input<string>('');
  readonly libraryId = input<string>('');
  readonly title = input<string>('Members');
  readonly description = input<string>('Members enrolled in this location');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly membersList = signal<MemberListResponse[]>([]);
  readonly query = signal('');
  readonly status = signal<'all' | (typeof STATUS_OPTS)[number]>('all');
  readonly branchFilter = signal<'all' | string>('all');
  readonly libraryFilter = signal<'all' | string>('all');
  readonly page = signal(1);
  readonly pageSize = signal(15);

  readonly STATUS_OPTS = STATUS_OPTS;
  readonly PAGE_SIZE_OPTS = PAGE_SIZE_OPTS;
  readonly Math = Math;

  readonly members = computed<ScopedMemberRow[]>(() =>
    this.membersList().map((m) => ({
      ...m,
      life: computeMemberLifecycle({
        planEndDate: m.planEndDate,
        joinDate: m.joinDate,
        feesOwed: m.feesOwed,
      }),
    })),
  );

  readonly activeCount = computed(() => this.members().filter((m) => m.status === 'Active').length);

  readonly branchOptions = computed(() =>
    [...new Set(this.members().map((m) => m.branch).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
  );

  readonly libraryOptions = computed(() => {
    const branch = this.branchFilter();
    const libraries = this.members()
      .filter((m) => branch === 'all' || m.branch === branch)
      .map((m) => m.library)
      .filter(Boolean);

    return [...new Set(libraries)].sort((a, b) => a.localeCompare(b));
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.status();
    const branch = this.branchFilter();
    const library = this.libraryFilter();

    return this.members().filter((m) => {
      if (status !== 'all' && m.status !== status) return false;
      if (branch !== 'all' && m.branch !== branch) return false;
      if (library !== 'all' && m.library !== library) return false;
      if (!q) return true;

      return (
        (m.name ?? '').toLowerCase().includes(q) ||
        (m.userName ?? '').toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.phone ?? '').includes(q) ||
        (m.membership ?? '').toLowerCase().includes(q) ||
        (m.branch ?? '').toLowerCase().includes(q) ||
        (m.library ?? '').toLowerCase().includes(q) ||
        (m.shift ?? '').toLowerCase().includes(q) ||
        (m.plan ?? '').toLowerCase().includes(q)
      );
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageStart = computed(() => (this.currentPage() - 1) * this.pageSize());
  readonly paged = computed(() => {
    const start = this.pageStart();
    return this.filtered().slice(start, start + this.pageSize());
  });

  readonly showBranchColumn = computed(() => this.scope() === 'institution');
  readonly showLibraryColumn = computed(() => this.scope() !== 'library');
  readonly showBranchFilter = computed(() => this.scope() === 'institution');
  readonly showLibraryFilter = computed(() => this.scope() !== 'library');

  readonly hasActiveFilters = computed(
    () =>
      !!this.query().trim() ||
      this.status() !== 'all' ||
      this.branchFilter() !== 'all' ||
      this.libraryFilter() !== 'all',
  );

  readonly createMemberLink = computed((): string[] =>
    memberCreateLink({
      institutionId: this.institutionId(),
      branchId: this.branchId(),
      libraryId: this.libraryId(),
      onInstitutionRoute: this.router.url.includes('/institutions/'),
    }),
  );

  memberDetailLink(memberId: string): string[] {
    return buildMemberDetailLink(memberId, {
      institutionId: this.institutionId(),
      branchId: this.branchId(),
      libraryId: this.libraryId(),
      onInstitutionRoute: this.router.url.includes('/institutions/'),
    });
  }

  constructor() {
    effect(() => {
      const scope = this.scope();
      const institutionId = this.institutionId();
      const branchId = this.branchId();
      const libraryId = this.libraryId();

      if (!institutionId) return;
      if (scope === 'branch' && !branchId) return;
      if (scope === 'library' && (!branchId || !libraryId)) return;

      this.loadMembers(scope, institutionId, branchId, libraryId);
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.page.set(1);
  }

  onStatusChange(value: 'all' | (typeof STATUS_OPTS)[number]): void {
    this.status.set(value);
    this.page.set(1);
  }

  onBranchFilterChange(value: 'all' | string): void {
    this.branchFilter.set(value);
    if (value !== 'all' && this.libraryFilter() !== 'all') {
      const stillValid = this.members().some(
        (m) => m.branch === value && m.library === this.libraryFilter(),
      );
      if (!stillValid) {
        this.libraryFilter.set('all');
      }
    }
    this.page.set(1);
  }

  onLibraryFilterChange(value: 'all' | string): void {
    this.libraryFilter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.query.set('');
    this.status.set('all');
    this.branchFilter.set('all');
    this.libraryFilter.set('all');
    this.page.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.totalPages())));
  }

  private loadMembers(
    scope: MemberScope,
    institutionId: string,
    branchId: string,
    libraryId: string,
  ): void {
    this.loading.set(true);
    this.error.set(null);

    const request =
      scope === 'library'
        ? this.memberService.getLibraryMember(institutionId, branchId, libraryId)
        : scope === 'branch'
          ? this.memberService.getBranchMembers(institutionId, branchId)
          : this.memberService.getInstitutionMembers(institutionId);

    request.subscribe({
      next: (response) => {
        this.membersList.set(response.data ?? []);
        this.query.set('');
        this.status.set('all');
        this.branchFilter.set('all');
        this.libraryFilter.set('all');
        this.page.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.membersList.set([]);
        this.error.set(err?.error?.message ?? 'Failed to load members.');
        this.loading.set(false);
      },
    });
  }
}
