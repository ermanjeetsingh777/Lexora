import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollectPaymentDialogComponent } from './collect-payment-dialog.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { PaymentService } from '@core/services/payment.service';

describe('CollectPaymentDialogComponent', () => {
  let fixture: ComponentFixture<CollectPaymentDialogComponent>;
  let component: CollectPaymentDialogComponent;
  const paymentServiceStub = createServiceStub(['initiateMemberFee', 'openRazorpayCheckout', 'submitUpiReference', 'verifyRazorpay']);

  beforeEach(async () => {
    await configureComponentTestBed(
      CollectPaymentDialogComponent,
      [
        { provide: PaymentService, useValue: paymentServiceStub },
      ],
    );
    fixture = TestBed.createComponent(CollectPaymentDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('memberId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call PaymentService.openRazorpayCheckout when runCheckout()', () => {
    paymentServiceStub.openRazorpayCheckout.mockClear();
    invokeComponentMethod(component, 'runCheckout', [{ id: '00000000-0000-0000-0000-000000000001', reference: 'REF-1', name: 'Test', title: 'Test', email: 'test@example.com', status: 0, amount: 0 } as any]);
    expect(paymentServiceStub.openRazorpayCheckout).toHaveBeenCalled();
  });
});
