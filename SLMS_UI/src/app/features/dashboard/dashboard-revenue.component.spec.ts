import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardRevenueComponent } from './dashboard-revenue.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { DashboardService } from '@core/services/dashboard.service';
import { DashboardFilterService } from './dashboard-filter.service';

describe('DashboardRevenueComponent', () => {
  let fixture: ComponentFixture<DashboardRevenueComponent>;
  let component: DashboardRevenueComponent;
  const dashboardServiceStub = createServiceStub(['getRevenue']);
  const dashboardFilterServiceStub = createServiceStub(['query']);

  beforeEach(async () => {
    await configureComponentTestBed(
      DashboardRevenueComponent,
      [
        { provide: DashboardService, useValue: dashboardServiceStub },
        { provide: DashboardFilterService, useValue: dashboardFilterServiceStub },
      ],
    );
    fixture = TestBed.createComponent(DashboardRevenueComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call DashboardFilterService.query on init', () => {
    expect(dashboardFilterServiceStub.query).toHaveBeenCalled();
  });

  it('should call DashboardService.getRevenue when load()', () => {
    dashboardServiceStub.getRevenue.mockClear();
    invokeComponentMethod(component, 'load');
    expect(dashboardServiceStub.getRevenue).toHaveBeenCalled();
  });

  it('should call DashboardFilterService.query when load()', () => {
    dashboardFilterServiceStub.query.mockClear();
    invokeComponentMethod(component, 'load');
    expect(dashboardFilterServiceStub.query).toHaveBeenCalled();
  });
});
