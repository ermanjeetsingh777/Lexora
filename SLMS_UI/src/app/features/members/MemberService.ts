import { Injectable, inject } from '@angular/core';
import { Observable, EMPTY, expand, map, of, reduce } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChangeMemberPlanShiftRequest, CreateMemberContactRequest, CreateMemberRequest, CreateMemberResponse, BulkMemberUploadResponse, ChangeMemberPasswordRequest, MemberContactResponse, MemberDetailResponse, MemberListQuery, MemberListResponse, MembershipSummary, PagedMemberList, UpdateMemberRequest } from '@core/models/MemberRequest';
import { ApiService } from '@core/services/api.service';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { PlanResponse } from '@core/models/institution-dropdown.model';

function toMemberListParams(query?: MemberListQuery): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};
    if (!query) return params;
    if (query.page != null) params['page'] = query.page;
    if (query.pageSize != null) params['pageSize'] = query.pageSize;
    if (query.search) params['search'] = query.search;
    if (query.statuses) params['statuses'] = query.statuses;
    if (query.branches) params['branches'] = query.branches;
    if (query.libraries) params['libraries'] = query.libraries;
    if (query.shifts) params['shifts'] = query.shifts;
    if (query.plans) params['plans'] = query.plans;
    if (query.lifecycles) params['lifecycles'] = query.lifecycles;
    if (query.needsAction) params['needsAction'] = query.needsAction;
    if (query.sortBy) params['sortBy'] = query.sortBy;
    if (query.sortDir) params['sortDir'] = query.sortDir;
    return params;
}

@Injectable()
export class MemberService {

    private readonly httpApi = inject(ApiService);

    createMember(institutionId: string, branchId: string, libraryId: string, request: CreateMemberRequest): Observable<APIResponseModel<CreateMemberResponse>> {

        const url =
            `institutions/${institutionId}` +
            `/branches/${branchId}` +
            `/libraries/${libraryId}` +
            `/members`;

        return this.httpApi.post<CreateMemberResponse>(url, request);
    }

    downloadBulkTemplate(institutionId: string, branchId: string, libraryId: string): Observable<Blob> {
        const url =
            `institutions/${institutionId}` +
            `/branches/${branchId}` +
            `/libraries/${libraryId}` +
            `/members/bulk/template`;

        return this.httpApi.download(url);
    }

    bulkUploadMembers(institutionId: string, branchId: string, libraryId: string, file: File): Observable<APIResponseModel<BulkMemberUploadResponse>> {
        const url =
            `institutions/${institutionId}` +
            `/branches/${branchId}` +
            `/libraries/${libraryId}` +
            `/members/bulk`;

        return this.httpApi.upload<BulkMemberUploadResponse>(url, file);
    }

    getLibraryMember(institutionId: string, branchId: string, libraryId: string, query?: MemberListQuery): Observable<APIResponseModel<PagedMemberList>> {
        const url =
            `institutions/${institutionId}` +
            `/branches/${branchId}` +
            `/libraries/${libraryId}` +
            `/members`;
        return this.httpApi.get<PagedMemberList>(url, { params: toMemberListParams(query) });
    }

    getInstitutionMembers(institutionId: string, query?: MemberListQuery): Observable<APIResponseModel<PagedMemberList>> {
        return this.httpApi.get<PagedMemberList>(`institutions/${institutionId}/members`, { params: toMemberListParams(query) });
    }

    getBranchMembers(institutionId: string, branchId: string, query?: MemberListQuery): Observable<APIResponseModel<PagedMemberList>> {
        return this.httpApi.get<PagedMemberList>(`institutions/${institutionId}/branches/${branchId}/members`, { params: toMemberListParams(query) });
    }

    getAllMembers(query?: MemberListQuery): Observable<APIResponseModel<PagedMemberList>> {
        return this.httpApi.get<PagedMemberList>('members', { params: toMemberListParams(query) });
    }

    /** Walk all pages for the current filter set (exports / bulk ops). */
    fetchAllFilteredMembers(query: MemberListQuery = {}): Observable<MemberListResponse[]> {
        const pageSize = Math.min(query.pageSize ?? 200, 500);
        const first = this.getAllMembers({ ...query, page: 1, pageSize });

        return first.pipe(
            expand((res) => {
                const data = res.data;
                if (!data?.hasNextPage) return EMPTY;
                return this.getAllMembers({ ...query, page: (data.pageNumber ?? 1) + 1, pageSize });
            }),
            map((res) => res.data?.items ?? []),
            reduce((acc, items) => acc.concat(items), [] as MemberListResponse[]),
        );
    }

    getMembershipSummary(): Observable<APIResponseModel<MembershipSummary>> {
        return this.httpApi.get<MembershipSummary>('members/summary');
    }

    getMemberById(memberId: string): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.get<MemberDetailResponse>('members/' + memberId);
    }

    updateMember(memberId: string, request: UpdateMemberRequest): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.putTo<MemberDetailResponse>('members/' + memberId, request);
    }

    changePlanOrShift(memberId: string, request: ChangeMemberPlanShiftRequest): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.post<MemberDetailResponse>('members/' + memberId + '/plan-or-shift', request);
    }

    renewMembership(memberId: string, request?: ChangeMemberPlanShiftRequest): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.post<MemberDetailResponse>('members/' + memberId + '/renew', request ?? {});
    }

    getLibraryPlan(institutionId: string, branchId: string, libraryId: string): Observable<APIResponseModel<PlanResponse[]>> {
        const url =
            `institutions/${institutionId}` +
            `/branches/${branchId}` +
            `/libraries/${libraryId}` +
            `/plans`;

        return this.httpApi.get<PlanResponse[]>(url);
    }

    addContact(memberId: string,request: CreateMemberContactRequest): Observable<APIResponseModel<MemberContactResponse>> {
        return this.httpApi.post<MemberContactResponse>('members/' + memberId + '/contacts', request);
    }

    uploadPhoto(memberId: string, file: File): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.upload<MemberDetailResponse>(`members/${memberId}/photo`, file);
    }

    getPhotoUrl(memberId: string): string {
        return `${environment.apiUrl}/members/${memberId}/photo`;
    }

    downloadPhoto(memberId: string): Observable<Blob> {
        return this.httpApi.download(`members/${memberId}/photo`);
    }

    uploadAadhaar(memberId: string, file: File): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.upload<MemberDetailResponse>(`members/${memberId}/aadhaar`, file);
    }

    downloadAadhaar(memberId: string): Observable<Blob> {
        return this.httpApi.download(`members/${memberId}/aadhaar`);
    }

    changeMemberPassword(memberId: string, request: ChangeMemberPasswordRequest): Observable<APIResponseModel<{ message: string }>> {
        return this.httpApi.post<{ message: string }>(`members/${memberId}/password`, request);
    }
}
