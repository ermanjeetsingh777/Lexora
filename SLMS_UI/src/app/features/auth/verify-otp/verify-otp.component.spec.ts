import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyOtpComponent } from './verify-otp.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';

describe('VerifyOtpComponent', () => {
  let fixture: ComponentFixture<VerifyOtpComponent>;
  let component: VerifyOtpComponent;
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'login', 'sendOtp', 'user', 'verifyOtp']);

  beforeEach(async () => {
    await configureComponentTestBed(
      VerifyOtpComponent,
      [
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(VerifyOtpComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
