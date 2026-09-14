import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryKioskComponent } from './library-kiosk.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AttendanceKioskService } from '@core/services/attendance-kiosk.service';
import { KioskDeviceService } from '@core/services/kiosk-device.service';

describe('LibraryKioskComponent', () => {
  let fixture: ComponentFixture<LibraryKioskComponent>;
  let component: LibraryKioskComponent;
  const attendanceKioskServiceStub = createServiceStub(['getLibraryContext', 'getLibrarySeats', 'getMemberStatus', 'recordLibrary', 'searchMembers']);
  const kioskDeviceServiceStub = createServiceStub(['bindMember', 'getDeviceId', 'getStaffDeviceId', 'validateMemberAccess']);

  beforeEach(async () => {
    await configureComponentTestBed(
      LibraryKioskComponent,
      [
        { provide: AttendanceKioskService, useValue: attendanceKioskServiceStub },
        { provide: KioskDeviceService, useValue: kioskDeviceServiceStub },
      ],
    );
    fixture = TestBed.createComponent(LibraryKioskComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
