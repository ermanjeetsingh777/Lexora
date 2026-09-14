import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TermOfService } from './term-of-service';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { SeoService } from '@core/services/seo.service';

describe('TermOfService', () => {
  let fixture: ComponentFixture<TermOfService>;
  let component: TermOfService;
  const seoServiceStub = createServiceStub(['updateSeo']);

  beforeEach(async () => {
    await configureComponentTestBed(
      TermOfService,
      [
        { provide: SeoService, useValue: seoServiceStub },
      ],
    );
    fixture = TestBed.createComponent(TermOfService);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
