import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrCameraScannerModalComponent } from './qr-camera-scanner-modal.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('QrCameraScannerModalComponent', () => {
  let fixture: ComponentFixture<QrCameraScannerModalComponent>;
  let component: QrCameraScannerModalComponent;

  beforeEach(async () => {
    await configureComponentTestBed(QrCameraScannerModalComponent);
    fixture = TestBed.createComponent(QrCameraScannerModalComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
