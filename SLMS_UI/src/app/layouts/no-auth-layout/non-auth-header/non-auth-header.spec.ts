import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NonAuthHeader } from './non-auth-header';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('NonAuthHeader', () => {
  let fixture: ComponentFixture<NonAuthHeader>;
  let component: NonAuthHeader;

  beforeEach(async () => {
    await configureComponentTestBed(NonAuthHeader);
    fixture = TestBed.createComponent(NonAuthHeader);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
