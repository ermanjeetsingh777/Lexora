import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AttendanceResponse,
  ScannerAttendanceRequest,
  ScannerAttendanceResult,
  ScannerContext,
  ScannerMemberOption,
  ScannerMemberStatus,
  ScannerQrCode,
} from '@core/models/attendanceModels';
import { APIResponseModel } from '@core/models/APIResponseModel';

@Injectable({ providedIn: 'root' })
export class AttendanceScannerService {
  private readonly api = inject(ApiService);
  private readonly base = 'attendance/scanner';

  getContext(token: string): Observable<ScannerContext> {
    return this.api
      .get<ScannerContext>(`${this.base}/context`, { params: { token } })
      .pipe(map((r) => r.data!));
  }

  searchMembers(token: string, search?: string): Observable<ScannerMemberOption[]> {
    return this.api
      .get<ScannerMemberOption[]>(`${this.base}/members`, {
        params: { token, ...(search ? { search } : {}) },
      })
      .pipe(map((r) => r.data ?? []));
  }

  getMemberStatus(token: string, memberId: string): Observable<ScannerMemberStatus> {
    return this.api
      .get<ScannerMemberStatus>(`${this.base}/members/${memberId}/status`, {
        params: { token },
      })
      .pipe(map((r) => r.data!));
  }

  record(request: ScannerAttendanceRequest): Observable<ScannerAttendanceResult> {
    return this.api
      .post<ScannerAttendanceResult>(`${this.base}/record`, request)
      .pipe(map((r) => r.data!));
  }

  getLibraryQr(libraryId: string): Observable<ScannerQrCode> {
    return this.api
      .get<ScannerQrCode>(`${this.base}/libraries/${libraryId}/qr`)
      .pipe(map((r) => r.data!));
  }
}
