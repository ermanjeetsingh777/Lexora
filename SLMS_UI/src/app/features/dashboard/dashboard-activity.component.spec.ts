import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardActivityComponent } from './dashboard-activity.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { DashboardService } from '@core/services/dashboard.service';

describe('DashboardActivityComponent', () => {
  let fixture: ComponentFixture<DashboardActivityComponent>;
  let component: DashboardActivityComponent;
  const dashboardServiceStub = createServiceStub(['getActivity']);

  beforeEach(async () => {
    await configureComponentTestBed(
      DashboardActivityComponent,
      [
        { provide: DashboardService, useValue: dashboardServiceStub },
      ],
    );
    fixture = TestBed.createComponent(DashboardActivityComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call DashboardService.getActivity when load()', () => {
    dashboardServiceStub.getActivity.mockClear();
    invokeComponentMethod(component, 'load');
    expect(dashboardServiceStub.getActivity).toHaveBeenCalled();
  });
});
