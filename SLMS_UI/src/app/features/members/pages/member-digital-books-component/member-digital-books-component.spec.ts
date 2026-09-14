import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberDigitalBooksComponent } from './member-digital-books-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { BookService } from '@features/books/book.service';

describe('MemberDigitalBooksComponent', () => {
  let fixture: ComponentFixture<MemberDigitalBooksComponent>;
  let component: MemberDigitalBooksComponent;
  const bookServiceStub = createServiceStub(['downloadMemberDigitalPdf', 'getMemberDigitalBooks']);

  beforeEach(async () => {
    await configureComponentTestBed(
      MemberDigitalBooksComponent,
      [
        { provide: BookService, useValue: bookServiceStub },
      ],
    );
    fixture = TestBed.createComponent(MemberDigitalBooksComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('memberId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
