import { inject, Injectable } from '@angular/core';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { CreateBranchRequest } from '@core/models/CreateBranchRequest';
import { ApiService } from '@core/services/api.service';
import { Observable } from 'rxjs';

@Injectable()
export class BranchService {
    private readonly httpApi = inject(ApiService);

    createBranches(payload: CreateBranchRequest): Observable<APIResponseModel<CreateBranchRequest>> {
        return this.httpApi.post<CreateBranchRequest>('institutions/' + payload.institutionId + '/branches', payload);
    }

}

