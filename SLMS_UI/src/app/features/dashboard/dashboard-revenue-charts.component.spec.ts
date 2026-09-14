import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardRevenueChartsComponent } from './dashboard-revenue-charts.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('DashboardRevenueChartsComponent', () => {
  let fixture: ComponentFixture<DashboardRevenueChartsComponent>;
  let component: DashboardRevenueChartsComponent;

  beforeEach(async () => {
    await configureComponentTestBed(DashboardRevenueChartsComponent);
    fixture = TestBed.createComponent(DashboardRevenueChartsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('charts', []);
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
