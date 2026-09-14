import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NonAuthFooter } from './non-auth-footer';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('NonAuthFooter', () => {
  let fixture: ComponentFixture<NonAuthFooter>;
  let component: NonAuthFooter;

  beforeEach(async () => {
    await configureComponentTestBed(NonAuthFooter);
    fixture = TestBed.createComponent(NonAuthFooter);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
