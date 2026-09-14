import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiCardComponent } from './kpi-card.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('KpiCardComponent', () => {
  let fixture: ComponentFixture<KpiCardComponent>;
  let component: KpiCardComponent;

  beforeEach(async () => {
    await configureComponentTestBed(KpiCardComponent);
    fixture = TestBed.createComponent(KpiCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('value', null);
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
