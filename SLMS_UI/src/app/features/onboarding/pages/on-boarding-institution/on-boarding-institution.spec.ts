import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnBoardingInstitution } from './on-boarding-institution';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('OnBoardingInstitution', () => {
  let fixture: ComponentFixture<OnBoardingInstitution>;
  let component: OnBoardingInstitution;

  beforeEach(async () => {
    await configureComponentTestBed(OnBoardingInstitution);
    fixture = TestBed.createComponent(OnBoardingInstitution);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
