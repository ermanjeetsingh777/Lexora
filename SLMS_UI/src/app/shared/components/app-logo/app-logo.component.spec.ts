import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppLogoComponent } from './app-logo.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('AppLogoComponent', () => {
  let fixture: ComponentFixture<AppLogoComponent>;
  let component: AppLogoComponent;

  beforeEach(async () => {
    await configureComponentTestBed(AppLogoComponent);
    fixture = TestBed.createComponent(AppLogoComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
