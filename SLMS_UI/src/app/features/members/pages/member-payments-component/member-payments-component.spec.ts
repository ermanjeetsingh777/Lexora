import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberPaymentsComponent } from './member-payments-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { CommonService } from '@core/services/common.service';
import { WhatsAppService } from '@core/services/whatsapp.service';

describe('MemberPaymentsComponent', () => {
  let fixture: ComponentFixture<MemberPaymentsComponent>;
  let component: MemberPaymentsComponent;
  const commonServiceStub = createServiceStub([]);
  const whatsAppServiceStub = createServiceStub(['send']);

  beforeEach(async () => {
    await configureComponentTestBed(
      MemberPaymentsComponent,
      [
        { provide: CommonService, useValue: commonServiceStub },
        { provide: WhatsAppService, useValue: whatsAppServiceStub },
      ],
    );
    fixture = TestBed.createComponent(MemberPaymentsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('memberName', 'Test');
    fixture.componentRef.setInput('institution', null);
    fixture.componentRef.setInput('branch', null);
    fixture.componentRef.setInput('library', null);
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
