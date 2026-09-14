import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceCalendarComponent } from './attendance-calendar.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { AttendanceFilterService } from '../attendance-filter.service';

describe('AttendanceCalendarComponent', () => {
  let fixture: ComponentFixture<AttendanceCalendarComponent>;
  let component: AttendanceCalendarComponent;
  const attendanceModuleServiceStub = createServiceStub(['getCalendarMonth', 'getCalendarSummary']);
  const attendanceFilterServiceStub = createServiceStub(['libraries', 'librariesLoaded', 'libraryId', 'loadLibraries', 'setLibraryId']);

  beforeEach(async () => {
    await configureComponentTestBed(
      AttendanceCalendarComponent,
      [
        { provide: AttendanceModuleService, useValue: attendanceModuleServiceStub },
        { provide: AttendanceFilterService, useValue: attendanceFilterServiceStub },
      ],
    );
    fixture = TestBed.createComponent(AttendanceCalendarComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AttendanceModuleService.getCalendarMonth when loadMonth()', () => {
    attendanceModuleServiceStub.getCalendarMonth.mockClear();
    invokeComponentMethod(component, 'loadMonth');
    expect(attendanceModuleServiceStub.getCalendarMonth).toHaveBeenCalled();
  });
});
