import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PwaInstallBannerComponent } from './pwa-install-banner.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('PwaInstallBannerComponent', () => {
  let fixture: ComponentFixture<PwaInstallBannerComponent>;
  let component: PwaInstallBannerComponent;

  beforeEach(async () => {
    await configureComponentTestBed(PwaInstallBannerComponent);
    fixture = TestBed.createComponent(PwaInstallBannerComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
