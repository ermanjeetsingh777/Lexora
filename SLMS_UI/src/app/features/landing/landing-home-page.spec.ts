import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingHomePage } from './landing-home-page';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { PackageService } from '@core/services/package.service';
import { CustomerReviewService } from '@core/services/customer-review.service';
import { SeoService } from '@core/services/seo.service';

describe('LandingHomePage', () => {
  let fixture: ComponentFixture<LandingHomePage>;
  let component: LandingHomePage;
  const packageServiceStub = createServiceStub(['getActivePackages']);
  const customerReviewServiceStub = createServiceStub(['getPublicApprovedReviews', 'submitReview']);
  const seoServiceStub = createServiceStub(['updateSeo']);

  beforeEach(async () => {
    await configureComponentTestBed(
      LandingHomePage,
      [
        { provide: PackageService, useValue: packageServiceStub },
        { provide: CustomerReviewService, useValue: customerReviewServiceStub },
        { provide: SeoService, useValue: seoServiceStub },
      ],
    );
    fixture = TestBed.createComponent(LandingHomePage);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call SeoService.updateSeo when initSeo()', () => {
    seoServiceStub.updateSeo.mockClear();
    invokeComponentMethod(component, 'initSeo');
    expect(seoServiceStub.updateSeo).toHaveBeenCalled();
  });

  it('should call PackageService.getActivePackages when loadPackages()', () => {
    packageServiceStub.getActivePackages.mockClear();
    invokeComponentMethod(component, 'loadPackages');
    expect(packageServiceStub.getActivePackages).toHaveBeenCalled();
  });

  it('should call CustomerReviewService.getPublicApprovedReviews when loadReviews()', () => {
    customerReviewServiceStub.getPublicApprovedReviews.mockClear();
    invokeComponentMethod(component, 'loadReviews');
    expect(customerReviewServiceStub.getPublicApprovedReviews).toHaveBeenCalled();
  });
});
