import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryPlanFormDialogComponent } from './library-plan-form-dialog.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('LibraryPlanFormDialogComponent', () => {
  let fixture: ComponentFixture<LibraryPlanFormDialogComponent>;
  let component: LibraryPlanFormDialogComponent;

  beforeEach(async () => {
    await configureComponentTestBed(LibraryPlanFormDialogComponent);
    fixture = TestBed.createComponent(LibraryPlanFormDialogComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
