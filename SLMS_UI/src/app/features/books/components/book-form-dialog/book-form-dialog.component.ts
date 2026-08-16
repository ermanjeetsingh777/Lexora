import { Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideBookOpen, LucideX } from '@lucide/angular';
import { ToastService } from '@core/services/toast.service';
import { BookDetail, LibraryScope } from '@core/models/book.models';
import {
  BranchDropdownResponse,
  InstitutionDropdownResponse,
  LibraryDropdownResponse,
} from '@core/models/institution-dropdown.model';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { BookService } from '../../book.service';
import { canonicalizeIsbn, isValidIsbn } from '../../book-format.util';
import { branchesForInstitution, librariesForBranch } from '../../library-scope.util';

export interface BookFormPayload {
  institutionId: string;
  branchId: string;
  libraryId: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  notes?: string;
  pdfFile?: File | null;
}

@Component({
  selector: 'app-book-form-dialog',
  imports: [FormsModule, ButtonComponent, LucideBookOpen, LucideX],
  providers: [InstitutionsService, BookService],
  templateUrl: './book-form-dialog.component.html',
})
export class BookFormDialogComponent {
  private readonly toast = inject(ToastService);
  private readonly institutionsService = inject(InstitutionsService);
  private readonly bookService = inject(BookService);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly book = input<BookDetail | null>(null);
  readonly userInstitutions = input<InstitutionDropdownResponse[]>([]);
  readonly defaultScope = input<LibraryScope | null>(null);
  readonly busy = input(false);

  readonly submitted = output<BookFormPayload>();
  readonly closed = output<void>();

  readonly institutions = signal<InstitutionDropdownResponse[]>([]);
  readonly branches = signal<BranchDropdownResponse[]>([]);
  readonly libraries = signal<LibraryDropdownResponse[]>([]);
  readonly dropdownsLoaded = signal(false);

  readonly institutionId = signal('');
  readonly branchId = signal('');
  readonly libraryId = signal('');
  readonly scopeTouched = signal(false);

  readonly title = signal('');
  readonly author = signal('');
  readonly category = signal('');
  readonly isbn = signal('');
  readonly totalCopies = signal(1);
  readonly availableCopies = signal(1);
  readonly notes = signal('');
  readonly pdfFile = signal<File | null>(null);
  readonly pdfFileName = signal('');
  readonly scopeIsbns = signal<string[]>([]);

  readonly isbnTouched = signal(false);
  readonly titleTouched = signal(false);

  readonly isEdit = computed(() => !!this.book());

  readonly institutionSelectDisabled = computed(() => this.isEdit() || this.institutions().length <= 1);
  readonly branchDisabled = computed(() =>
    this.isEdit() || !this.institutionId() || this.branches().length <= 1
  );
  readonly libraryDisabled = computed(() =>
    this.isEdit() || !this.branchId()
  );

  readonly scopeValid = computed(() =>
    !!this.institutionId() && !!this.branchId() && !!this.libraryId()
  );

  readonly isbnValid = computed(() => isValidIsbn(this.isbn()));
  readonly isbnDuplicate = computed(() => {
    const clean = canonicalizeIsbn(this.isbn());
    if (!clean) return false;
    const current = this.book()?.isbn ? canonicalizeIsbn(this.book()!.isbn) : null;
    return this.scopeIsbns().some(x => {
      const existing = canonicalizeIsbn(x);
      return !!existing && existing === clean && existing !== current;
    });
  });

  readonly formValid = computed(() =>
    this.scopeValid()
    && this.title().trim().length >= 2
    && this.author().trim().length >= 2
    && this.category().trim().length >= 2
    && this.isbnValid()
    && !this.isbnDuplicate()
    && this.totalCopies() >= 0
    && this.availableCopies() >= 0
    && this.availableCopies() <= this.totalCopies()
  );

  readonly Math = Math;

  private wasOpen = false;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (!isOpen) {
        this.wasOpen = false;
        return;
      }

      const justOpened = !this.wasOpen;
      this.wasOpen = true;
      if (!justOpened) return;

      const book = this.book();
      this.title.set(book?.title ?? '');
      this.author.set(book?.author ?? '');
      this.category.set(book?.category ?? '');
      this.isbn.set(book?.isbn ?? '');
      this.totalCopies.set(book?.totalCopies ?? 1);
      this.availableCopies.set(book?.availableCopies ?? 1);
      this.notes.set(book?.notes ?? '');
      this.pdfFile.set(null);
      this.pdfFileName.set(book?.pdfFileName ?? '');
      this.isbnTouched.set(false);
      this.titleTouched.set(false);
      this.scopeTouched.set(false);

      if (this.userInstitutions().length) {
        this.institutions.set(this.userInstitutions());
        this.dropdownsLoaded.set(true);
        this.initializeScope();
      } else if (this.dropdownsLoaded()) {
        this.initializeScope();
      } else {
        this.loadDropdowns();
      }
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  onInstitutionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.institutionId.set(value);

    const branches = branchesForInstitution(this.institutions(), value);
    this.branches.set(branches);
    this.libraries.set([]);
    this.branchId.set(branches.length === 1 ? branches[0].value : '');
    this.libraryId.set('');
    this.scopeIsbns.set([]);

    if (branches.length === 1) {
      const libraries = librariesForBranch(this.institutions(), value, branches[0].value);
      this.libraries.set(libraries);
      if (libraries.length === 1) {
        this.libraryId.set(libraries[0].value);
        this.loadIsbnsForLibrary();
      }
    }
  }

  onBranchChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.branchId.set(value);

    const libraries = librariesForBranch(this.institutions(), this.institutionId(), value);
    this.libraries.set(libraries);
    this.libraryId.set(libraries.length === 1 ? libraries[0].value : '');
    this.scopeIsbns.set([]);

    if (libraries.length === 1) {
      this.loadIsbnsForLibrary();
    }
  }

  onLibraryIdChange(value: string): void {
    this.libraryId.set(value);
    this.loadIsbnsForLibrary();
  }

  onSubmit(): void {
    this.scopeTouched.set(true);
    if (!this.formValid()) {
      this.toast.error('Please fix validation errors before saving.');
      return;
    }
    const isbn = canonicalizeIsbn(this.isbn());
    if (!isbn) {
      this.toast.error('Please fix validation errors before saving.');
      return;
    }
    this.submitted.emit({
      institutionId: this.institutionId(),
      branchId: this.branchId(),
      libraryId: this.libraryId(),
      title: this.title().trim(),
      author: this.author().trim(),
      category: this.category().trim(),
      isbn,
      totalCopies: this.totalCopies(),
      availableCopies: this.availableCopies(),
      notes: this.notes().trim() || undefined,
      pdfFile: this.pdfFile(),
    });
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.pdfFile.set(null);
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.toast.error('Please select a PDF file.');
      input.value = '';
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.toast.error('PDF must be 25 MB or smaller.');
      input.value = '';
      return;
    }
    this.pdfFile.set(file);
    this.pdfFileName.set(file.name);
  }

  clearPdfSelection(): void {
    this.pdfFile.set(null);
    this.pdfFileName.set(this.book()?.pdfFileName ?? '');
  }

  onTotalCopiesChange(value: number): void {
    const copies = Math.max(0, value || 0);
    this.totalCopies.set(copies);
    if (this.availableCopies() > copies) this.availableCopies.set(copies);
  }

  private loadDropdowns(): void {
    this.institutionsService.getInstitutionBranchForDropdown()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.institutions.set(res.data ?? []);
          this.dropdownsLoaded.set(true);
          this.initializeScope();
        },
        error: () => {
          this.institutions.set([]);
          this.dropdownsLoaded.set(true);
        },
      });
  }

  private initializeScope(): void {
    const book = this.book();
    if (book) {
      this.applyScope(book.institutionId, book.branchId, book.libraryId);
      return;
    }

    const def = this.defaultScope();
    if (def) {
      this.applyScope(def.institutionId, def.branchId, def.libraryId);
      return;
    }

    this.institutionId.set('');
    this.branchId.set('');
    this.libraryId.set('');
    this.branches.set([]);
    this.libraries.set([]);
    this.scopeIsbns.set([]);
  }

  private applyScope(institutionId: string, branchId: string, libraryId: string): void {
    this.institutionId.set(institutionId);
    this.branches.set(branchesForInstitution(this.institutions(), institutionId));
    this.branchId.set(branchId);
    this.libraries.set(librariesForBranch(this.institutions(), institutionId, branchId));
    this.libraryId.set(libraryId);
    this.loadIsbnsForLibrary();
  }

  private loadIsbnsForLibrary(): void {
    const scope = this.currentScope();
    if (!scope) {
      this.scopeIsbns.set([]);
      return;
    }

    this.bookService.getBooks(scope)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.scopeIsbns.set((res.data ?? []).map(b => b.isbn)),
        error: () => this.scopeIsbns.set([]),
      });
  }

  private currentScope(): LibraryScope | null {
    const institutionId = this.institutionId();
    const branchId = this.branchId();
    const libraryId = this.libraryId();
    if (!institutionId || !branchId || !libraryId) return null;
    return { institutionId, branchId, libraryId };
  }
}
