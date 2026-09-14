import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentQueueComponent } from './payment-queue.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { PaymentService } from '@core/services/payment.service';
import { AuthService } from '@core/services/auth.service';

describe('PaymentQueueComponent', () => {
  let fixture: ComponentFixture<PaymentQueueComponent>;
  let component: PaymentQueueComponent;
  const paymentServiceStub = createServiceStub(['approve', 'list', 'reject']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      PaymentQueueComponent,
      [
        { provide: PaymentService, useValue: paymentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(PaymentQueueComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('institutionId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call PaymentService.list when load()', () => {
    paymentServiceStub.list.mockClear();
    invokeComponentMethod(component, 'load');
    expect(paymentServiceStub.list).toHaveBeenCalled();
  });

  it('should call PaymentService.approve when approve()', () => {
    paymentServiceStub.approve.mockClear();
    invokeComponentMethod(component, 'approve', [{ id: '00000000-0000-0000-0000-000000000001', reference: 'REF-1', name: 'Test', title: 'Test', email: 'test@example.com', status: 0, amount: 0 } as any]);
    expect(paymentServiceStub.approve).toHaveBeenCalled();
  });
});
