import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoAuthLayout } from './no-auth-layout';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('NoAuthLayout', () => {
  let fixture: ComponentFixture<NoAuthLayout>;
  let component: NoAuthLayout;

  beforeEach(async () => {
    await configureComponentTestBed(NoAuthLayout);
    fixture = TestBed.createComponent(NoAuthLayout);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
