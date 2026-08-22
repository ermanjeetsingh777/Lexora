import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideChevronLeft, LucideChevronRight, LucideSearch } from '@lucide/angular';
import {
  AttendanceModuleQuery,
  AttendanceRecordListItem,
  AttendanceSource,
  AttendanceStatus,
} from '@core/models/attendanceModels';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { memberDetailLink } from '@core/utils/entity-routes.util';
import { formatAttendanceDisplayTime } from '../attendance-format.util';
import { AttendanceFilterService } from '../attendance-filter.service';

const PAGE_SIZE_OPTS = [10, 20, 50] as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-attendance-records',
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
    LucideChevronLeft,
    LucideChevronRight,
  ],
  templateUrl: './attendance-records.component.html',
  styleUrl: './attendance-records.component.css',
})
export class AttendanceRecordsComponent {
  private readonly moduleService = inject(AttendanceModuleService);
  private readonly filters = inject(AttendanceFilterService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly records = signal<AttendanceRecordListItem[]>([]);
  readonly dateFrom = signal(todayIsoDate());
  readonly dateTo = signal(todayIsoDate());
  readonly search = signal('');
  readonly statusFilter = signal<'all' | AttendanceStatus>('all');
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly totalCount = signal(0);
  readonly totalPages = signal(1);

  readonly showLibraryColumn = computed(() => !this.filters.libraryId());
  readonly formatAttendanceTime = formatAttendanceDisplayTime;
  readonly PAGE_SIZE_OPTS = PAGE_SIZE_OPTS;
  readonly AttendanceStatus = AttendanceStatus;
  readonly Math = Math;

  constructor() {
    effect(() => {
      this.filters.libraryId();
      this.filters.librariesLoaded();
      this.dateFrom();
      this.dateTo();
      this.search();
      this.statusFilter();
      this.page();
      this.pageSize();
      if (this.filters.librariesLoaded()) {
        this.loadRecords();
      }
    });
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

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
    this.page.set(1);
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
    this.page.set(1);
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  onStatusChange(value: 'all' | AttendanceStatus): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  onPageSizeChange(value: number): void {
    this.pageSize.set(value);
    this.page.set(1);
  }

  goToPage(nextPage: number): void {
    this.page.set(Math.max(1, Math.min(nextPage, this.totalPages())));
  }

  private loadRecords(): void {
    this.loading.set(true);
    const status = this.statusFilter();
    const query: AttendanceModuleQuery = {
      libraryId: this.filters.libraryId() || undefined,
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      search: this.search().trim() || undefined,
      status: status === 'all' ? undefined : status,
      page: this.page(),
      pageSize: this.pageSize(),
    };

    this.moduleService.getRecords(query).subscribe({
      next: (result) => {
        this.records.set(result.items ?? []);
        this.totalCount.set(result.totalCount ?? 0);
        this.totalPages.set(Math.max(1, result.totalPages ?? 1));
        this.page.set(result.pageNumber ?? 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.records.set([]);
        this.toast.error(err?.error?.message ?? 'Could not load attendance records');
      },
    });
  }
}
