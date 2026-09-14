import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberKioskComponent } from './member-kiosk.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AttendanceKioskService } from '@core/services/attendance-kiosk.service';
import { KioskDeviceService } from '@core/services/kiosk-device.service';

describe('MemberKioskComponent', () => {
  let fixture: ComponentFixture<MemberKioskComponent>;
  let component: MemberKioskComponent;
  const attendanceKioskServiceStub = createServiceStub(['getMemberContext', 'getMemberSeats', 'getMemberSelfStatus', 'recordMember']);
  const kioskDeviceServiceStub = createServiceStub(['bindMember', 'getDeviceId', 'getStaffDeviceId', 'validateMemberAccess']);

  beforeEach(async () => {
    await configureComponentTestBed(
      MemberKioskComponent,
      [
        { provide: AttendanceKioskService, useValue: attendanceKioskServiceStub },
        { provide: KioskDeviceService, useValue: kioskDeviceServiceStub },
      ],
    );
    fixture = TestBed.createComponent(MemberKioskComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AttendanceKioskService.getMemberSelfStatus when loadStatus()', () => {
    attendanceKioskServiceStub.getMemberSelfStatus.mockClear();
    invokeComponentMethod(component, 'loadStatus', ['00000000-0000-0000-0000-000000000001']);
    expect(attendanceKioskServiceStub.getMemberSelfStatus).toHaveBeenCalled();
  });
});
