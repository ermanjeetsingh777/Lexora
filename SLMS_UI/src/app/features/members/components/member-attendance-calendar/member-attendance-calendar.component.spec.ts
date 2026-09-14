import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberAttendanceCalendarComponent } from './member-attendance-calendar.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('MemberAttendanceCalendarComponent', () => {
  let fixture: ComponentFixture<MemberAttendanceCalendarComponent>;
  let component: MemberAttendanceCalendarComponent;

  beforeEach(async () => {
    await configureComponentTestBed(MemberAttendanceCalendarComponent);
    fixture = TestBed.createComponent(MemberAttendanceCalendarComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
