import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AttendanceSeatOption,
  MemberScannerContext,
  MemberScannerRecordRequest,
  ScannerAttendanceRequest,
  ScannerAttendanceResult,
  ScannerContext,
  ScannerMemberOption,
  ScannerMemberStatus,
} from '@core/models/attendanceModels';

@Injectable({ providedIn: 'root' })
export class AttendanceKioskService {
  private readonly api = inject(ApiService);
  private readonly base = 'attendance/kiosk';

  getLibraryContext(token: string): Observable<ScannerContext> {
    return this.api
      .get<ScannerContext>(`${this.base}/library/context`, { params: { token } })
      .pipe(map((r) => r.data!));
  }

  searchMembers(token: string, search?: string): Observable<ScannerMemberOption[]> {
    return this.api
      .get<ScannerMemberOption[]>(`${this.base}/library/members`, {
        params: { token, ...(search ? { search } : {}) },
      })
      .pipe(map((r) => r.data ?? []));
  }

  getMemberStatus(token: string, memberId: string): Observable<ScannerMemberStatus> {
    return this.api
      .get<ScannerMemberStatus>(`${this.base}/library/members/${memberId}/status`, {
        params: { token },
      })
      .pipe(map((r) => r.data!));
  }

  getLibrarySeats(token: string): Observable<AttendanceSeatOption[]> {
    return this.api
      .get<AttendanceSeatOption[]>(`${this.base}/library/seats`, { params: { token } })
      .pipe(map((r) => r.data ?? []));
  }

  getMemberSeats(token: string): Observable<AttendanceSeatOption[]> {
    return this.api
      .get<AttendanceSeatOption[]>(`${this.base}/member/seats`, { params: { token } })
      .pipe(map((r) => r.data ?? []));
  }

  recordLibrary(request: ScannerAttendanceRequest): Observable<ScannerAttendanceResult> {
    return this.api
      .post<ScannerAttendanceResult>(`${this.base}/library/record`, request)
      .pipe(map((r) => r.data!));
  }

  getMemberContext(token: string, deviceId?: string): Observable<MemberScannerContext> {
    return this.api
      .get<MemberScannerContext>(`${this.base}/member/context`, {
        params: { token, ...(deviceId ? { deviceId } : {}) },
      })
      .pipe(map((r) => r.data!));
  }

  getMemberSelfStatus(token: string): Observable<ScannerMemberStatus> {
    return this.api
      .get<ScannerMemberStatus>(`${this.base}/member/status`, { params: { token } })
      .pipe(map((r) => r.data!));
  }

  recordMember(request: MemberScannerRecordRequest): Observable<ScannerAttendanceResult> {
    return this.api
      .post<ScannerAttendanceResult>(`${this.base}/member/record`, request)
      .pipe(map((r) => r.data!));
  }
}
