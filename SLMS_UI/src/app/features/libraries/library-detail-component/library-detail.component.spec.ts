import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryDetailComponent } from './library-detail.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { LibraryService } from '../library.service';

describe('LibraryDetailComponent', () => {
  let fixture: ComponentFixture<LibraryDetailComponent>;
  let component: LibraryDetailComponent;
  const libraryServiceStub = createServiceStub(['getAttendanceQr', 'getDetailView', 'updateHoursExceptions', 'updateLibrary', 'updateWeeklyHours']);

  beforeEach(async () => {
    await configureComponentTestBed(
      LibraryDetailComponent,
      [
        { provide: LibraryService, useValue: libraryServiceStub },
      ],
    );
    fixture = TestBed.createComponent(LibraryDetailComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call LibraryService.getAttendanceQr when loadAttendanceQr()', () => {
    libraryServiceStub.getAttendanceQr.mockClear();
    invokeComponentMethod(component, 'loadAttendanceQr', ['00000000-0000-0000-0000-000000000001']);
    expect(libraryServiceStub.getAttendanceQr).toHaveBeenCalled();
  });
});
