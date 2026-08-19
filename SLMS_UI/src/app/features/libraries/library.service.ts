import { inject, Injectable } from '@angular/core';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { CreateLibraryRequest } from '@core/models/CreateLibraryRequest ';
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
}
