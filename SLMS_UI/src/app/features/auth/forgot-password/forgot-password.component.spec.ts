import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  const authServiceStub = createServiceStub(['currentUser', 'forgotPassword', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      ForgotPasswordComponent,
      [
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
