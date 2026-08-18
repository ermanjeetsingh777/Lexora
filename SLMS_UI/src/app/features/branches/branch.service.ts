import { inject, Injectable } from '@angular/core';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { BranchListQuery, BranchListView } from '@core/models/branch-list.models';
import { CreateBranchRequest } from '@core/models/CreateBranchRequest';
import { ApiService } from '@core/services/api.service';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly httpApi = inject(ApiService);

  getListView(query?: BranchListQuery): Observable<BranchListView> {
    const params: Record<string, string> = {};
    if (query?.search) params['search'] = query.search;
    if (query?.status) params['status'] = query.status;
    if (query?.institutionId) params['institutionId'] = query.institutionId;
    return this.httpApi.get<BranchListView>('branches/list', { params }).pipe(map((r) => r.data!));
  }

  createBranches(payload: CreateBranchRequest): Observable<APIResponseModel<CreateBranchRequest>> {
    return this.httpApi.post<CreateBranchRequest>(
      'institutions/' + payload.institutionId + '/branches',
      payload,
    );
  }
}
