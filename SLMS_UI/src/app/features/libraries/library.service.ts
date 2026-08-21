import { inject, Injectable } from '@angular/core';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { BranchLibraryCapacitySummary } from '@core/models/branch-library-capacity.models';
import { CreateLibraryRequest } from '@core/models/CreateLibraryRequest ';
import { LibraryCalendarQuery, LibraryCalendarView } from '@core/models/library-calendar.models';
import { ScannerQrCode } from '@core/models/attendanceModels';
import { LibraryDetailView, LibraryDetailQuery, UpdateLibraryPayload, UpdateLibraryWeeklyHoursPayload, UpdateLibraryHoursExceptionsPayload, HoursException } from '@core/models/library-detail.models';
import { LibraryListQuery, LibraryListRevenueSummary, LibraryListView } from '@core/models/library-list.models';
import { ApiService } from '@core/services/api.service';
import { map, Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly httpApi = inject(ApiService);

  getListView(query?: LibraryListQuery): Observable<LibraryListView> {
    const params: Record<string, string> = {};
    if (query?.search) params['search'] = query.search;
    if (query?.status) params['status'] = query.status;
    if (query?.institutionId) params['institutionId'] = query.institutionId;
    if (query?.branchId) params['branchId'] = query.branchId;
    return this.httpApi.get<LibraryListView>('libraries/list', { params }).pipe(map((r) => r.data!));
  }

  getListRevenueSummary(query?: LibraryListQuery): Observable<LibraryListRevenueSummary> {
    const params: Record<string, string> = {};
    if (query?.search) params['search'] = query.search;
    if (query?.status) params['status'] = query.status;
    if (query?.institutionId) params['institutionId'] = query.institutionId;
    if (query?.branchId) params['branchId'] = query.branchId;
    return this.httpApi
      .get<LibraryListRevenueSummary>('libraries/list/revenue', { params })
      .pipe(map((r) => r.data!));
  }

  getBranchCapacitySummary(
    institutionId: string,
    branchId: string,
  ): Observable<BranchLibraryCapacitySummary> {
    return this.httpApi
      .get<BranchLibraryCapacitySummary>(
        `institutions/${institutionId}/branches/${branchId}/libraries/capacity-summary`,
      )
      .pipe(map((r) => r.data!));
  }

  createlibrary(
    institutionId: string,
    branchId: string,
    request: CreateLibraryRequest,
  ): Observable<APIResponseModel<any>> {
    return this.httpApi.post<any>(
      'institutions/' + institutionId + '/branches/' + branchId + '/libraries',
      request,
    );
  }

  getDetailView(libraryId: string, query?: LibraryDetailQuery): Observable<LibraryDetailView> {
    const params: Record<string, string> = {};
    if (query?.trendDays) params['trendDays'] = String(query.trendDays);
    return this.httpApi.get<LibraryDetailView>(`libraries/${libraryId}`, { params }).pipe(map((r) => r.data!));
  }

  getCalendarView(libraryId: string, query: LibraryCalendarQuery): Observable<LibraryCalendarView> {
    const params: Record<string, string> = {
      startDate: query.startDate,
      endDate: query.endDate,
    };
    return this.httpApi
      .get<LibraryCalendarView>(`libraries/${libraryId}/calendar`, { params })
      .pipe(map((r) => r.data!));
  }

  getAttendanceQr(libraryId: string): Observable<ScannerQrCode> {
    return this.httpApi
      .get<ScannerQrCode>(`libraries/${libraryId}/attendance-qr`)
      .pipe(map((r) => r.data!));
  }

  updateLibrary(
    institutionId: string,
    branchId: string,
    libraryId: string,
    payload: UpdateLibraryPayload,
  ): Observable<APIResponseModel<unknown>> {
    return this.httpApi.putTo<unknown>(
      `institutions/${institutionId}/branches/${branchId}/libraries/${libraryId}`,
      payload,
    );
  }

  updateWeeklyHours(
    institutionId: string,
    branchId: string,
    libraryId: string,
    payload: UpdateLibraryWeeklyHoursPayload,
  ): Observable<APIResponseModel<UpdateLibraryWeeklyHoursPayload['weeklyHours']>> {
    return this.httpApi.putTo<UpdateLibraryWeeklyHoursPayload['weeklyHours']>(
      `institutions/${institutionId}/branches/${branchId}/libraries/${libraryId}/weekly-hours`,
      payload,
    );
  }

  updateHoursExceptions(
    institutionId: string,
    branchId: string,
    libraryId: string,
    payload: UpdateLibraryHoursExceptionsPayload,
  ): Observable<APIResponseModel<HoursException[]>> {
    return this.httpApi.putTo<HoursException[]>(
      `institutions/${institutionId}/branches/${branchId}/libraries/${libraryId}/hours-exceptions`,
      payload,
    );
  }
}
