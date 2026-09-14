import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewTicketDialogComponent } from './new-ticket-dialog.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { SupportService } from '../../support.service';

describe('NewTicketDialogComponent', () => {
  let fixture: ComponentFixture<NewTicketDialogComponent>;
  let component: NewTicketDialogComponent;
  const supportServiceStub = createServiceStub(['uploadAttachment']);

  beforeEach(async () => {
    await configureComponentTestBed(
      NewTicketDialogComponent,
      [
        { provide: SupportService, useValue: supportServiceStub },
      ],
    );
    fixture = TestBed.createComponent(NewTicketDialogComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
