import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Prices } from './prices';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { PackageService } from '@core/services/package.service';
import { AddonService } from '@core/services/addon.service';
import { SeoService } from '@core/services/seo.service';

describe('Prices', () => {
  let fixture: ComponentFixture<Prices>;
  let component: Prices;
  const packageServiceStub = createServiceStub(['getActivePackages']);
  const addonServiceStub = createServiceStub(['getActiveAddons']);
  const seoServiceStub = createServiceStub(['updateSeo']);

  beforeEach(async () => {
    await configureComponentTestBed(
      Prices,
      [
        { provide: PackageService, useValue: packageServiceStub },
        { provide: AddonService, useValue: addonServiceStub },
        { provide: SeoService, useValue: seoServiceStub },
      ],
    );
    fixture = TestBed.createComponent(Prices);
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

  it('should call AddonService.getActiveAddons when loadPackages()', () => {
    addonServiceStub.getActiveAddons.mockClear();
    invokeComponentMethod(component, 'loadPackages');
    expect(addonServiceStub.getActiveAddons).toHaveBeenCalled();
  });
});
