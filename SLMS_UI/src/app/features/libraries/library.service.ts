import { inject, Injectable } from '@angular/core';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { CreateLibraryRequest } from '@core/models/CreateLibraryRequest ';
import { ApiService } from '@core/services/api.service';
import { Observable } from 'rxjs';

@Injectable()
export class LibraryService {
    private readonly httpApi = inject(ApiService);

    createlibrary(institutionId: string, branchId: string, request: CreateLibraryRequest): Observable<APIResponseModel<any>> {
        return this.httpApi.post<any>('institutions/' + institutionId + '/branches/'+branchId+'/libraries', request);
    }

}

