import { AttendanceAnalytics, AttendanceAnalyticsQuery, AttendanceCalendarMonth, AttendanceCalendarSummary, AttendanceModuleQuery, AttendanceModuleSummary, PagedAttendanceRecords, AttendanceLiveEvent } from '@core/models/attendanceModels';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AttendanceModuleService {
  private readonly api = inject(ApiService);

  getSummary(query?: AttendanceModuleQuery): Observable<AttendanceModuleSummary> {
    return this.api
      .get<AttendanceModuleSummary>('attendance/summary', { params: this.toParams(query) })
      .pipe(map((r) => r.data!));
  }

  getRecords(query?: AttendanceModuleQuery): Observable<PagedAttendanceRecords> {
    return this.api
      .get<PagedAttendanceRecords>('attendance/records', { params: this.toParams(query) })
      .pipe(map((r) => r.data!));
  }

  getAnalytics(query?: AttendanceAnalyticsQuery): Observable<AttendanceAnalytics> {
    return this.api
      .get<AttendanceAnalytics>('attendance/analytics', { params: this.toAnalyticsParams(query) })
      .pipe(map((r) => r.data!));
  }

  getLiveFeed(libraryId?: string, limit = 20): Observable<AttendanceLiveEvent[]> {
    const params: Record<string, string | number> = { limit };
    if (libraryId) params['libraryId'] = libraryId;
    return this.api
      .get<AttendanceLiveEvent[]>('attendance/live', { params })
      .pipe(map((r) => r.data ?? []));
  }

  getCalendarMonth(year: number, month: number, libraryId?: string): Observable<AttendanceCalendarMonth> {
    const params: Record<string, string | number> = { year, month };
    if (libraryId) params['libraryId'] = libraryId;
    return this.api
      .get<AttendanceCalendarMonth>('attendance/calendar/month', { params })
      .pipe(map((r) => r.data!));
  }

  getCalendarSummary(dateFrom: string, dateTo: string, libraryId?: string): Observable<AttendanceCalendarSummary> {
    const params: Record<string, string | number> = { dateFrom, dateTo };
    if (libraryId) params['libraryId'] = libraryId;
    return this.api
      .get<AttendanceCalendarSummary>('attendance/calendar/summary', { params })
      .pipe(map((r) => r.data!));
  }

  private toParams(query?: AttendanceModuleQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (!query) return params;
    if (query.libraryId) params['libraryId'] = query.libraryId;
    if (query.dateFrom) params['dateFrom'] = query.dateFrom;
    if (query.dateTo) params['dateTo'] = query.dateTo;
    if (query.search) params['search'] = query.search;
    if (query.status != null) params['status'] = query.status;
    if (query.page) params['page'] = query.page;
    if (query.pageSize) params['pageSize'] = query.pageSize;
    return params;
  }

  private toAnalyticsParams(query?: AttendanceAnalyticsQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (!query) return params;
    if (query.libraryId) params['libraryId'] = query.libraryId;
    if (query.days) params['days'] = query.days;
    return params;
  }
}
