import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideBookOpen, LucideSave, LucideX } from '@lucide/angular';
import { ToastService } from '@core/services/toast.service';
import { BookDetail } from '@core/models/book.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { canonicalizeIsbn, isValidIsbn } from '../../book-format.util';

export interface BookFormPayload {
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
  templateUrl: './book-form-dialog.component.html',
})
export class BookFormDialogComponent {
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly book = input<BookDetail | null>(null);
  readonly existingIsbns = input<string[]>([]);
  readonly busy = input(false);

  readonly submitted = output<BookFormPayload>();
  readonly closed = output<void>();

  readonly title = signal('');
  readonly author = signal('');
  readonly category = signal('');
  readonly isbn = signal('');
  readonly totalCopies = signal(1);
  readonly availableCopies = signal(1);
  readonly notes = signal('');
  readonly pdfFile = signal<File | null>(null);
  readonly pdfFileName = signal('');

  readonly isbnTouched = signal(false);
  readonly titleTouched = signal(false);

  readonly isEdit = computed(() => !!this.book());

  readonly isbnValid = computed(() => isValidIsbn(this.isbn()));
  readonly isbnDuplicate = computed(() => {
    const clean = canonicalizeIsbn(this.isbn());
    if (!clean) return false;
    const current = this.book()?.isbn ? canonicalizeIsbn(this.book()!.isbn) : null;
    return this.existingIsbns().some(x => {
      const existing = canonicalizeIsbn(x);
      return !!existing && existing === clean && existing !== current;
    });
  });

  readonly formValid = computed(() =>
    this.title().trim().length >= 2
    && this.author().trim().length >= 2
    && this.category().trim().length >= 2
    && this.isbnValid()
    && !this.isbnDuplicate()
    && this.totalCopies() >= 0
    && this.availableCopies() >= 0
    && this.availableCopies() <= this.totalCopies()
  );

  readonly Math = Math;

  constructor() {
    effect(() => {
      if (!this.open()) return;
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
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  onSubmit(): void {
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
}
