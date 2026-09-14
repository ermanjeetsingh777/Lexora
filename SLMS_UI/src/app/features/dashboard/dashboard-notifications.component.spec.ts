import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardNotificationsComponent } from './dashboard-notifications.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { DashboardService } from '@core/services/dashboard.service';
import { DashboardFilterService } from './dashboard-filter.service';

describe('DashboardNotificationsComponent', () => {
  let fixture: ComponentFixture<DashboardNotificationsComponent>;
  let component: DashboardNotificationsComponent;
  const dashboardServiceStub = createServiceStub(['getOverview']);
  const dashboardFilterServiceStub = createServiceStub(['query']);

  beforeEach(async () => {
    await configureComponentTestBed(
      DashboardNotificationsComponent,
      [
        { provide: DashboardService, useValue: dashboardServiceStub },
        { provide: DashboardFilterService, useValue: dashboardFilterServiceStub },
      ],
    );
    fixture = TestBed.createComponent(DashboardNotificationsComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call DashboardFilterService.query on init', () => {
    expect(dashboardFilterServiceStub.query).toHaveBeenCalled();
  });

  it('should call DashboardService.getOverview when load()', () => {
    dashboardServiceStub.getOverview.mockClear();
    invokeComponentMethod(component, 'load');
    expect(dashboardServiceStub.getOverview).toHaveBeenCalled();
  });

  it('should call DashboardFilterService.query when load()', () => {
    dashboardFilterServiceStub.query.mockClear();
    invokeComponentMethod(component, 'load');
    expect(dashboardFilterServiceStub.query).toHaveBeenCalled();
  });
});
