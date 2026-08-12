import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChangeMemberPlanShiftRequest, CreateMemberContactRequest, CreateMemberRequest, CreateMemberResponse, MemberContactResponse, MemberDetailResponse, MemberListResponse } from '@core/models/MemberRequest';
import { ApiService } from '@core/services/api.service';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { PlanResponse } from '@core/models/institution-dropdown.model';

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

    getLibraryMember(institutionId: string, branchId: string, libraryId: string): Observable<APIResponseModel<MemberListResponse[]>> {
        const url =
            `institutions/${institutionId}` +
            `/branches/${branchId}` +
            `/libraries/${libraryId}` +
            `/members`;
        return this.httpApi.get<MemberListResponse[]>(url);
    }

    getAllMembers(): Observable<APIResponseModel<MemberListResponse[]>> {
        return this.httpApi.get<MemberListResponse[]>('members');
    }

    getMemberById(memberId: string): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.get<MemberDetailResponse>('members/' + memberId);
    }

    changePlanOrShift(memberId: string, request: ChangeMemberPlanShiftRequest): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.post<MemberDetailResponse>('members/' + memberId + '/plan-or-shift', request);
    }

    renewMembership(memberId: string): Observable<APIResponseModel<MemberDetailResponse>> {
        return this.httpApi.post<MemberDetailResponse>('members/' + memberId + '/renew', {});
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
} 