import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'resetPassword', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      ResetPasswordComponent,
      [
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
