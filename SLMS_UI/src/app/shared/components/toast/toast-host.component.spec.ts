import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastHostComponent } from './toast-host.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('ToastHostComponent', () => {
  let fixture: ComponentFixture<ToastHostComponent>;
  let component: ToastHostComponent;

  beforeEach(async () => {
    await configureComponentTestBed(ToastHostComponent);
    fixture = TestBed.createComponent(ToastHostComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
