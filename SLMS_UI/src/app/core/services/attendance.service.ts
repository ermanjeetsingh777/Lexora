import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AttendanceResponse, AttendanceStatisticsResponse, AttendanceSeatOption, CheckInRequest, UpdateAttendanceRequest } from '@core/models/attendanceModels';
import { APIResponseModel } from '@core/models/APIResponseModel';

@Injectable()
export class AttendanceService {
    private readonly http = inject(ApiService);

    checkIn(memberId: string, request: CheckInRequest, isCheckIn: boolean): Observable<APIResponseModel<AttendanceResponse>> {
        return this.http.post<AttendanceResponse>(isCheckIn ? 'attendance/members/' + memberId + '/check-in' : 'attendance/members/' + memberId + '/check-out', request);
    }

    getAttendanceCalendar(memberId: string, month: number, year: number): Observable<APIResponseModel<AttendanceResponse[]>> {

        return this.http.get<AttendanceResponse[]>(
            'attendance/members/' + memberId + '/calendar',
            {
                params: {month, year }
            }
        );
    }

    getAttendanceStatistics(memberId: string): Observable<APIResponseModel<AttendanceStatisticsResponse>> {
        return this.http.get<AttendanceStatisticsResponse>(
            'attendance/members/' + memberId + '/statistics'
        );
    }

    getMemberRecords(memberId: string, dateFrom: string, dateTo: string): Observable<APIResponseModel<AttendanceResponse[]>> {
        return this.http.get<AttendanceResponse[]>(
            'attendance/members/' + memberId + '/records',
            { params: { dateFrom, dateTo } },
        );
    }

    getLibrarySeats(libraryId: string): Observable<APIResponseModel<AttendanceSeatOption[]>> {
        return this.http.get<AttendanceSeatOption[]>(`attendance/libraries/${libraryId}/seats`);
    }

    updateAttendance(attendanceId: string, request: UpdateAttendanceRequest): Observable<APIResponseModel<AttendanceResponse>> {
        return this.http.putTo<AttendanceResponse>(`attendance/${attendanceId}`, request);
    }

    // checkOut(
    //     institutionId: string,
    //     memberId: string,
    //     request: CheckOutRequest
    // ): Observable<ApiResponse<AttendanceResponse>> {

    //     return this.http.post<ApiResponse<AttendanceResponse>>(
    //         `${this.api}/institutions/${institutionId}/members/${memberId}/attendance/check-out`,
    //         request
    //     );
    // }

    // getToday(
    //     institutionId: string,
    //     memberId: string
    // ): Observable<ApiResponse<AttendanceResponse>> {

    //     return this.http.get<ApiResponse<AttendanceResponse>>(
    //         `${this.api}/institutions/${institutionId}/members/${memberId}/attendance/today`
    //     );
    // }

    // getHistory(
    //     institutionId: string,
    //     memberId: string,
    //     page = 1,
    //     pageSize = 20
    // ): Observable<ApiResponse<PagedResult<AttendanceHistoryResponse>>> {

    //     return this.http.get<ApiResponse<PagedResult<AttendanceHistoryResponse>>>(
    //         `${this.api}/institutions/${institutionId}/members/${memberId}/attendance/history?page=${page}&pageSize=${pageSize}`
    //     );
    // }

    // getStatistics(
    //     institutionId: string,
    //     memberId: string
    // ): Observable<ApiResponse<AttendanceStatisticsResponse>> {

    //     return this.http.get<ApiResponse<AttendanceStatisticsResponse>>(
    //         `${this.api}/institutions/${institutionId}/members/${memberId}/attendance/statistics`
    //     );
    // }
}