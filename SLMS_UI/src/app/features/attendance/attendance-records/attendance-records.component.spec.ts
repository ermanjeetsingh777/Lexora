import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceRecordsComponent } from './attendance-records.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { AttendanceFilterService } from '../attendance-filter.service';
import { AttendanceExportService } from '../attendance-export.service';

describe('AttendanceRecordsComponent', () => {
  let fixture: ComponentFixture<AttendanceRecordsComponent>;
  let component: AttendanceRecordsComponent;
  const attendanceModuleServiceStub = createServiceStub(['getRecords']);
  const attendanceFilterServiceStub = createServiceStub(['libraries', 'librariesLoaded', 'libraryId', 'loadLibraries', 'setLibraryId']);
  const attendanceExportServiceStub = createServiceStub(['fetchAllModuleRecords']);

  beforeEach(async () => {
    await configureComponentTestBed(
      AttendanceRecordsComponent,
      [
        { provide: AttendanceModuleService, useValue: attendanceModuleServiceStub },
        { provide: AttendanceFilterService, useValue: attendanceFilterServiceStub },
        { provide: AttendanceExportService, useValue: attendanceExportServiceStub },
      ],
    );
    fixture = TestBed.createComponent(AttendanceRecordsComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AttendanceModuleService.getRecords when loadRecords()', () => {
    attendanceModuleServiceStub.getRecords.mockClear();
    invokeComponentMethod(component, 'loadRecords');
    expect(attendanceModuleServiceStub.getRecords).toHaveBeenCalled();
  });
});
