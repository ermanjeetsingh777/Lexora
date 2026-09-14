import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardActivityFeedComponent } from './dashboard-activity-feed.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('DashboardActivityFeedComponent', () => {
  let fixture: ComponentFixture<DashboardActivityFeedComponent>;
  let component: DashboardActivityFeedComponent;

  beforeEach(async () => {
    await configureComponentTestBed(DashboardActivityFeedComponent);
    fixture = TestBed.createComponent(DashboardActivityFeedComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('activities', []);
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
