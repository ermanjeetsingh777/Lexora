import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PendingApprovalComponent } from './pending-approval.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';
import { CommonService } from '@core/services/common.service';
import { PaymentService } from '@core/services/payment.service';

describe('PendingApprovalComponent', () => {
  let fixture: ComponentFixture<PendingApprovalComponent>;
  let component: PendingApprovalComponent;
  const authServiceStub = createServiceStub(['currentUser', 'getRegistrationStatus', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);
  const commonServiceStub = createServiceStub([]);
  const paymentServiceStub = createServiceStub(['getPlatformStatus', 'initiateSubscription', 'openRazorpayCheckout', 'verifyRazorpay']);

  beforeEach(async () => {
    await configureComponentTestBed(
      PendingApprovalComponent,
      [
        { provide: AuthService, useValue: authServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
        { provide: PaymentService, useValue: paymentServiceStub },
      ],
    );
    fixture = TestBed.createComponent(PendingApprovalComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AuthService.getRegistrationStatus when fetchStatus()', () => {
    authServiceStub.getRegistrationStatus.mockClear();
    invokeComponentMethod(component, 'fetchStatus');
    expect(authServiceStub.getRegistrationStatus).toHaveBeenCalled();
  });

  it('should call AuthService.getRegistrationStatus when refreshStatus()', () => {
    authServiceStub.getRegistrationStatus.mockClear();
    invokeComponentMethod(component, 'refreshStatus');
    expect(authServiceStub.getRegistrationStatus).toHaveBeenCalled();
  });
});
