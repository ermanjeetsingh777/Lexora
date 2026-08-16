import { inject, Injectable } from '@angular/core';
import * as mock from '@core/constants/lovable-mock.data';
import { Branch, Institution, Library } from '@core/constants/lovable-mock.data';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { CreateInstitutionRequest, InstitutionCardResponse } from '@core/models/CreateInstitutionRequest';
import {
  InstitutionBranchListQuery,
  InstitutionBranchesView,
  InstitutionBilling,
  InstitutionDetail,
  InstitutionListQuery,
  InstitutionListView,
  InstitutionLibrariesView,
  InstitutionOverview,
  InstitutionQuickView,
  InstitutionQuickViewQuery,
  UpdateInstitutionRequest,
} from '@core/models/institution-detail.models';
import { InstitutionDropdownResponse } from '@core/models/institution-dropdown.model';
import { ApiService } from '@core/services/api.service';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InstitutionsService {
  private readonly httpApi = inject(ApiService);
  // mock-first in-memory mutation (client-side)
  private _institutions: Institution[] = [...mock.institutions];
  private _branches: Branch[] = [...mock.branches];
  private _libraries: Library[] = [...mock.libraries];


  createInstitution(payload: CreateInstitutionRequest): Observable<any> {
    return this.httpApi.post<any>('institutions', payload);
  }

  getloggedInInstitution(): Observable<APIResponseModel<InstitutionCardResponse>> {
    return this.httpApi.get<InstitutionCardResponse>('institutions/my-institution');
  }

   getInstitutionBranchForDropdown(): Observable<APIResponseModel<InstitutionDropdownResponse[]>> {
    return this.httpApi.get<InstitutionDropdownResponse[]>('institutions/dropdown');
  }

  getListView(query?: InstitutionListQuery): Observable<InstitutionListView> {
    const params: Record<string, string> = {};
    if (query?.search) params['search'] = query.search;
    if (query?.type) params['type'] = query.type;
    if (query?.status) params['status'] = query.status;
    return this.httpApi.get<InstitutionListView>('institutions/list', { params }).pipe(map((r) => r.data!));
  }

  getById(id: string): Observable<InstitutionDetail> {
    return this.httpApi.getById<InstitutionDetail>('institutions', id).pipe(map((r) => r.data!));
  }

  getOverview(id: string): Observable<InstitutionOverview> {
    return this.httpApi.get<InstitutionOverview>(`institutions/${id}/overview`).pipe(map((r) => r.data!));
  }

  getBilling(id: string): Observable<InstitutionBilling> {
    return this.httpApi.get<InstitutionBilling>(`institutions/${id}/billing`).pipe(map((r) => r.data!));
  }

  getBranchesView(id: string, query?: InstitutionBranchListQuery): Observable<InstitutionBranchesView> {
    const params: Record<string, string> = {};
    if (query?.search) params['search'] = query.search;
    if (query?.status) params['status'] = query.status;
    if (query?.size) params['size'] = query.size;
    return this.httpApi
      .get<InstitutionBranchesView>(`institutions/${id}/branches-view`, { params })
      .pipe(map((r) => r.data!));
  }

  getLibrariesView(id: string): Observable<InstitutionLibrariesView> {
    return this.httpApi
      .get<InstitutionLibrariesView>(`institutions/${id}/libraries-view`)
      .pipe(map((r) => r.data!));
  }

  getQuickView(id: string, query?: InstitutionQuickViewQuery): Observable<InstitutionQuickView> {
    const params: Record<string, string> = {};
    if (query?.metric) params['metric'] = query.metric;
    if (query?.range) params['range'] = String(query.range);
    return this.httpApi
      .get<InstitutionQuickView>(`institutions/${id}/quick-view`, { params })
      .pipe(map((r) => r.data!));
  }

  updateInstitution(id: string, request: UpdateInstitutionRequest): Observable<InstitutionDetail> {
    return this.httpApi.putTo<InstitutionDetail>(`institutions/${id}`, request).pipe(map((r) => r.data!));
  }

  listInstitutions(): Institution[] {
    return this._institutions;
  }

  institutionById(id: string): Institution {
    return this._institutions.find((i) => i.id === id) ?? this._institutions[0];
  }

  patchInstitutionLocal(id: string, patch: Partial<Institution>): Institution {
    this._institutions = this._institutions.map((i) => (i.id === id ? { ...i, ...patch } : i));
    return this.institutionById(id);
  }

  deactivateInstitution(id: string): Institution {
    return this.patchInstitutionLocal(id, { status: 'Inactive' });
  }

  listBranches(institutionId: string): Branch[] {
    return this._branches.filter((b) => b.institutionId === institutionId);
  }

  branchById(id: string): Branch {
    return this._branches.find((b) => b.id === id) ?? this._branches[0];
  }

  createBranch(payload: {
    institutionId: string;
    name: string;
    city: string;
    capacity: number;
  }): Branch {
    const id = `br_${Math.random().toString(16).slice(2, 10)}`;
    const next: Branch = {
      id,
      institutionId: payload.institutionId,
      name: payload.name,
      city: payload.city,
      capacity: payload.capacity,
      occupancy: 0,
      libraries: 0,
      members: 0,
      profile: {
        description: `${payload.name} branch operations`,
        websiteUrl: undefined,
      },
      contact: {
        email: `branch-admin+${id}@example.com`,
        phone: '+91 9000000000',
      },
      location: { latitude: 12.9, longitude: 77.5 },
      operationalHours: {
        days: [
          { day: 'Mon', open: '09:00', close: '15:00' },
          { day: 'Tue', open: '09:00', close: '15:00' },
          { day: 'Wed', open: '09:00', close: '15:00' },
          { day: 'Thu', open: '09:00', close: '15:00' },
          { day: 'Fri', open: '09:00', close: '15:00' },
          { day: 'Sat', open: '10:00', close: '14:00' },
          { day: 'Sun', open: '10:00', close: '14:00' },
        ],
      },
      performanceMetrics: {
        occupancyNow: 0,
        utilizationWeekAvg: 0,
        memberGrowth30d: 0,
        ticketsOpen: 0,
      },
      staffAssignments: [],
      hierarchy: { id: `hier_${id}`, label: 'Root', children: [] },
      deactivatedAt: undefined,
      deactivationReason: undefined,
    };


    this._branches = [next, ...this._branches];
    // keep institution counts loosely consistent for UI
    this._institutions = this._institutions.map((inst) =>
      inst.id === payload.institutionId ? { ...inst, branches: inst.branches + 1 } : inst,
    );

    return next;
  }

  updateBranch(id: string, patch: Partial<Branch>): Branch {
    this._branches = this._branches.map((b) => (b.id === id ? { ...b, ...patch } : b));
    return this.branchById(id);
  }

  deactivateBranch(id: string): Branch {
    // no explicit status in Branch type currently; mark occupancy via client-side sentinel
    return this.updateBranch(id, { occupancy: 0 });
  }

  listLibraries(branchId: string): Library[] {
    return this._libraries.filter((l) => l.branchId === branchId);
  }

  libraryById(id: string): Library {
    return this._libraries.find((l) => l.id === id) ?? this._libraries[0];
  }

  createLibrary(payload: { branchId: string; name: string; floor: number; capacity: number }): Library {
    const id = `lib_${Math.random().toString(16).slice(2, 10)}`;
    const next: Library = {
      id,
      branchId: payload.branchId,
      name: payload.name,
      floor: payload.floor,
      capacity: payload.capacity,
      occupied: 0,
      layout: {
        floors: [payload.floor],
        sections: [
          { id: `sec_${id}_1`, name: 'General', capacity: Math.round(payload.capacity * 0.45) },
          { id: `sec_${id}_2`, name: 'Reference', capacity: Math.round(payload.capacity * 0.35) },
          { id: `sec_${id}_3`, name: 'Digital', capacity: Math.round(payload.capacity * 0.2) },
        ],
      },
      operationalHours: {
        days: [
          { day: 'Mon', open: '09:00', close: '16:00' },
          { day: 'Tue', open: '09:00', close: '16:00' },
          { day: 'Wed', open: '09:00', close: '16:00' },
          { day: 'Thu', open: '09:00', close: '16:00' },
          { day: 'Fri', open: '09:00', close: '16:00' },
          { day: 'Sat', open: '10:00', close: '15:00' },
          { day: 'Sun', open: '10:00', close: '15:00' },
        ],
      },
      resources: [],
      licenses: [
        {
          id: `llib_${id}_1`,
          name: 'Library Suite',
          expiresOn: new Date(2026, 9, 20).toISOString().slice(0, 10),
          status: 'Pending',
        },
      ],
      utilizationMetrics: {
        utilizationNow: 0,
        peakUsageHour: '12:00',
        checkoutsToday: 0,
        availableSeats: payload.capacity,
      },
      staffAssignments: [],
      deactivatedAt: undefined,
      deactivationReason: undefined,
    };


    this._libraries = [next, ...this._libraries];
    // update branch count
    this._branches = this._branches.map((br) => (br.id === payload.branchId ? { ...br, libraries: br.libraries + 1 } : br));
    return next;
  }

  updateLibrary(id: string, patch: Partial<Library>): Library {
    this._libraries = this._libraries.map((l) => (l.id === id ? { ...l, ...patch } : l));
    return this.libraryById(id);
  }

  deactivateLibrary(id: string): Library {
    return this.updateLibrary(id, { occupied: 0 });
  }
}

