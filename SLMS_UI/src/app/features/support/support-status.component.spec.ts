import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportStatusComponent } from './support-status.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { SupportService } from './support.service';

describe('SupportStatusComponent', () => {
  let fixture: ComponentFixture<SupportStatusComponent>;
  let component: SupportStatusComponent;
  const supportServiceStub = createServiceStub(['getStatus', 'simulateIncident']);

  beforeEach(async () => {
    await configureComponentTestBed(
      SupportStatusComponent,
      [
        { provide: SupportService, useValue: supportServiceStub },
      ],
    );
    fixture = TestBed.createComponent(SupportStatusComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
