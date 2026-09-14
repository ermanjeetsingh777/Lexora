import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceShellComponent } from './attendance-shell.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AttendanceFilterService } from '../attendance-filter.service';

describe('AttendanceShellComponent', () => {
  let fixture: ComponentFixture<AttendanceShellComponent>;
  let component: AttendanceShellComponent;
  const attendanceFilterServiceStub = createServiceStub(['libraries', 'librariesLoaded', 'libraryId', 'loadLibraries', 'setLibraryId']);

  beforeEach(async () => {
    await configureComponentTestBed(
      AttendanceShellComponent,
      [
        { provide: AttendanceFilterService, useValue: attendanceFilterServiceStub },
      ],
    );
    fixture = TestBed.createComponent(AttendanceShellComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
