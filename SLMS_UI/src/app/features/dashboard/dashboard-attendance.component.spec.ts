import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardAttendanceComponent } from './dashboard-attendance.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { DashboardService } from '@core/services/dashboard.service';
import { DashboardFilterService } from './dashboard-filter.service';

describe('DashboardAttendanceComponent', () => {
  let fixture: ComponentFixture<DashboardAttendanceComponent>;
  let component: DashboardAttendanceComponent;
  const dashboardServiceStub = createServiceStub(['getOverview']);
  const dashboardFilterServiceStub = createServiceStub(['query']);

  beforeEach(async () => {
    await configureComponentTestBed(
      DashboardAttendanceComponent,
      [
        { provide: DashboardService, useValue: dashboardServiceStub },
        { provide: DashboardFilterService, useValue: dashboardFilterServiceStub },
      ],
    );
    fixture = TestBed.createComponent(DashboardAttendanceComponent);
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
