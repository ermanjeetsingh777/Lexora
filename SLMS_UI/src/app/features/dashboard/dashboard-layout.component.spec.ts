import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('DashboardLayoutComponent', () => {
  let fixture: ComponentFixture<DashboardLayoutComponent>;
  let component: DashboardLayoutComponent;

  beforeEach(async () => {
    await configureComponentTestBed(DashboardLayoutComponent);
    fixture = TestBed.createComponent(DashboardLayoutComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
