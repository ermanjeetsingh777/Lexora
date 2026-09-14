import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceOverviewComponent } from './attendance-overview.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { AttendanceFilterService } from '../attendance-filter.service';

describe('AttendanceOverviewComponent', () => {
  let fixture: ComponentFixture<AttendanceOverviewComponent>;
  let component: AttendanceOverviewComponent;
  const attendanceModuleServiceStub = createServiceStub(['getAnalytics']);
  const attendanceFilterServiceStub = createServiceStub(['libraries', 'librariesLoaded', 'libraryId', 'loadLibraries', 'setLibraryId']);

  beforeEach(async () => {
    await configureComponentTestBed(
      AttendanceOverviewComponent,
      [
        { provide: AttendanceModuleService, useValue: attendanceModuleServiceStub },
        { provide: AttendanceFilterService, useValue: attendanceFilterServiceStub },
      ],
    );
    fixture = TestBed.createComponent(AttendanceOverviewComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
