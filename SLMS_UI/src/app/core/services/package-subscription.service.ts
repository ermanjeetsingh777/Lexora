import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  ApproveSubscriptionRequest,
  PackageSubscriptionItem,
  PackageSubscriptionOverview,
  PackageSubscriptionQuote,
  RejectSubscriptionRequest,
  RenewPackageSubscriptionRequest,
  SubscribePackageRequest,
  UpdatePackageSubscriptionRequest,
  UpgradePackageRequest,
  UserPackageSummary,
} from '@core/models/package-subscription.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PackageSubscriptionService {
  private readonly api = inject(ApiService);

  getOverview(): Observable<PackageSubscriptionOverview> {
    return this.api
      .get<PackageSubscriptionOverview>('package-subscriptions/overview')
      .pipe(map((r) => r.data!));
  }

  getQuote(subscriptionId: string, packageId: string, forUpgrade = false): Observable<PackageSubscriptionQuote> {
    return this.api
      .get<PackageSubscriptionQuote>('package-subscriptions/quote', {
        params: { subscriptionId, packageId, forUpgrade: forUpgrade ? 'true' : 'false' },
      })
      .pipe(map((r) => r.data!));
  }

  renew(request: RenewPackageSubscriptionRequest): Observable<PackageSubscriptionItem> {
    return this.api
      .post<PackageSubscriptionItem>('package-subscriptions/renew', request)
      .pipe(map((r) => r.data!));
  }

  update(subscriptionId: string, request: UpdatePackageSubscriptionRequest): Observable<PackageSubscriptionItem> {
    return this.api
      .putTo<PackageSubscriptionItem>(`package-subscriptions/${subscriptionId}`, request)
      .pipe(map((r) => r.data!));
  }

  subscribe(request: SubscribePackageRequest): Observable<UserPackageSummary> {
    return this.api
      .post<UserPackageSummary>('package-subscriptions/subscribe', request)
      .pipe(map((r) => r.data!));
  }

  upgrade(request: UpgradePackageRequest): Observable<UserPackageSummary> {
    return this.api
      .post<UserPackageSummary>('package-subscriptions/upgrade', request)
      .pipe(map((r) => r.data!));
  }

  getAllSubscriptionRequests(status?: string): Observable<PackageSubscriptionItem[]> {
    return this.api
      .get<PackageSubscriptionItem[]>('package-subscriptions/requests', {
        params: status ? { status } : undefined,
      })
      .pipe(map((r) => r.data ?? []));
  }

  approveSubscriptionRequest(id: string, payload: ApproveSubscriptionRequest): Observable<PackageSubscriptionItem> {
    return this.api
      .post<PackageSubscriptionItem>(`package-subscriptions/requests/${id}/approve`, payload)
      .pipe(map((r) => r.data!));
  }

  rejectSubscriptionRequest(id: string, payload: RejectSubscriptionRequest): Observable<PackageSubscriptionItem> {
    return this.api
      .post<PackageSubscriptionItem>(`package-subscriptions/requests/${id}/reject`, payload)
      .pipe(map((r) => r.data!));
  }
}
