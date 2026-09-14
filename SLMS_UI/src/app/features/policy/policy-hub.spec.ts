import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PolicyHub } from './policy-hub';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { SeoService } from '@core/services/seo.service';

describe('PolicyHub', () => {
  let fixture: ComponentFixture<PolicyHub>;
  let component: PolicyHub;
  const seoServiceStub = createServiceStub(['updateSeo']);

  beforeEach(async () => {
    await configureComponentTestBed(
      PolicyHub,
      [
        { provide: SeoService, useValue: seoServiceStub },
      ],
    );
    fixture = TestBed.createComponent(PolicyHub);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
