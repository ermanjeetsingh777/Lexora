import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BooksListComponent } from './books-list.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { BookService } from '../book.service';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { MemberService } from '@features/members/MemberService';
import { AuthService } from '@core/services/auth.service';
import { WhatsAppService } from '@core/services/whatsapp.service';

describe('BooksListComponent', () => {
  let fixture: ComponentFixture<BooksListComponent>;
  let component: BooksListComponent;
  const bookServiceStub = createServiceStub(['adjustStock', 'checkout', 'createBook', 'downloadPdf', 'getBook', 'getBooks', 'markCondition', 'removePdf', 'returnLoan', 'sendReturnReminder', 'updateBook', 'uploadPdf']);
  const institutionsServiceStub = createServiceStub(['getInstitutionBranchForDropdown']);
  const memberServiceStub = createServiceStub(['getAllMembers']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);
  const whatsAppServiceStub = createServiceStub(['bookReturnReminder']);

  beforeEach(async () => {
    await configureComponentTestBed(
      BooksListComponent,
      [
        { provide: BookService, useValue: bookServiceStub },
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: MemberService, useValue: memberServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: WhatsAppService, useValue: whatsAppServiceStub },
      ],
    );
    fixture = TestBed.createComponent(BooksListComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
