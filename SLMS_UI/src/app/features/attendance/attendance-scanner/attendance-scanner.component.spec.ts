import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceScannerComponent } from './attendance-scanner.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AttendanceScannerService } from '@core/services/attendance-scanner.service';
import { AttendanceFilterService } from '../attendance-filter.service';
import { AuthService } from '@core/services/auth.service';
import { KioskDeviceService } from '@core/services/kiosk-device.service';

describe('AttendanceScannerComponent', () => {
  let fixture: ComponentFixture<AttendanceScannerComponent>;
  let component: AttendanceScannerComponent;
  const attendanceScannerServiceStub = createServiceStub(['getContext', 'getLibraryQr', 'getLibrarySeats', 'getMemberStatus', 'record', 'searchMembers']);
  const attendanceFilterServiceStub = createServiceStub(['libraries', 'librariesLoaded', 'libraryId', 'loadLibraries', 'setLibraryId']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);
  const kioskDeviceServiceStub = createServiceStub(['bindMember', 'getDeviceId', 'getStaffDeviceId', 'validateMemberAccess']);

  beforeEach(async () => {
    await configureComponentTestBed(
      AttendanceScannerComponent,
      [
        { provide: AttendanceScannerService, useValue: attendanceScannerServiceStub },
        { provide: AttendanceFilterService, useValue: attendanceFilterServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: KioskDeviceService, useValue: kioskDeviceServiceStub },
      ],
    );
    fixture = TestBed.createComponent(AttendanceScannerComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AttendanceScannerService.getLibraryQr when loadQr()', () => {
    attendanceScannerServiceStub.getLibraryQr.mockClear();
    invokeComponentMethod(component, 'loadQr', ['00000000-0000-0000-0000-000000000001']);
    expect(attendanceScannerServiceStub.getLibraryQr).toHaveBeenCalled();
  });
});
