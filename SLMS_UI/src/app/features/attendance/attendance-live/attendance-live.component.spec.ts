import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceLiveComponent } from './attendance-live.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { AttendanceFilterService } from '../attendance-filter.service';

describe('AttendanceLiveComponent', () => {
  let fixture: ComponentFixture<AttendanceLiveComponent>;
  let component: AttendanceLiveComponent;
  const attendanceModuleServiceStub = createServiceStub(['getLiveFeed']);
  const attendanceFilterServiceStub = createServiceStub(['libraries', 'librariesLoaded', 'libraryId', 'loadLibraries', 'setLibraryId']);

  beforeEach(async () => {
    await configureComponentTestBed(
      AttendanceLiveComponent,
      [
        { provide: AttendanceModuleService, useValue: attendanceModuleServiceStub },
        { provide: AttendanceFilterService, useValue: attendanceFilterServiceStub },
      ],
    );
    fixture = TestBed.createComponent(AttendanceLiveComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
