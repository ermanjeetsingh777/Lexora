import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Feature } from './feature';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { SeoService } from '@core/services/seo.service';

describe('Feature', () => {
  let fixture: ComponentFixture<Feature>;
  let component: Feature;
  const seoServiceStub = createServiceStub(['updateSeo']);

  beforeEach(async () => {
    await configureComponentTestBed(
      Feature,
      [
        { provide: SeoService, useValue: seoServiceStub },
      ],
    );
    fixture = TestBed.createComponent(Feature);
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
});
