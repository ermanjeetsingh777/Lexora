import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppIconComponent } from './app-icon.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('AppIconComponent', () => {
  let fixture: ComponentFixture<AppIconComponent>;
  let component: AppIconComponent;

  beforeEach(async () => {
    await configureComponentTestBed(AppIconComponent);
    fixture = TestBed.createComponent(AppIconComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'Test');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
