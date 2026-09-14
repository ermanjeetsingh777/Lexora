import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AppDatePipe } from '@core/pipes/app-date.pipes';
import { FormsModule } from '@angular/forms';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideDownload,
  LucideEye,
  LucideFileSpreadsheet,
  LucideSearch,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import {
  Subject,
  catchError,
  debounceTime,
  expand,
  map,
  merge,
  of,
  reduce,
  switchMap,
  takeWhile,
  tap,
} from 'rxjs';
import { AttendanceModuleQuery, AttendanceRecordListItem } from '@core/models/attendanceModels';
import { MemberListQuery, MemberListResponse, PagedMemberList } from '@core/models/MemberRequest';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { AttendanceExportService } from '@features/attendance/attendance-export.service';
import {
  AttendanceExportMeta,
  buildExportFilename,
  downloadAttendanceExcel,
  downloadAttendancePdf,
  mapModuleRecordToExportRow,
} from '@features/attendance/attendance-report-export.util';
import { MemberService } from '../../MemberService';
import { MemberAvatarComponent } from '../member-avatar/member-avatar.component';
import { CommonService } from '@core/services/common.service';
import { computeMemberLifecycle, MemberLifecycle } from '../../member-lifecycle.util';
import { memberCreateLink, memberDetailLink as buildMemberDetailLink, memberAttendanceReportQuery } from '@core/utils/entity-routes.util';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export type MemberScope = 'institution' | 'branch' | 'library';

interface ScopedMemberRow extends MemberListResponse {
  life: MemberLifecycle;
}

const PAGE_SIZE_OPTS = [12, 24, 48] as const;
const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'] as const;
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5] as const;

@Component({
  selector: 'app-scoped-members-panel',
  imports: [
    RouterLink,
    FormsModule,
    AppDatePipe,
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
    LucideDownload,
    LucideFileSpreadsheet,
  ],
  providers: [MemberService],
  templateUrl: './scoped-members-panel.component.html',
  styleUrl: './scoped-members-panel.component.css',
})
export class ScopedMembersPanelComponent {
  private readonly memberService = inject(MemberService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly exportService = inject(AttendanceExportService);
  private readonly destroyRef = inject(DestroyRef);
  readonly commonService = inject(CommonService);

  readonly scope = input.required<MemberScope>();
  readonly institutionId = input.required<string>();
  readonly branchId = input<string>('');
  readonly libraryId = input<string>('');
  readonly locationName = input<string>('');
  readonly title = input<string>('Members');
  readonly description = input<string>('Members enrolled in this location');

  private readonly searchTrigger$ = new Subject<void>();
  private readonly reloadTrigger$ = new Subject<void>();

  readonly initialLoading = signal(false);
  readonly pageLoading = signal(false);
  readonly loading = computed(() => this.initialLoading() || this.pageLoading());
  readonly attendanceExporting = signal(false);
  readonly showAttendanceDownloadPanel = signal(false);
  readonly attendanceDateFrom = signal(monthStartIsoDate());
  readonly attendanceDateTo = signal(todayIsoDate());
  readonly attendanceReportQuery = memberAttendanceReportQuery();
  readonly error = signal<string | null>(null);
  readonly membersList = signal<MemberListResponse[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(1);
  readonly query = signal('');
  readonly status = signal<'all' | (typeof STATUS_OPTS)[number]>('all');
  readonly branchFilter = signal<'all' | string>('all');
  readonly libraryFilter = signal<'all' | string>('all');
  readonly page = signal(1);
  readonly pageSize = signal(12);

  readonly STATUS_OPTS = STATUS_OPTS;
  readonly PAGE_SIZE_OPTS = PAGE_SIZE_OPTS;
  readonly SKELETON_ROWS = SKELETON_ROWS;
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

  readonly matchedCount = computed(() => this.totalCount());
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageStart = computed(() => (this.currentPage() - 1) * this.pageSize());
  readonly paged = computed(() => this.members());

  readonly branchOptions = computed(() => {
    const fromPage = this.members()
      .map((m) => m.branch)
      .filter(Boolean);
    const selected = this.branchFilter();
    const set = new Set(fromPage);
    if (selected !== 'all') set.add(selected);
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  readonly libraryOptions = computed(() => {
    const branch = this.branchFilter();
    const fromPage = this.members()
      .filter((m) => branch === 'all' || m.branch === branch)
      .map((m) => m.library)
      .filter(Boolean);
    const selected = this.libraryFilter();
    const set = new Set(fromPage);
    if (selected !== 'all') set.add(selected);
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  readonly showBranchColumn = computed(() => this.scope() === 'institution');
  readonly showLibraryColumn = computed(() => this.scope() !== 'library');
  readonly showBranchFilter = computed(() => this.scope() === 'institution');
  readonly showLibraryFilter = computed(() => this.scope() !== 'library');
  readonly showAttendanceExport = computed(() => this.scope() === 'library' && !!this.libraryId());

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
    merge(this.searchTrigger$.pipe(debounceTime(350)), this.reloadTrigger$)
      .pipe(
        tap(() => this.beginLoading()),
        switchMap(() => {
          if (!this.canLoad()) {
            this.membersList.set([]);
            this.totalCount.set(0);
            this.totalPages.set(1);
            this.endLoading();
            return of(null);
          }

          return this.requestMembers(this.buildMemberListQuery()).pipe(
            catchError((err) => {
              this.membersList.set([]);
              this.totalCount.set(0);
              this.totalPages.set(1);
              this.error.set(err?.error?.message ?? 'Failed to load members.');
              this.endLoading();
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (!response) return;
        const page = response.data;
        const pages = Math.max(1, page?.totalPages ?? 1);
        this.membersList.set(page?.items ?? []);
        this.totalCount.set(page?.totalCount ?? 0);
        this.totalPages.set(pages);
        if (this.page() > pages) {
          this.page.set(pages);
          this.reloadTrigger$.next();
          return;
        }
        this.endLoading();
      });

    effect(() => {
      const scope = this.scope();
      const institutionId = this.institutionId();
      const branchId = this.branchId();
      const libraryId = this.libraryId();

      if (!institutionId) return;
      if (scope === 'branch' && !branchId) return;
      if (scope === 'library' && (!branchId || !libraryId)) return;

      untracked(() => {
        this.resetFilters();
        this.reloadTrigger$.next();
      });
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.page.set(1);
    this.searchTrigger$.next();
  }

  onStatusChange(value: 'all' | (typeof STATUS_OPTS)[number]): void {
    this.status.set(value);
    this.page.set(1);
    this.reloadTrigger$.next();
  }

  onBranchFilterChange(value: 'all' | string): void {
    this.branchFilter.set(value);
    if (value !== 'all') {
      this.libraryFilter.set('all');
    }
    this.page.set(1);
    this.reloadTrigger$.next();
  }

  onLibraryFilterChange(value: 'all' | string): void {
    this.libraryFilter.set(value);
    this.page.set(1);
    this.reloadTrigger$.next();
  }

  clearFilters(): void {
    this.resetFilters();
    this.reloadTrigger$.next();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.reloadTrigger$.next();
  }

  goToPage(page: number): void {
    const next = Math.max(1, Math.min(page, this.totalPages()));
    if (next === this.page()) return;
    this.page.set(next);
    this.reloadTrigger$.next();
  }

  onAttendanceDateFromChange(value: string): void {
    this.attendanceDateFrom.set(value);
  }

  onAttendanceDateToChange(value: string): void {
    this.attendanceDateTo.set(value);
  }

  toggleAttendanceDownloadPanel(): void {
    this.showAttendanceDownloadPanel.update((open) => !open);
  }

  exportLibraryAttendance(format: 'excel' | 'pdf'): void {
    const libraryId = this.libraryId();
    if (!libraryId || this.attendanceExporting()) return;

    this.attendanceExporting.set(true);
    const query: AttendanceModuleQuery = {
      libraryId,
      dateFrom: this.attendanceDateFrom(),
      dateTo: this.attendanceDateTo(),
    };

    const finishExport = (records: AttendanceRecordListItem[], memberCount: number) => {
      if (records.length === 0) {
        this.toast.error('No attendance records found for the selected date range.');
        this.attendanceExporting.set(false);
        return;
      }

      const rows = records.map(mapModuleRecordToExportRow);
      const libraryLabel = this.locationName() || 'library';
      const filterNote = this.hasActiveFilters() ? ' · filtered members' : '';
      const meta: AttendanceExportMeta = {
        title: `${libraryLabel} — Attendance Report`,
        subtitle: `${query.dateFrom} to ${query.dateTo} · ${records.length} records · ${memberCount} members enrolled${filterNote}`,
        filenameBase: buildExportFilename(
          `library-attendance-${libraryLabel}`,
          query.dateFrom ?? 'start',
          query.dateTo ?? 'end',
        ),
      };

      if (format === 'excel') {
        downloadAttendanceExcel(rows, meta, 'module');
      } else {
        downloadAttendancePdf(rows, meta, 'module');
      }

      this.toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} attendance report downloaded.`);
      this.attendanceExporting.set(false);
    };

    const loadAttendance = (memberIds?: Set<string>) => {
      this.exportService.fetchAllModuleRecords(query).subscribe({
        next: (records) => {
          const filtered = memberIds
            ? records.filter((r) => memberIds.has(r.memberId))
            : records;
          const memberCount = memberIds?.size ?? this.totalCount();
          finishExport(filtered, memberCount);
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Could not export attendance report.');
          this.attendanceExporting.set(false);
        },
      });
    };

    if (this.hasActiveFilters()) {
      this.fetchAllScopedMemberIds().subscribe({
        next: (ids) => loadAttendance(new Set(ids)),
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Could not load filtered members for export.');
          this.attendanceExporting.set(false);
        },
      });
      return;
    }

    loadAttendance();
  }

  private canLoad(): boolean {
    const scope = this.scope();
    const institutionId = this.institutionId();
    if (!institutionId) return false;
    if (scope === 'branch' && !this.branchId()) return false;
    if (scope === 'library' && (!this.branchId() || !this.libraryId())) return false;
    return true;
  }

  private beginLoading(): void {
    this.error.set(null);
    if (this.membersList().length === 0) {
      this.initialLoading.set(true);
      this.pageLoading.set(false);
    } else {
      this.pageLoading.set(true);
      this.initialLoading.set(false);
    }
  }

  private endLoading(): void {
    this.initialLoading.set(false);
    this.pageLoading.set(false);
  }

  private resetFilters(): void {
    this.query.set('');
    this.status.set('all');
    this.branchFilter.set('all');
    this.libraryFilter.set('all');
    this.page.set(1);
  }

  private buildMemberListQuery(): MemberListQuery {
    return {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.query().trim() || undefined,
      statuses: this.status() === 'all' ? undefined : this.status(),
      branches: this.branchFilter() === 'all' ? undefined : this.branchFilter(),
      libraries: this.libraryFilter() === 'all' ? undefined : this.libraryFilter(),
    };
  }

  private requestMembers(query: MemberListQuery) {
    const scope = this.scope();
    const institutionId = this.institutionId();
    const branchId = this.branchId();
    const libraryId = this.libraryId();

    if (scope === 'library') {
      return this.memberService.getLibraryMember(institutionId, branchId, libraryId, query);
    }
    if (scope === 'branch') {
      return this.memberService.getBranchMembers(institutionId, branchId, query);
    }
    return this.memberService.getInstitutionMembers(institutionId, query);
  }

  /** Walk all pages of the scoped endpoint for filtered member ids (export). */
  private fetchAllScopedMemberIds() {
    const pageSize = 200;
    const base = this.buildMemberListQuery();
    const first = this.requestMembers({ ...base, page: 1, pageSize });

    return first.pipe(
      expand((res: APIResponseModel<PagedMemberList>) => {
        const data = res.data;
        if (!data?.hasNextPage) return of();
        return this.requestMembers({ ...base, page: (data.pageNumber ?? 1) + 1, pageSize });
      }),
      takeWhile((res) => !!res, true),
      map((res) => (res.data?.items ?? []).map((m) => m.id)),
      reduce((acc, ids) => acc.concat(ids), [] as string[]),
    );
  }
}
