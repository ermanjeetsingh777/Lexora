import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstitutionOnboardingStepperComponent } from './institution-onboarding-stepper.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('InstitutionOnboardingStepperComponent', () => {
  let fixture: ComponentFixture<InstitutionOnboardingStepperComponent>;
  let component: InstitutionOnboardingStepperComponent;

  beforeEach(async () => {
    await configureComponentTestBed(InstitutionOnboardingStepperComponent);
    fixture = TestBed.createComponent(InstitutionOnboardingStepperComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
