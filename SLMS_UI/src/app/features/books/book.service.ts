import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APIResponseModel } from '@core/models/APIResponseModel';
import {
  BookDetail, BookListItem, BookStats, BookReturnResult, BookReminderResult, CreateBookPayload, LibraryScope, MemberBookLoan,
} from '@core/models/book.models';
import { ApiService } from '@core/services/api.service';

@Injectable()
export class BookService {
  private readonly http = inject(ApiService);

  private base(scope: LibraryScope): string {
    return `institutions/${scope.institutionId}/branches/${scope.branchId}/libraries/${scope.libraryId}/books`;
  }

  getBooks(scope: LibraryScope, params?: { search?: string; category?: string; status?: number }): Observable<APIResponseModel<BookListItem[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', String(params.status));
    const suffix = query.toString() ? `?${query}` : '';
    return this.http.get<BookListItem[]>(`${this.base(scope)}${suffix}`);
  }

  getStats(scope: LibraryScope): Observable<APIResponseModel<BookStats>> {
    return this.http.get<BookStats>(`${this.base(scope)}/stats`);
  }

  getBook(scope: LibraryScope, bookId: string): Observable<APIResponseModel<BookDetail>> {
    return this.http.get<BookDetail>(`${this.base(scope)}/${bookId}`);
  }

  createBook(scope: LibraryScope, payload: CreateBookPayload): Observable<APIResponseModel<BookDetail>> {
    return this.http.post<BookDetail>(this.base(scope), payload);
  }

  updateBook(scope: LibraryScope, bookId: string, payload: CreateBookPayload): Observable<APIResponseModel<BookDetail>> {
    return this.http.put<BookDetail>(this.base(scope), bookId, payload);
  }

  adjustStock(scope: LibraryScope, bookId: string, delta: number, note?: string): Observable<APIResponseModel<BookDetail>> {
    return this.http.post<BookDetail>(`${this.base(scope)}/${bookId}/stock/adjust`, { delta, note });
  }

  markCondition(scope: LibraryScope, bookId: string, kind: 'damaged' | 'lost'): Observable<APIResponseModel<BookDetail>> {
    return this.http.post<BookDetail>(`${this.base(scope)}/${bookId}/stock/${kind}`, {});
  }

  checkout(scope: LibraryScope, bookId: string, memberId: string, loanDays = 14): Observable<APIResponseModel<BookDetail>> {
    return this.http.post<BookDetail>(`${this.base(scope)}/${bookId}/checkout`, { memberId, loanDays });
  }

  returnLoan(scope: LibraryScope, bookId: string, loanId: string): Observable<APIResponseModel<BookReturnResult>> {
    return this.http.post<BookReturnResult>(`${this.base(scope)}/${bookId}/loans/${loanId}/return`, {});
  }

  sendReturnReminder(scope: LibraryScope, bookId: string, loanId: string): Observable<APIResponseModel<BookReminderResult>> {
    return this.http.post<BookReminderResult>(`${this.base(scope)}/${bookId}/loans/${loanId}/reminder`, {});
  }

  uploadPdf(scope: LibraryScope, bookId: string, file: File): Observable<APIResponseModel<BookDetail>> {
    return this.http.upload<BookDetail>(`${this.base(scope)}/${bookId}/pdf`, file);
  }

  downloadPdf(scope: LibraryScope, bookId: string): Observable<Blob> {
    return this.http.download(`${this.base(scope)}/${bookId}/pdf`);
  }

  removePdf(scope: LibraryScope, bookId: string): Observable<APIResponseModel<BookDetail>> {
    return this.http.deleteByPath<BookDetail>(`${this.base(scope)}/${bookId}/pdf`);
  }

  getMemberLoans(memberId: string): Observable<APIResponseModel<MemberBookLoan[]>> {
    return this.http.get<MemberBookLoan[]>(`members/${memberId}/book-loans`);
  }
}
