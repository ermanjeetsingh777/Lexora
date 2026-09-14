import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberDetailsComponent } from './member-details-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { MemberService } from '../MemberService';
import { AttendanceScannerService } from '@core/services/attendance-scanner.service';
import { BookService } from '@features/books/book.service';
import { CommonService } from '@core/services/common.service';
import { AttendanceService } from '@core/services/attendance.service';
import { AttendanceExportService } from '@features/attendance/attendance-export.service';
import { MemberPortalService } from '@core/services/member-portal.service';

describe('MemberDetailsComponent', () => {
  let fixture: ComponentFixture<MemberDetailsComponent>;
  let component: MemberDetailsComponent;
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'isMemberPortalUser', 'user']);
  const whatsAppServiceStub = createServiceStub(['bookReturnReminder', 'membershipRenewalPayment']);
  const memberServiceStub = createServiceStub(['addContact', 'changeMemberPassword', 'changePlanOrShift', 'downloadAadhaar', 'downloadPhoto', 'getLibraryPlan', 'getMemberById', 'renewMembership', 'uploadAadhaar']);
  const attendanceScannerServiceStub = createServiceStub(['getMemberQr']);
  const bookServiceStub = createServiceStub(['getMemberLoans', 'sendReturnReminder']);
  const commonServiceStub = createServiceStub(['goBack']);
  const attendanceServiceStub = createServiceStub(['checkIn', 'getAttendanceCalendar', 'getAttendanceStatistics', 'getLibrarySeats', 'updateAttendance']);
  const attendanceExportServiceStub = createServiceStub(['exportMemberRecords', 'loadMemberRecords']);
  const memberPortalServiceStub = createServiceStub(['memberId']);

  beforeEach(async () => {
    await configureComponentTestBed(
      MemberDetailsComponent,
      [
        { provide: AuthService, useValue: authServiceStub },
        { provide: WhatsAppService, useValue: whatsAppServiceStub },
        { provide: MemberService, useValue: memberServiceStub },
        { provide: AttendanceScannerService, useValue: attendanceScannerServiceStub },
        { provide: BookService, useValue: bookServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
        { provide: AttendanceService, useValue: attendanceServiceStub },
        { provide: AttendanceExportService, useValue: attendanceExportServiceStub },
        { provide: MemberPortalService, useValue: memberPortalServiceStub },
      ],
    );
    fixture = TestBed.createComponent(MemberDetailsComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AttendanceScannerService.getMemberQr when loadMemberAttendanceQr()', () => {
    attendanceScannerServiceStub.getMemberQr.mockClear();
    invokeComponentMethod(component, 'loadMemberAttendanceQr');
    expect(attendanceScannerServiceStub.getMemberQr).toHaveBeenCalled();
  });
});
