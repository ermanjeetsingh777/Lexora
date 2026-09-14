import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnBoardingBranch } from './on-boarding-branch';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('OnBoardingBranch', () => {
  let fixture: ComponentFixture<OnBoardingBranch>;
  let component: OnBoardingBranch;

  beforeEach(async () => {
    await configureComponentTestBed(OnBoardingBranch);
    fixture = TestBed.createComponent(OnBoardingBranch);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
