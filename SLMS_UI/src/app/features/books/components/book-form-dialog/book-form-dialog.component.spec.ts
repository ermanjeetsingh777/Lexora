import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookFormDialogComponent } from './book-form-dialog.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { BookService } from '../../book.service';

describe('BookFormDialogComponent', () => {
  let fixture: ComponentFixture<BookFormDialogComponent>;
  let component: BookFormDialogComponent;
  const institutionsServiceStub = createServiceStub(['getInstitutionBranchForDropdown']);
  const bookServiceStub = createServiceStub(['getBooks']);

  beforeEach(async () => {
    await configureComponentTestBed(
      BookFormDialogComponent,
      [
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: BookService, useValue: bookServiceStub },
      ],
    );
    fixture = TestBed.createComponent(BookFormDialogComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
