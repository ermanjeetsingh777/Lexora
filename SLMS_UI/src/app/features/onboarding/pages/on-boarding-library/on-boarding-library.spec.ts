import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnBoardingLibrary } from './on-boarding-library';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('OnBoardingLibrary', () => {
  let fixture: ComponentFixture<OnBoardingLibrary>;
  let component: OnBoardingLibrary;

  beforeEach(async () => {
    await configureComponentTestBed(OnBoardingLibrary);
    fixture = TestBed.createComponent(OnBoardingLibrary);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
