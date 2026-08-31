import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  ApproveCustomerReviewRequest,
  CreateCustomerReviewRequest,
  CustomerReviewItem,
  PublicCustomerReviewItem,
  RejectCustomerReviewRequest,
} from '@core/models/customer-review.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CustomerReviewService {
  private readonly api = inject(ApiService);

  submitReview(payload: CreateCustomerReviewRequest): Observable<CustomerReviewItem> {
    return this.api.post<CustomerReviewItem>('customer-reviews', payload).pipe(map((res) => res.data!));
  }

  getPublicApprovedReviews(): Observable<PublicCustomerReviewItem[]> {
    return this.api.get<PublicCustomerReviewItem[]>('customer-reviews/public').pipe(map((res) => res.data ?? []));
  }

  getAllReviews(status?: string, search?: string): Observable<CustomerReviewItem[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.api.get<CustomerReviewItem[]>(`customer-reviews${queryString}`).pipe(map((res) => res.data ?? []));
  }

  approveReview(id: string, payload?: ApproveCustomerReviewRequest): Observable<CustomerReviewItem> {
    return this.api.post<CustomerReviewItem>(`customer-reviews/${id}/approve`, payload ?? {}).pipe(map((res) => res.data!));
  }

  rejectReview(id: string, payload?: RejectCustomerReviewRequest): Observable<CustomerReviewItem> {
    return this.api.post<CustomerReviewItem>(`customer-reviews/${id}/reject`, payload ?? {}).pipe(map((res) => res.data!));
  }

  deleteReview(id: string): Observable<unknown> {
    return this.api.delete<unknown>('customer-reviews', id).pipe(map((res) => res.data));
  }
}
