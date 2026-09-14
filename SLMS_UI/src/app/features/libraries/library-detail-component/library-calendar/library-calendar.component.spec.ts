import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryCalendarComponent } from './library-calendar.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { LibraryService } from '../../library.service';

describe('LibraryCalendarComponent', () => {
  let fixture: ComponentFixture<LibraryCalendarComponent>;
  let component: LibraryCalendarComponent;
  const libraryServiceStub = createServiceStub(['getCalendarView']);

  beforeEach(async () => {
    await configureComponentTestBed(
      LibraryCalendarComponent,
      [
        { provide: LibraryService, useValue: libraryServiceStub },
      ],
    );
    fixture = TestBed.createComponent(LibraryCalendarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('libraryId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call LibraryService.getCalendarView when loadCalendar()', () => {
    libraryServiceStub.getCalendarView.mockClear();
    invokeComponentMethod(component, 'loadCalendar', ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001']);
    expect(libraryServiceStub.getCalendarView).toHaveBeenCalled();
  });
});
