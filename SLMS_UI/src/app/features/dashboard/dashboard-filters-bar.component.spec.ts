import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardFiltersBarComponent } from './dashboard-filters-bar.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { DashboardFilterService } from './dashboard-filter.service';

describe('DashboardFiltersBarComponent', () => {
  let fixture: ComponentFixture<DashboardFiltersBarComponent>;
  let component: DashboardFiltersBarComponent;
  const dashboardFilterServiceStub = createServiceStub(['period']);

  beforeEach(async () => {
    await configureComponentTestBed(
      DashboardFiltersBarComponent,
      [
        { provide: DashboardFilterService, useValue: dashboardFilterServiceStub },
      ],
    );
    fixture = TestBed.createComponent(DashboardFiltersBarComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call DashboardFilterService.period when periodClass()', () => {
    dashboardFilterServiceStub.period.mockClear();
    invokeComponentMethod(component, 'periodClass', ['00000000-0000-0000-0000-000000000001']);
    expect(dashboardFilterServiceStub.period).toHaveBeenCalled();
  });
});
