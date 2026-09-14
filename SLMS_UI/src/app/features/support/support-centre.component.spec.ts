import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportCentreComponent } from './support-centre.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { SupportService } from './support.service';

describe('SupportCentreComponent', () => {
  let fixture: ComponentFixture<SupportCentreComponent>;
  let component: SupportCentreComponent;
  const supportServiceStub = createServiceStub(['addMessage', 'createTicket', 'downloadAttachment', 'getArticle', 'getContext', 'getStatus', 'getTicket', 'getTickets', 'searchArticles', 'updateStatus', 'uploadAttachment']);

  beforeEach(async () => {
    await configureComponentTestBed(
      SupportCentreComponent,
      [
        { provide: SupportService, useValue: supportServiceStub },
      ],
    );
    fixture = TestBed.createComponent(SupportCentreComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
