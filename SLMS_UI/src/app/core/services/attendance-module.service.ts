import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  AttendanceModuleQuery,
  AttendanceModuleSummary,
  PagedAttendanceRecords,
} from '@core/models/attendanceModels';
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
}
