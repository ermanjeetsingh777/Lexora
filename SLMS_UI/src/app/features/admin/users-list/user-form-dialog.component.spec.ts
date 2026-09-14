import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserFormDialogComponent } from './user-form-dialog.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('UserFormDialogComponent', () => {
  let fixture: ComponentFixture<UserFormDialogComponent>;
  let component: UserFormDialogComponent;

  beforeEach(async () => {
    await configureComponentTestBed(UserFormDialogComponent);
    fixture = TestBed.createComponent(UserFormDialogComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
