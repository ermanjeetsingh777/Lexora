import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideBookOpen, LucideFileText, LucideSearch, LucideX } from '@lucide/angular';
import { BookListItem } from '@core/models/book.models';
import { BookService } from '@features/books/book.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent } from '@shared/components/page-header/page-header.component';
import { bookCoverHue, bookInitials } from '@features/books/book-format.util';

@Component({
  selector: 'app-member-digital-books',
  standalone: true,
  imports: [
    FormsModule,
    GlassCardComponent,
    ButtonComponent,
    LucideSearch, LucideFileText, LucideBookOpen, LucideX,
  ],
  templateUrl: './member-digital-books-component.html',
  styleUrl: './member-digital-books-component.css',
})
export class MemberDigitalBooksComponent implements OnInit {
  readonly memberId = input.required<string>();

  private readonly bookService = inject(BookService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly books = signal<BookListItem[]>([]);
  readonly query = signal('');
  readonly category = signal('all');
  readonly viewerUrl = signal<string | null>(null);
  readonly viewerTitle = signal('');

  readonly bookCoverHue = bookCoverHue;
  readonly bookInitials = bookInitials;

  readonly categories = computed(() =>
    Array.from(new Set(this.books().map(b => b.category))).sort()
  );

  readonly filteredBooks = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    return this.books().filter(b => {
      if (cat !== 'all' && b.category !== cat) return false;
      if (!q) return true;
      return b.title.toLowerCase().includes(q)
        || b.author.toLowerCase().includes(q)
        || b.isbn.includes(q);
    });
  });

  readonly safeViewerUrl = computed((): SafeResourceUrl | null => {
    const url = this.viewerUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    const memberId = this.memberId();
    if (!memberId) return;

    this.loading.set(true);
    this.bookService.getMemberDigitalBooks(memberId).subscribe({
      next: (res) => {
        this.books.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.books.set([]);
        this.loading.set(false);
        this.toast.error('Failed to load digital books');
      },
    });
  }

  viewPdf(book: BookListItem): void {
    const memberId = this.memberId();
    if (!memberId || !book.hasPdf) return;

    this.bookService.downloadMemberDigitalPdf(memberId, book.id).subscribe({
      next: (blob) => {
        const previous = this.viewerUrl();
        if (previous) URL.revokeObjectURL(previous);

        const url = URL.createObjectURL(blob);
        this.viewerUrl.set(url);
        this.viewerTitle.set(book.title);
      },
      error: () => this.toast.error('Failed to open PDF'),
    });
  }

  openInNewTab(): void {
    const url = this.viewerUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  closeViewer(): void {
    const url = this.viewerUrl();
    if (url) URL.revokeObjectURL(url);
    this.viewerUrl.set(null);
    this.viewerTitle.set('');
  }
}
