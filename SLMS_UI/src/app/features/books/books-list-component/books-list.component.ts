import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideAlertTriangle, LucideArrowDownToLine, LucideArrowUpFromLine, LucideBookOpen, LucideChevronRight,
  LucideDownload, LucideFileText, LucideLayoutGrid, LucideLibrary, LucideList, LucideMinus, LucidePackageX, LucidePencil,
  LucidePlus, LucideSearch, LucideWrench, LucideX,
} from '@lucide/angular';
import { ToastService } from '@core/services/toast.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import {
  BOOK_STATUS_LABELS, BookDetail, BookListItem, BookStats, BookStockStatus, LibraryScope,
} from '@core/models/book.models';
import { MemberListResponse } from '@core/models/MemberRequest';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { MemberService } from '@features/members/MemberService';
import { SidebarService } from '../../../layouts/sidebar/sidebar.service';
import {
  bookCoverHue, bookInitials, bookStatusVariant, formatBookDate,
} from '../book-format.util';
import { BookService } from '../book.service';
import { BookFormDialogComponent, BookFormPayload } from '../components/book-form-dialog/book-form-dialog.component';

type ViewMode = 'table' | 'grid';
type SortKey = 'title' | 'author' | 'available' | 'category';
type DrawerTab = 'activity' | 'stock' | 'audit';

@Component({
  selector: 'app-books-list',
  imports: [
    DecimalPipe, FormsModule,
    ButtonComponent, PageHeaderComponent, GlassCardComponent, StatusBadgeComponent, KpiCardComponent,
    BookFormDialogComponent,
    LucideBookOpen, LucidePlus, LucideSearch, LucideLayoutGrid, LucideList, LucideDownload,
    LucideLibrary, LucideAlertTriangle, LucidePackageX, LucideChevronRight, LucidePencil, LucideX, LucideFileText,
    LucideMinus, LucideWrench, LucideArrowDownToLine, LucideArrowUpFromLine,
  ],
  providers: [BookService, InstitutionsService, MemberService],
  templateUrl: './books-list.component.html',
  styleUrl: './books-list.component.css',
})
export class BooksListComponent implements OnInit {
  private readonly bookService = inject(BookService);
  private readonly institutionsService = inject(InstitutionsService);
  private readonly memberService = inject(MemberService);
  private readonly toast = inject(ToastService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly sidebar = inject(SidebarService);

  readonly BookStockStatus = BookStockStatus;
  readonly BOOK_STATUS_LABELS = BOOK_STATUS_LABELS;
  readonly bookStatusVariant = bookStatusVariant;
  readonly bookCoverHue = bookCoverHue;
  readonly bookInitials = bookInitials;
  readonly formatBookDate = formatBookDate;

  readonly loading = signal(true);
  readonly books = signal<BookListItem[]>([]);
  readonly stats = signal<BookStats | null>(null);
  readonly scope = signal<LibraryScope | null>(null);
  readonly libraryLabel = signal('Library');

  readonly query = signal('');
  readonly category = signal('all');
  readonly status = signal<'all' | BookStockStatus>('all');
  readonly sort = signal<SortKey>('title');
  readonly view = signal<ViewMode>('table');

  readonly showForm = signal(false);
  readonly editBook = signal<BookDetail | null>(null);
  readonly formBusy = signal(false);

  readonly drawerOpen = signal(false);
  readonly selectedBook = signal<BookDetail | null>(null);
  readonly drawerTab = signal<DrawerTab>('activity');
  readonly drawerBusy = signal(false);
  readonly stockDelta = signal(1);
  readonly stockNote = signal('');

  readonly showCheckout = signal(false);
  readonly checkoutMemberId = signal('');
  readonly checkoutLoanDays = signal(14);
  readonly members = signal<MemberListResponse[]>([]);

  readonly categories = computed(() => Array.from(new Set(this.books().map(b => b.category))).sort());

  readonly filteredBooks = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    const status = this.status();
    const sort = this.sort();
    return [...this.books()]
      .filter(b => {
        if (cat !== 'all' && b.category !== cat) return false;
        if (status !== 'all' && b.status !== status) return false;
        if (!q) return true;
        return b.title.toLowerCase().includes(q)
          || b.author.toLowerCase().includes(q)
          || b.isbn.includes(q);
      })
      .sort((a, b) => {
        if (sort === 'available') return b.availableCopies - a.availableCopies;
        return String(a[sort]).localeCompare(String(b[sort]));
      });
  });

  readonly existingIsbns = computed(() => this.books().map(b => b.isbn));

  readonly overlayLeft = computed(() => {
    if (this.sidebar.isMobile()) return '0';
    if (this.sidebar.isTablet()) return '4rem';
    return this.sidebar.collapsed() ? '4rem' : '16rem';
  });

  readonly activeLoans = computed(() =>
    (this.selectedBook()?.activities ?? []).filter(a => a.type === 'borrow')
  );

  ngOnInit(): void {
    this.institutionsService.getInstitutionBranchForDropdown()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const inst = res.data?.[0];
          const branch = inst?.branches?.[0];
          const library = branch?.libraries?.[0];
          if (!inst || !branch || !library) {
            this.loading.set(false);
            this.toast.error('No library found. Complete onboarding first.');
            return;
          }
          this.scope.set({
            institutionId: inst.value,
            branchId: branch.value,
            libraryId: library.value,
          });
          this.libraryLabel.set(library.key);
          this.refresh();
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Failed to load library context');
        },
      });

    this.memberService.getAllMembers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.members.set(res.data ?? []),
        error: () => this.members.set([]),
      });
  }

  refresh(): void {
    const scope = this.scope();
    if (!scope) return;
    this.loading.set(true);
    this.bookService.getBooks(scope).subscribe({
      next: (res) => {
        this.books.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.books.set([]);
        this.loading.set(false);
        this.toast.error('Failed to load books');
      },
    });
    this.bookService.getStats(scope).subscribe({
      next: (res) => this.stats.set(res.data ?? null),
    });
  }

  openCreate(): void {
    this.editBook.set(null);
    this.showForm.set(true);
  }

  openEdit(book: BookDetail): void {
    this.closeDrawer();
    this.editBook.set(book);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editBook.set(null);
  }

  onBookSubmitted(payload: BookFormPayload): void {
    const scope = this.scope();
    if (!scope) return;
    this.formBusy.set(true);
    const edit = this.editBook();
    const { pdfFile, ...bookPayload } = payload;
    const req$ = edit
      ? this.bookService.updateBook(scope, edit.id, bookPayload)
      : this.bookService.createBook(scope, bookPayload);
    req$.subscribe({
      next: (res) => {
        const bookId = res.data?.id;
        if (bookId && pdfFile) {
          this.bookService.uploadPdf(scope, bookId, pdfFile).subscribe({
            next: (pdfRes) => this.finishBookSave(edit, pdfRes.data ?? res.data ?? null),
            error: () => {
              this.finishBookSave(edit, res.data ?? null);
              this.toast.error('Book saved but PDF upload failed.');
            },
          });
          return;
        }
        this.finishBookSave(edit, res.data ?? null);
      },
      error: (err) => {
        this.formBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to save book');
      },
    });
  }

  private finishBookSave(edit: BookDetail | null, book: BookDetail | null): void {
    this.formBusy.set(false);
    this.showForm.set(false);
    this.editBook.set(null);
    this.toast.success(edit ? 'Book updated' : 'Book added');
    if (book && this.selectedBook()?.id === book.id) {
      this.selectedBook.set(book);
    }
    this.refresh();
  }

  viewPdf(book: BookDetail | BookListItem): void {
    const scope = this.scope();
    if (!scope || !book.hasPdf) return;
    this.bookService.downloadPdf(scope, book.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toast.error('Failed to open PDF'),
    });
  }

  onDrawerPdfSelected(event: Event): void {
    const scope = this.scope();
    const book = this.selectedBook();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!scope || !book || !file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.toast.error('Please select a PDF file.');
      input.value = '';
      return;
    }

    this.drawerBusy.set(true);
    this.bookService.uploadPdf(scope, book.id, file).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        this.selectedBook.set(res.data ?? book);
        this.toast.success('PDF uploaded');
        this.refresh();
        input.value = '';
      },
      error: (err) => {
        this.drawerBusy.set(false);
        input.value = '';
        this.toast.error(err?.error?.message ?? 'Failed to upload PDF');
      },
    });
  }

  removePdf(): void {
    const scope = this.scope();
    const book = this.selectedBook();
    if (!scope || !book?.hasPdf) return;
    this.drawerBusy.set(true);
    this.bookService.removePdf(scope, book.id).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        this.selectedBook.set(res.data ?? book);
        this.toast.success('PDF removed');
        this.refresh();
      },
      error: (err) => {
        this.drawerBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to remove PDF');
      },
    });
  }

  openDrawer(book: BookListItem): void {
    const scope = this.scope();
    if (!scope) return;
    this.bookService.getBook(scope, book.id).subscribe({
      next: (res) => {
        this.selectedBook.set(res.data ?? null);
        this.drawerOpen.set(true);
        this.drawerTab.set('activity');
      },
      error: () => this.toast.error('Failed to load book details'),
    });
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedBook.set(null);
    this.showCheckout.set(false);
  }

  adjustStock(delta: number): void {
    const scope = this.scope();
    const book = this.selectedBook();
    if (!scope || !book) return;
    this.drawerBusy.set(true);
    this.bookService.adjustStock(scope, book.id, delta, this.stockNote() || undefined).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        this.selectedBook.set(res.data ?? book);
        this.stockNote.set('');
        this.toast.success(`Adjusted available by ${delta > 0 ? '+' : ''}${delta}`);
        this.refresh();
      },
      error: (err) => {
        this.drawerBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to adjust stock');
      },
    });
  }

  markCondition(kind: 'damaged' | 'lost'): void {
    const scope = this.scope();
    const book = this.selectedBook();
    if (!scope || !book) return;
    this.drawerBusy.set(true);
    this.bookService.markCondition(scope, book.id, kind).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        this.selectedBook.set(res.data ?? book);
        this.toast.success(`Marked 1 copy as ${kind}`);
        this.refresh();
      },
      error: (err) => {
        this.drawerBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to update stock');
      },
    });
  }

  checkout(): void {
    const scope = this.scope();
    const book = this.selectedBook();
    const memberId = this.checkoutMemberId();
    if (!scope || !book || !memberId) {
      this.toast.error('Select a member to issue the book.');
      return;
    }
    this.drawerBusy.set(true);
    const loanDays = this.checkoutLoanDays();
    this.bookService.checkout(scope, book.id, memberId, loanDays).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        this.selectedBook.set(res.data ?? book);
        this.showCheckout.set(false);
        this.checkoutMemberId.set('');
        this.checkoutLoanDays.set(14);
        this.toast.success(`Copy issued for ${loanDays} day(s)`);
        this.refresh();
      },
      error: (err) => {
        this.drawerBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to issue copy');
      },
    });
  }

  returnLoan(activityId: string): void {
    const scope = this.scope();
    const book = this.selectedBook();
    if (!scope || !book) return;
    this.drawerBusy.set(true);
    this.bookService.returnLoan(scope, book.id, activityId).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        this.selectedBook.set(res.data?.book ?? book);
        this.toast.success(res.message ?? 'Copy returned');
        this.refresh();
      },
      error: (err) => {
        this.drawerBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to return copy');
      },
    });
  }

  sendReturnReminder(activityId: string): void {
    const scope = this.scope();
    const book = this.selectedBook();
    if (!scope || !book) return;
    this.drawerBusy.set(true);
    this.bookService.sendReturnReminder(scope, book.id, activityId).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        const reminder = res.data;
        if (!reminder) {
          this.toast.success('Return reminder logged.');
          return;
        }
        this.toast.success('Return reminder sent.');
        if (reminder.memberPhone) {
          this.whatsapp.bookReturnReminder(
            reminder.memberPhone,
            reminder.memberName,
            reminder.bookTitle,
            this.formatBookDate(reminder.dueAtUtc),
            reminder.daysOverdue,
            reminder.estimatedFine,
            this.libraryLabel(),
          );
        }
        this.refresh();
      },
      error: (err) => {
        this.drawerBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to send reminder');
      },
    });
  }

  exportCsv(): void {
    const rows = this.filteredBooks();
    const out = [
      ['Title', 'Author', 'Category', 'ISBN', 'Available', 'Copies', 'Status'],
      ...rows.map(b => [b.title, b.author, b.category, b.isbn, b.availableCopies, b.totalCopies, BOOK_STATUS_LABELS[b.status]]),
    ];
    const csv = out.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success(`Exported ${rows.length} books`);
  }

  availabilityPercent(book: BookListItem): number {
    if (!book.totalCopies) return 0;
    return Math.round((book.availableCopies / book.totalCopies) * 100);
  }
}
