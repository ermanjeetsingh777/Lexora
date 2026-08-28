import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideAlertTriangle, LucideArrowDownToLine, LucideArrowUpFromLine, LucideBookOpen, LucideChevronRight,
  LucideDownload, LucideFileText, LucideLayoutGrid, LucideLibrary, LucideList, LucideMinus, LucidePackageX, LucidePencil,
  LucidePlus, LucideSearch, LucideWrench, LucideX, LucideChevronLeft, LucideChevronsLeft, LucideChevronsRight,
} from '@lucide/angular';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import {
  BOOK_STATUS_LABELS, BookDetail, BookStockStatus, LibraryScope,
} from '@core/models/book.models';
import { MemberListResponse } from '@core/models/MemberRequest';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { MemberService } from '@features/members/MemberService';
import { AuthService } from '@core/services/auth.service';
import { PermissionKey } from '@core/constants/permissions';
import { SidebarService } from '../../../layouts/sidebar/sidebar.service';
import {
  bookCoverHue, bookInitials, bookStatusVariant, formatBookDate,
} from '../book-format.util';
import { BookService } from '../book.service';
import { BookFormDialogComponent, BookFormPayload } from '../components/book-form-dialog/book-form-dialog.component';
import { InstitutionDropdownResponse, BranchDropdownResponse, LibraryDropdownResponse } from '@core/models/institution-dropdown.model';
import {
  branchesForInstitution,
  computeBookStats,
  librariesForBranch,
  libraryScopeLabels,
  listMappedLibraries,
  resolveDefaultLibraryScope,
  ScopedBookListItem,
} from '../library-scope.util';

type ViewMode = 'table' | 'grid';
type SortKey = 'newest' | 'title' | 'author' | 'available' | 'category';
type DrawerTab = 'activity' | 'stock' | 'audit';

const PAGE_SIZE_OPTS = [10, 25, 50, 100] as const;

@Component({
  selector: 'app-books-list',
  imports: [
    DecimalPipe, FormsModule,
    ButtonComponent, PageHeaderComponent, GlassCardComponent, StatusBadgeComponent, KpiCardComponent,
    BookFormDialogComponent,
    LucideBookOpen, LucidePlus, LucideSearch, LucideLayoutGrid, LucideList, LucideDownload,
    LucideLibrary, LucideAlertTriangle, LucidePackageX, LucideChevronRight, LucidePencil, LucideX, LucideFileText,
    LucideMinus, LucideWrench, LucideArrowDownToLine, LucideArrowUpFromLine,
    LucideChevronLeft, LucideChevronRight, LucideChevronsLeft, LucideChevronsRight,
  ],
  providers: [BookService, InstitutionsService, MemberService],
  templateUrl: './books-list.component.html',
  styleUrl: './books-list.component.css',
})
export class BooksListComponent implements OnInit {
  private readonly bookService = inject(BookService);
  private readonly institutionsService = inject(InstitutionsService);
  private readonly memberService = inject(MemberService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly sidebar = inject(SidebarService);

  readonly canCreate = computed(() => this.auth.hasPermission(PermissionKey.BooksCreate));
  readonly canUpdate = computed(() => this.auth.hasPermission(PermissionKey.BooksUpdate));

  readonly BookStockStatus = BookStockStatus;
  readonly BOOK_STATUS_LABELS = BOOK_STATUS_LABELS;
  readonly bookStatusVariant = bookStatusVariant;
  readonly bookCoverHue = bookCoverHue;
  readonly bookInitials = bookInitials;
  readonly formatBookDate = formatBookDate;
  readonly Math = Math;
  readonly PAGE_SIZE_OPTS = PAGE_SIZE_OPTS;

  readonly loading = signal(true);
  readonly allBooks = signal<ScopedBookListItem[]>([]);
  readonly institutions = signal<InstitutionDropdownResponse[]>([]);

  readonly filterInstitutionId = signal('');
  readonly filterBranchId = signal('');
  readonly filterLibraryId = signal('');

  readonly query = signal('');
  readonly category = signal('all');
  readonly status = signal<'all' | BookStockStatus>('all');
  readonly sort = signal<SortKey>('newest');
  readonly view = signal<ViewMode>('table');
  readonly page = signal(1);
  readonly pageSize = signal(25);

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

  readonly filterBranches = computed(() => {
    const institutionId = this.filterInstitutionId();
    if (!institutionId) return [];
    return branchesForInstitution(this.institutions(), institutionId);
  });

  readonly filterLibraries = computed(() => {
    const institutionId = this.filterInstitutionId();
    const branchId = this.filterBranchId();
    if (!institutionId || !branchId) return [];
    return librariesForBranch(this.institutions(), institutionId, branchId);
  });

  readonly branchFilterDisabled = computed(() => !this.filterInstitutionId());
  readonly libraryFilterDisabled = computed(() => !this.filterBranchId());

  readonly scopeFilteredBooks = computed(() => {
    const institutionId = this.filterInstitutionId();
    const branchId = this.filterBranchId();
    const libraryId = this.filterLibraryId();

    return this.allBooks().filter(book => {
      if (institutionId && book.institutionId !== institutionId) return false;
      if (branchId && book.branchId !== branchId) return false;
      if (libraryId && book.libraryId !== libraryId) return false;
      return true;
    });
  });

  readonly categories = computed(() =>
    Array.from(new Set(this.scopeFilteredBooks().map(b => b.category))).sort()
  );

  readonly filteredBooks = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    const status = this.status();
    const sort = this.sort();
    return [...this.scopeFilteredBooks()]
      .filter(b => {
        if (cat !== 'all' && b.category !== cat) return false;
        if (status !== 'all' && b.status !== status) return false;
        if (!q) return true;
        return b.title.toLowerCase().includes(q)
          || b.author.toLowerCase().includes(q)
          || b.isbn.includes(q);
      })
      .sort((a, b) => {
        if (sort === 'newest') {
          return new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime();
        }
        if (sort === 'available') return b.availableCopies - a.availableCopies;
        return String(a[sort]).localeCompare(String(b[sort]));
      });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredBooks().length / this.pageSize())));
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageStart = computed(() => (this.currentPage() - 1) * this.pageSize());
  readonly pagedBooks = computed(() => {
    const start = this.pageStart();
    return this.filteredBooks().slice(start, start + this.pageSize());
  });

  readonly displayStats = computed(() => computeBookStats(this.scopeFilteredBooks()));

  readonly pageDescription = computed(() => {
    const institutionId = this.filterInstitutionId();
    const branchId = this.filterBranchId();
    const libraryId = this.filterLibraryId();

    if (!institutionId) return 'All books across your mapped libraries.';
    if (!branchId) {
      const name = this.institutions().find(i => i.value === institutionId)?.key ?? 'institution';
      return `Books in ${name}.`;
    }
    if (!libraryId) {
      const branch = this.filterBranches().find(b => b.value === branchId)?.key ?? 'branch';
      return `Books in ${branch}.`;
    }

    const labels = libraryScopeLabels(this.institutions(), {
      institutionId,
      branchId,
      libraryId,
    });
    return `Books in ${labels.libraryName}.`;
  });

  readonly showLibraryColumn = computed(() => !this.filterLibraryId());

  readonly formDefaultScope = computed((): LibraryScope | null => {
    const institutionId = this.filterInstitutionId();
    const branchId = this.filterBranchId();
    const libraryId = this.filterLibraryId();
    if (institutionId && branchId && libraryId) {
      return { institutionId, branchId, libraryId };
    }
    return resolveDefaultLibraryScope(this.institutions())?.scope ?? null;
  });

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
          const data = res.data ?? [];
          this.institutions.set(data);

          if (!listMappedLibraries(data).length) {
            this.loading.set(false);
            this.toast.error('No library mapping found for your account.');
            return;
          }

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
    const mappedLibraries = listMappedLibraries(this.institutions());
    if (!mappedLibraries.length) {
      this.allBooks.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    forkJoin(
      mappedLibraries.map(entry =>
        this.bookService.getBooks(entry.scope).pipe(
          map(res => (res.data ?? []).map(book => ({
            ...book,
            institutionId: entry.scope.institutionId,
            branchId: entry.scope.branchId,
            libraryId: entry.scope.libraryId,
            institutionName: entry.institutionName,
            branchName: entry.branchName,
            libraryName: entry.libraryName,
          } satisfies ScopedBookListItem))),
          catchError(() => of([] as ScopedBookListItem[])),
        )
      )
    ).subscribe({
      next: (results) => {
        this.allBooks.set(results.flat());
        this.loading.set(false);
      },
      error: () => {
        this.allBooks.set([]);
        this.loading.set(false);
        this.toast.error('Failed to load books');
      },
    });
  }

  onFilterInstitutionChange(institutionId: string): void {
    this.filterInstitutionId.set(institutionId);
    this.filterBranchId.set('');
    this.filterLibraryId.set('');
    this.resetPage();
  }

  onFilterBranchChange(branchId: string): void {
    this.filterBranchId.set(branchId);
    this.filterLibraryId.set('');
    this.resetPage();
  }

  onFilterLibraryChange(libraryId: string): void {
    this.filterLibraryId.set(libraryId);
    this.resetPage();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.resetPage();
  }

  onCategoryChange(value: string): void {
    this.category.set(value);
    this.resetPage();
  }

  onStatusChange(value: 'all' | BookStockStatus): void {
    this.status.set(value);
    this.resetPage();
  }

  onSortChange(value: SortKey): void {
    this.sort.set(value);
    this.resetPage();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.resetPage();
  }

  goToPage(p: number): void {
    this.page.set(Math.max(1, Math.min(p, this.totalPages())));
  }

  private resetPage(): void {
    this.page.set(1);
  }

  openCreate(): void {
    this.editBook.set(null);
    if (this.showForm()) {
      this.showForm.set(false);
      queueMicrotask(() => this.showForm.set(true));
      return;
    }
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
    const scope: LibraryScope = {
      institutionId: payload.institutionId,
      branchId: payload.branchId,
      libraryId: payload.libraryId,
    };
    this.formBusy.set(true);
    const edit = this.editBook();
    const { pdfFile, institutionId: _i, branchId: _b, libraryId: _l, ...bookPayload } = payload;
    const editScope = edit
      ? { institutionId: edit.institutionId, branchId: edit.branchId, libraryId: edit.libraryId }
      : scope;
    const req$ = edit
      ? this.bookService.updateBook(editScope, edit.id, bookPayload)
      : this.bookService.createBook(scope, bookPayload);
    req$.subscribe({
      next: (res) => {
        const bookId = res.data?.id;
        if (bookId && pdfFile) {
          const pdfScope = edit ? editScope : scope;
          this.bookService.uploadPdf(pdfScope, bookId, pdfFile).subscribe({
            next: (pdfRes) => this.finishBookSave(edit, pdfRes.data ?? res.data ?? null, scope),
            error: () => {
              this.finishBookSave(edit, res.data ?? null, scope);
              this.toast.error('Book saved but PDF upload failed.');
            },
          });
          return;
        }
        this.finishBookSave(edit, res.data ?? null, scope);
      },
      error: (err) => {
        this.formBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to save book');
      },
    });
  }

  private finishBookSave(edit: BookDetail | null, book: BookDetail | null, savedScope?: LibraryScope): void {
    this.formBusy.set(false);
    this.showForm.set(false);
    this.editBook.set(null);

    if (!edit && savedScope) {
      this.filterInstitutionId.set(savedScope.institutionId);
      this.filterBranchId.set(savedScope.branchId);
      this.filterLibraryId.set(savedScope.libraryId);
      const labels = libraryScopeLabels(this.institutions(), savedScope);
      this.toast.success(`Book added to ${labels.libraryName || 'library'}`);
    } else {
      this.toast.success(edit ? 'Book updated' : 'Book added');
    }

    if (book && this.selectedBook()?.id === book.id) {
      this.selectedBook.set(book);
    }
    this.refresh();
  }

  private bookScope(book: ScopedBookListItem | BookDetail): LibraryScope {
    return {
      institutionId: book.institutionId,
      branchId: book.branchId,
      libraryId: book.libraryId,
    };
  }

  viewPdf(book: ScopedBookListItem | BookDetail): void {
    if (!book.hasPdf) return;
    this.bookService.downloadPdf(this.bookScope(book), book.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toast.error('Failed to open PDF'),
    });
  }

  onDrawerPdfSelected(event: Event): void {
    const book = this.selectedBook();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!book || !file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.toast.error('Please select a PDF file.');
      input.value = '';
      return;
    }

    this.drawerBusy.set(true);
    this.bookService.uploadPdf(this.bookScope(book), book.id, file).subscribe({
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
    const book = this.selectedBook();
    if (!book?.hasPdf) return;
    this.drawerBusy.set(true);
    this.bookService.removePdf(this.bookScope(book), book.id).subscribe({
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

  openDrawer(book: ScopedBookListItem): void {
    this.bookService.getBook(this.bookScope(book), book.id).subscribe({
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
    const book = this.selectedBook();
    if (!book) return;
    this.drawerBusy.set(true);
    this.bookService.adjustStock(this.bookScope(book), book.id, delta, this.stockNote() || undefined).subscribe({
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
    const book = this.selectedBook();
    if (!book) return;
    this.drawerBusy.set(true);
    this.bookService.markCondition(this.bookScope(book), book.id, kind).subscribe({
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
    const book = this.selectedBook();
    const memberId = this.checkoutMemberId();
    if (!book || !memberId) {
      this.toast.error('Select a member to issue the book.');
      return;
    }
    if (book.hasPdf) {
      this.toast.error('Digital books with a PDF are not issued as physical copies.');
      return;
    }
    this.drawerBusy.set(true);
    const loanDays = this.checkoutLoanDays();
    this.bookService.checkout(this.bookScope(book), book.id, memberId, loanDays).subscribe({
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
    const book = this.selectedBook();
    if (!book) return;
    if (book.hasPdf) {
      this.toast.error('Digital books with a PDF do not require a physical return.');
      return;
    }
    this.drawerBusy.set(true);
    this.bookService.returnLoan(this.bookScope(book), book.id, activityId).subscribe({
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
    const book = this.selectedBook();
    if (!book) return;
    this.drawerBusy.set(true);
    this.bookService.sendReturnReminder(this.bookScope(book), book.id, activityId).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        const reminder = res.data;
        if (!reminder) {
          this.toast.success('Return reminder logged.');
          return;
        }
        this.toast.success('Return reminder sent.');
        if (reminder.memberPhone) {
          const labels = libraryScopeLabels(this.institutions(), this.bookScope(book));
          this.whatsapp.bookReturnReminder(
            reminder.memberPhone,
            reminder.memberName,
            reminder.bookTitle,
            this.formatBookDate(reminder.dueAtUtc),
            reminder.daysOverdue,
            reminder.estimatedFine,
            labels.libraryName,
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
      ['Title', 'Author', 'Category', 'ISBN', 'Library', 'Available', 'Copies', 'Status'],
      ...rows.map(b => [
        b.title, b.author, b.category, b.isbn, b.libraryName,
        b.availableCopies, b.totalCopies, BOOK_STATUS_LABELS[b.status],
      ]),
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

  availabilityPercent(book: ScopedBookListItem): number {
    if (!book.totalCopies) return 0;
    return Math.round((book.availableCopies / book.totalCopies) * 100);
  }

  trackBook(_index: number, book: ScopedBookListItem): string {
    return `${book.libraryId}-${book.id}`;
  }
}
