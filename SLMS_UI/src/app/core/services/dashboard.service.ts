import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DashboardActivity, DashboardActivityQuery, DashboardOverview, DashboardQuery, DashboardRevenue } from '@core/models/dashboard.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getOverview(query?: DashboardQuery): Observable<DashboardOverview> {
    return this.api
      .get<DashboardOverview>('dashboard/overview', { params: this.toParams(query) })
      .pipe(map((r) => r.data!));
  }

  getRevenue(query?: DashboardQuery): Observable<DashboardRevenue> {
    return this.api
      .get<DashboardRevenue>('dashboard/revenue', { params: this.toParams(query) })
      .pipe(map((r) => r.data!));
  }

  getActivity(query?: DashboardActivityQuery): Observable<DashboardActivity> {
    return this.api
      .get<DashboardActivity>('dashboard/activity', { params: this.toActivityParams(query) })
      .pipe(map((r) => r.data!));
  }

  private toActivityParams(query?: DashboardActivityQuery): Record<string, string | number> {
    const params = this.toParams(query);
    if (query?.activityDays) params['activityDays'] = query.activityDays;
    if (query?.limit) params['limit'] = query.limit;
    return params;
  }

  private toParams(query?: DashboardQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (query?.period) params['period'] = query.period;
    if (query?.days) params['days'] = query.days;
    if (query?.institutionId) params['institutionId'] = query.institutionId;
    if (query?.branchId) params['branchId'] = query.branchId;
    if (query?.libraryId) params['libraryId'] = query.libraryId;
    return params;
  }
}
