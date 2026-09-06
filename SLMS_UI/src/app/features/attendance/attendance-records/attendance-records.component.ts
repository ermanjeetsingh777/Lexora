import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideChevronLeft, LucideChevronRight, LucideDownload, LucideFileSpreadsheet, LucideSearch } from '@lucide/angular';
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
import { memberDetailLink, memberAttendanceReportQuery } from '@core/utils/entity-routes.util';
import { formatAttendanceDisplayTime } from '../attendance-format.util';
import { AttendanceFilterService } from '../attendance-filter.service';
import { AttendanceExportService } from '../attendance-export.service';
import {
  AttendanceExportMeta,
  buildExportFilename,
  downloadAttendanceExcel,
  downloadAttendancePdf,
  mapModuleRecordToExportRow,
} from '../attendance-report-export.util';

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
    LucideDownload,
    LucideFileSpreadsheet,
  ],
  templateUrl: './attendance-records.component.html',
  styleUrl: './attendance-records.component.css',
})
export class AttendanceRecordsComponent {
  private readonly moduleService = inject(AttendanceModuleService);
  private readonly filters = inject(AttendanceFilterService);
  private readonly toast = inject(ToastService);
  private readonly exportService = inject(AttendanceExportService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly exporting = signal(false);
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
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const dateFrom = params.get('dateFrom');
      const dateTo = params.get('dateTo');
      const libraryId = params.get('libraryId');
      if (dateFrom) this.dateFrom.set(dateFrom);
      if (dateTo) this.dateTo.set(dateTo);
      if (libraryId) this.filters.setLibraryId(libraryId);
    });

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

  memberAttendanceQuery() {
    return memberAttendanceReportQuery({
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
    });
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

  exportReport(format: 'excel' | 'pdf'): void {
    if (this.exporting()) return;

    this.exporting.set(true);
    const status = this.statusFilter();
    const query: AttendanceModuleQuery = {
      libraryId: this.filters.libraryId() || undefined,
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      search: this.search().trim() || undefined,
      status: status === 'all' ? undefined : status,
    };

    this.exportService.fetchAllModuleRecords(query).subscribe({
      next: (records) => {
        if (records.length === 0) {
          this.toast.error('No attendance records found for the selected date range.');
          this.exporting.set(false);
          return;
        }

        const rows = records.map(mapModuleRecordToExportRow);
        const meta: AttendanceExportMeta = {
          title: 'Attendance Report',
          subtitle: `Period: ${query.dateFrom ?? ''} to ${query.dateTo ?? ''} · ${records.length} records`,
          filenameBase: buildExportFilename('attendance-report', query.dateFrom ?? 'start', query.dateTo ?? 'end'),
        };

        if (format === 'excel') {
          downloadAttendanceExcel(rows, meta, 'module');
        } else {
          downloadAttendancePdf(rows, meta, 'module');
        }

        this.toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} report downloaded.`);
        this.exporting.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Could not export attendance report.');
        this.exporting.set(false);
      },
    });
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
