import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnauthorizedComponent } from './unauthorized.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('UnauthorizedComponent', () => {
  let fixture: ComponentFixture<UnauthorizedComponent>;
  let component: UnauthorizedComponent;

  beforeEach(async () => {
    await configureComponentTestBed(UnauthorizedComponent);
    fixture = TestBed.createComponent(UnauthorizedComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
