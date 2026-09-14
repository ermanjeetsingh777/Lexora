import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberContactComponent } from './member-contact-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('MemberContactComponent', () => {
  let fixture: ComponentFixture<MemberContactComponent>;
  let component: MemberContactComponent;

  beforeEach(async () => {
    await configureComponentTestBed(MemberContactComponent);
    fixture = TestBed.createComponent(MemberContactComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
