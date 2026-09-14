import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentSettingsComponent } from './payment-settings.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { PaymentService } from '@core/services/payment.service';
import { AuthService } from '@core/services/auth.service';

describe('PaymentSettingsComponent', () => {
  let fixture: ComponentFixture<PaymentSettingsComponent>;
  let component: PaymentSettingsComponent;
  const paymentServiceStub = createServiceStub(['getAccount', 'saveAccount']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      PaymentSettingsComponent,
      [
        { provide: PaymentService, useValue: paymentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(PaymentSettingsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('institutionId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
