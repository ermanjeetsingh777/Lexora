import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TenantApprovalsComponent } from './tenant-approvals.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AdminService } from '@core/services/admin.service';
import { AddonService } from '@core/services/addon.service';
import { PackageSubscriptionService } from '@core/services/package-subscription.service';
import { CustomerReviewService } from '@core/services/customer-review.service';

describe('TenantApprovalsComponent', () => {
  let fixture: ComponentFixture<TenantApprovalsComponent>;
  let component: TenantApprovalsComponent;
  const adminServiceStub = createServiceStub(['approveTenantRegistration', 'getTenantRegistrations', 'rejectTenantRegistration']);
  const addonServiceStub = createServiceStub(['approveAddonRequest', 'getAddonRequests', 'rejectAddonRequest']);
  const packageSubscriptionServiceStub = createServiceStub(['approveSubscriptionRequest', 'getAllSubscriptionRequests', 'rejectSubscriptionRequest']);
  const customerReviewServiceStub = createServiceStub(['approveReview', 'deleteReview', 'getAllReviews', 'rejectReview']);

  beforeEach(async () => {
    await configureComponentTestBed(
      TenantApprovalsComponent,
      [
        { provide: AdminService, useValue: adminServiceStub },
        { provide: AddonService, useValue: addonServiceStub },
        { provide: PackageSubscriptionService, useValue: packageSubscriptionServiceStub },
        { provide: CustomerReviewService, useValue: customerReviewServiceStub },
      ],
    );
    fixture = TestBed.createComponent(TenantApprovalsComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call CustomerReviewService.getAllReviews when loadReviews()', () => {
    customerReviewServiceStub.getAllReviews.mockClear();
    invokeComponentMethod(component, 'loadReviews');
    expect(customerReviewServiceStub.getAllReviews).toHaveBeenCalled();
  });

  it('should call AdminService.getTenantRegistrations when loadRegistrations()', () => {
    adminServiceStub.getTenantRegistrations.mockClear();
    invokeComponentMethod(component, 'loadRegistrations');
    expect(adminServiceStub.getTenantRegistrations).toHaveBeenCalled();
  });

  it('should call AddonService.getAddonRequests when loadAddonRequests()', () => {
    addonServiceStub.getAddonRequests.mockClear();
    invokeComponentMethod(component, 'loadAddonRequests');
    expect(addonServiceStub.getAddonRequests).toHaveBeenCalled();
  });

  it('should call PackageSubscriptionService.getAllSubscriptionRequests when loadPlanRequests()', () => {
    packageSubscriptionServiceStub.getAllSubscriptionRequests.mockClear();
    invokeComponentMethod(component, 'loadPlanRequests');
    expect(packageSubscriptionServiceStub.getAllSubscriptionRequests).toHaveBeenCalled();
  });
});
