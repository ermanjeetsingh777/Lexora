import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Policy } from './policy';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { SeoService } from '@core/services/seo.service';

describe('Policy', () => {
  let fixture: ComponentFixture<Policy>;
  let component: Policy;
  const seoServiceStub = createServiceStub(['updateSeo']);

  beforeEach(async () => {
    await configureComponentTestBed(
      Policy,
      [
        { provide: SeoService, useValue: seoServiceStub },
      ],
    );
    fixture = TestBed.createComponent(Policy);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
