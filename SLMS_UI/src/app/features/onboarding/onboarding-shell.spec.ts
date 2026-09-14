import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnboardingShell } from './onboarding-shell';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';

describe('OnboardingShell', () => {
  let fixture: ComponentFixture<OnboardingShell>;
  let component: OnboardingShell;
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'logout', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      OnboardingShell,
      [
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(OnboardingShell);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
