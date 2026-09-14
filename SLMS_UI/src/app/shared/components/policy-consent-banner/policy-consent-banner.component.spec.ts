import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PolicyConsentBannerComponent } from './policy-consent-banner.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('PolicyConsentBannerComponent', () => {
  let fixture: ComponentFixture<PolicyConsentBannerComponent>;
  let component: PolicyConsentBannerComponent;

  beforeEach(async () => {
    await configureComponentTestBed(PolicyConsentBannerComponent);
    fixture = TestBed.createComponent(PolicyConsentBannerComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
