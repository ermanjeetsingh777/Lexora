import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideQrCode,
  LucideSearch,
} from '@lucide/angular';
import {
  AttendanceModuleSummary,
  AttendanceModuleQuery,
  AttendanceRecordListItem,
  AttendanceSource,
  AttendanceStatus,
} from '@core/models/attendanceModels';
import { LibraryListItem } from '@core/models/library-list.models';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { LibraryService } from '../../libraries/library.service';
import { formatAttendanceDisplayTime } from '../attendance-format.util';
import { memberDetailLink } from '@core/utils/entity-routes.util';

const PAGE_SIZE_OPTS = [10, 20, 50] as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    GlassCardComponent,
    ButtonComponent,
    StatusBadgeComponent,
    LucideSearch,
    LucideQrCode,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  templateUrl: './attendance-list.component.html',
  styleUrl: './attendance-list.component.css',
})
export class AttendanceListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly moduleService = inject(AttendanceModuleService);
  private readonly libraryService = inject(LibraryService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly recordsLoading = signal(false);
  readonly summary = signal<AttendanceModuleSummary | null>(null);
  readonly records = signal<AttendanceRecordListItem[]>([]);
  readonly libraries = signal<LibraryListItem[]>([]);
  readonly libraryId = signal('');
  readonly dateFrom = signal(todayIsoDate());
  readonly dateTo = signal(todayIsoDate());
  readonly search = signal('');
  readonly statusFilter = signal<'all' | AttendanceStatus>('all');
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly totalCount = signal(0);
  readonly totalPages = signal(1);

  readonly isSuperAdmin = computed(() => this.auth.hasRole('SuperAdmin'));
  readonly showLibraryColumn = computed(() => !this.libraryId());
  readonly formatAttendanceTime = formatAttendanceDisplayTime;
  readonly PAGE_SIZE_OPTS = PAGE_SIZE_OPTS;
  readonly AttendanceStatus = AttendanceStatus;
  readonly Math = Math;

  ngOnInit(): void {
    const queryLibraryId = this.route.snapshot.queryParamMap.get('libraryId') ?? '';
    if (queryLibraryId) {
      this.libraryId.set(queryLibraryId);
    }

    this.libraryService.getListView({ status: 'active' }).subscribe({
      next: (view) => {
        this.libraries.set(view.items ?? []);
        this.reload();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load libraries');
      },
    });
  }

  libraryLabel(library: LibraryListItem): string {
    return `${library.name} · ${library.branchName}`;
  }

  statusLabel(status: AttendanceStatus): string {
    return AttendanceStatus[status] ?? 'Unknown';
  }

  sourceLabel(source: AttendanceSource): string {
    return AttendanceSource[source] ?? 'Unknown';
  }

  memberLink(record: AttendanceRecordListItem): string[] {
    return memberDetailLink(record.memberId, { libraryId: record.libraryId });
  }

  onLibraryChange(value: string): void {
    this.libraryId.set(value);
    this.page.set(1);
    this.reload();
  }

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
    this.page.set(1);
    this.reload();
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
    this.page.set(1);
    this.reload();
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.reload();
  }

  onStatusChange(value: 'all' | AttendanceStatus): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.reload();
  }

  onPageSizeChange(value: number): void {
    this.pageSize.set(value);
    this.page.set(1);
    this.reloadRecords();
  }

  goToPage(nextPage: number): void {
    this.page.set(Math.max(1, Math.min(nextPage, this.totalPages())));
    this.reloadRecords();
  }

  reload(): void {
    this.loading.set(true);
    const query = this.buildQuery();

    this.moduleService.getSummary(query).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
        this.reloadRecords(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.summary.set(null);
        this.records.set([]);
        this.toast.error(err?.error?.message ?? 'Could not load attendance summary');
      },
    });
  }

  private reloadRecords(showLoader = true): void {
    if (showLoader) {
      this.recordsLoading.set(true);
    }

    this.moduleService.getRecords(this.buildQuery()).subscribe({
      next: (result) => {
        this.records.set(result.items ?? []);
        this.totalCount.set(result.totalCount ?? 0);
        this.totalPages.set(Math.max(1, result.totalPages ?? 1));
        this.page.set(result.pageNumber ?? 1);
        this.recordsLoading.set(false);
      },
      error: (err) => {
        this.recordsLoading.set(false);
        this.records.set([]);
        this.toast.error(err?.error?.message ?? 'Could not load attendance records');
      },
    });
  }

  private buildQuery(): AttendanceModuleQuery {
    const status = this.statusFilter();
    return {
      libraryId: this.libraryId() || undefined,
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      search: this.search().trim() || undefined,
      status: status === 'all' ? undefined : status,
      page: this.page(),
      pageSize: this.pageSize(),
    };
  }
}
