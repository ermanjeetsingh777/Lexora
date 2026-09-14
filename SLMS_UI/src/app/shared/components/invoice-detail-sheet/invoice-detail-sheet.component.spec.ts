import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvoiceDetailSheetComponent } from './invoice-detail-sheet.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('InvoiceDetailSheetComponent', () => {
  let fixture: ComponentFixture<InvoiceDetailSheetComponent>;
  let component: InvoiceDetailSheetComponent;

  beforeEach(async () => {
    await configureComponentTestBed(InvoiceDetailSheetComponent);
    fixture = TestBed.createComponent(InvoiceDetailSheetComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
