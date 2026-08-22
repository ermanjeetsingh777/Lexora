import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import { CreatePlanRequest, UpdatePlanRequest } from '@core/models/plan.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly api = inject(ApiService);

  list(institutionId: string, branchId: string, libraryId: string): Observable<PlanResponse[]> {
    return this.api
      .get<PlanResponse[]>(this.basePath(institutionId, branchId, libraryId))
      .pipe(map((r) => r.data ?? []));
  }

  create(
    institutionId: string,
    branchId: string,
    libraryId: string,
    request: CreatePlanRequest,
  ): Observable<PlanResponse> {
    return this.api
      .post<PlanResponse>(this.basePath(institutionId, branchId, libraryId), request)
      .pipe(map((r) => r.data!));
  }

  update(
    institutionId: string,
    branchId: string,
    libraryId: string,
    planId: string,
    request: UpdatePlanRequest,
  ): Observable<PlanResponse> {
    return this.api
      .putTo<PlanResponse>(`${this.basePath(institutionId, branchId, libraryId)}/${planId}`, request)
      .pipe(map((r) => r.data!));
  }

  activate(
    institutionId: string,
    branchId: string,
    libraryId: string,
    planId: string,
  ): Observable<PlanResponse> {
    return this.api
      .patch<PlanResponse>(`${this.basePath(institutionId, branchId, libraryId)}/${planId}/activate`, {})
      .pipe(map((r) => r.data!));
  }

  deactivate(
    institutionId: string,
    branchId: string,
    libraryId: string,
    planId: string,
  ): Observable<PlanResponse> {
    return this.api
      .patch<PlanResponse>(`${this.basePath(institutionId, branchId, libraryId)}/${planId}/deactivate`, {})
      .pipe(map((r) => r.data!));
  }

  private basePath(institutionId: string, branchId: string, libraryId: string): string {
    return `institutions/${institutionId}/branches/${branchId}/libraries/${libraryId}/plans`;
  }
}
