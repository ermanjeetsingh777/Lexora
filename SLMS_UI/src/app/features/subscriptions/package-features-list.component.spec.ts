import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PackageFeaturesListComponent } from './package-features-list.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('PackageFeaturesListComponent', () => {
  let fixture: ComponentFixture<PackageFeaturesListComponent>;
  let component: PackageFeaturesListComponent;

  beforeEach(async () => {
    await configureComponentTestBed(PackageFeaturesListComponent);
    fixture = TestBed.createComponent(PackageFeaturesListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('features', []);
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
