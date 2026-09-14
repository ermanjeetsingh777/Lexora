import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubscriptionsComponent } from './subscriptions.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { PackageSubscriptionService } from '@core/services/package-subscription.service';
import { PackageService } from '@core/services/package.service';
import { AddonService } from '@core/services/addon.service';
import { PaymentService } from '@core/services/payment.service';

describe('SubscriptionsComponent', () => {
  let fixture: ComponentFixture<SubscriptionsComponent>;
  let component: SubscriptionsComponent;
  const packageSubscriptionServiceStub = createServiceStub(['getOverview', 'getQuote', 'renew', 'subscribe', 'update', 'upgrade']);
  const packageServiceStub = createServiceStub(['updatePackage']);
  const addonServiceStub = createServiceStub(['createAddon', 'getActiveAddons', 'getMyAddons', 'purchaseAddon', 'updateAddon']);
  const paymentServiceStub = createServiceStub(['getPlatformStatus', 'initiateAddon', 'initiateSubscription', 'openRazorpayCheckout', 'verifyRazorpay']);

  beforeEach(async () => {
    await configureComponentTestBed(
      SubscriptionsComponent,
      [
        { provide: PackageSubscriptionService, useValue: packageSubscriptionServiceStub },
        { provide: PackageService, useValue: packageServiceStub },
        { provide: AddonService, useValue: addonServiceStub },
        { provide: PaymentService, useValue: paymentServiceStub },
      ],
    );
    fixture = TestBed.createComponent(SubscriptionsComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call PaymentService.getPlatformStatus on init', () => {
    expect(paymentServiceStub.getPlatformStatus).toHaveBeenCalled();
  });

  it('should call PackageSubscriptionService.getOverview when loadOverview()', () => {
    packageSubscriptionServiceStub.getOverview.mockClear();
    invokeComponentMethod(component, 'loadOverview');
    expect(packageSubscriptionServiceStub.getOverview).toHaveBeenCalled();
  });

  it('should call AddonService.getActiveAddons when loadAddons()', () => {
    addonServiceStub.getActiveAddons.mockClear();
    invokeComponentMethod(component, 'loadAddons');
    expect(addonServiceStub.getActiveAddons).toHaveBeenCalled();
  });

  it('should call AddonService.getMyAddons when loadAddons()', () => {
    addonServiceStub.getMyAddons.mockClear();
    invokeComponentMethod(component, 'loadAddons');
    expect(addonServiceStub.getMyAddons).toHaveBeenCalled();
  });

  it('should call PackageSubscriptionService.getQuote when fetchQuote()', () => {
    packageSubscriptionServiceStub.getQuote.mockClear();
    invokeComponentMethod(component, 'fetchQuote', ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001']);
    expect(packageSubscriptionServiceStub.getQuote).toHaveBeenCalled();
  });
});
