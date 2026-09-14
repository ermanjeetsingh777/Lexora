import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RenewPlanDialogComponent } from './renew-plan-dialog.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('RenewPlanDialogComponent', () => {
  let fixture: ComponentFixture<RenewPlanDialogComponent>;
  let component: RenewPlanDialogComponent;

  beforeEach(async () => {
    await configureComponentTestBed(RenewPlanDialogComponent);
    fixture = TestBed.createComponent(RenewPlanDialogComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
