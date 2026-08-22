import { inject, Injectable } from '@angular/core';
import { AttendanceModuleQuery, AttendanceRecordListItem, AttendanceResponse } from '@core/models/attendanceModels';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { ApiService } from '@core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';
import {
  AttendanceExportMeta,
  buildExportFilename,
  downloadAttendanceExcel,
  downloadAttendancePdf,
  mapMemberRecordToExportRow,
  mapModuleRecordToExportRow,
} from './attendance-report-export.util';

@Injectable({ providedIn: 'root' })
export class AttendanceExportService {
  private readonly moduleService = inject(AttendanceModuleService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  exportModuleRecords(
    query: AttendanceModuleQuery,
    format: 'excel' | 'pdf',
  ): void {
    this.fetchAllModuleRecords(query).subscribe({
      next: (records) => {
        if (records.length === 0) {
          this.toast.error('No attendance records found for the selected date range.');
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
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Could not export attendance report.');
      },
    });
  }

  exportMemberRecords(options: {
    memberId: string;
    memberName: string;
    membershipNo: string;
    libraryName: string;
    branchName: string;
    shift: string;
    dateFrom: string;
    dateTo: string;
    format: 'excel' | 'pdf';
  }, onComplete?: () => void): void {
    this.api.get<AttendanceResponse[]>(
      `attendance/members/${options.memberId}/records`,
      { params: { dateFrom: options.dateFrom, dateTo: options.dateTo } },
    ).subscribe({
      next: (response) => {
        const records = response.data ?? [];
        if (records.length === 0) {
          this.toast.error('No attendance records found for the selected date range.');
          return;
        }

        const rows = records.map((record) =>
          mapMemberRecordToExportRow(
            record,
            options.memberName,
            options.membershipNo,
            options.libraryName,
            options.branchName,
            options.shift,
          ),
        );

        const meta: AttendanceExportMeta = {
          title: `${options.memberName} — Attendance Report`,
          subtitle: `${options.membershipNo} · ${options.dateFrom} to ${options.dateTo} · ${records.length} records`,
          filenameBase: buildExportFilename(
            `member-attendance-${options.membershipNo || options.memberId}`,
            options.dateFrom,
            options.dateTo,
          ),
        };

        if (options.format === 'excel') {
          downloadAttendanceExcel(rows, meta, 'member');
        } else {
          downloadAttendancePdf(rows, meta, 'member');
        }

        this.toast.success(`${options.format === 'excel' ? 'Excel' : 'PDF'} report downloaded.`);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Could not export member attendance report.');
      },
      complete: () => onComplete?.(),
    });
  }

  fetchAllModuleRecords(query: AttendanceModuleQuery): Observable<AttendanceRecordListItem[]> {
    const pageSize = 100;
    const baseQuery: AttendanceModuleQuery = {
      ...query,
      page: 1,
      pageSize,
    };

    return this.moduleService.getRecords(baseQuery).pipe(
      expand((result) => {
        const nextPage = (result.pageNumber ?? 1) + 1;
        const totalPages = result.totalPages ?? 1;
        if (nextPage > totalPages) {
          return EMPTY;
        }

        return this.moduleService.getRecords({ ...baseQuery, page: nextPage });
      }),
      map((result) => result.items ?? []),
      reduce((all, items) => all.concat(items), [] as AttendanceRecordListItem[]),
    );
  }

  loadMemberRecords(memberId: string, dateFrom: string, dateTo: string): Observable<AttendanceResponse[]> {
    return this.api
      .get<AttendanceResponse[]>(`attendance/members/${memberId}/records`, { params: { dateFrom, dateTo } })
      .pipe(map((response) => response.data ?? []));
  }
}
