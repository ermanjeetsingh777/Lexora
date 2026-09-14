import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceSeatPickerComponent } from './attendance-seat-picker.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('AttendanceSeatPickerComponent', () => {
  let fixture: ComponentFixture<AttendanceSeatPickerComponent>;
  let component: AttendanceSeatPickerComponent;

  beforeEach(async () => {
    await configureComponentTestBed(AttendanceSeatPickerComponent);
    fixture = TestBed.createComponent(AttendanceSeatPickerComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
