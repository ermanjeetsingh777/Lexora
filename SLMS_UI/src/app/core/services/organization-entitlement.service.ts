import { computed, inject, Injectable, signal } from '@angular/core';
import { OrganizationEntitlements } from '@core/models/organization-entitlement.models';
import { ApiService } from '@core/services/api.service';
import { catchError, map, Observable, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrganizationEntitlementService {
  private readonly api = inject(ApiService);

  readonly entitlements = signal<OrganizationEntitlements | null>(null);
  readonly loading = signal(false);

  readonly canCreateInstitution = computed(() => this.entitlements()?.canCreateInstitution ?? false);
  readonly canCreateBranch = computed(() => this.entitlements()?.canCreateBranch ?? false);
  readonly canCreateLibrary = computed(() => this.entitlements()?.canCreateLibrary ?? false);
  readonly canCreateUser = computed(() => this.entitlements()?.canCreateUser ?? false);
  readonly canCreateMember = computed(() => this.entitlements()?.canCreateMember ?? false);

  load(force = false): Observable<OrganizationEntitlements | null> {
    if (!force && this.entitlements()) {
      return of(this.entitlements());
    }

    this.loading.set(true);
    return this.api.get<OrganizationEntitlements>('auth/organization-entitlements').pipe(
      map((response) => response.data ?? null),
      tap((data) => this.entitlements.set(data)),
      catchError(() => {
        this.entitlements.set(null);
        return of(null);
      }),
      tap(() => this.loading.set(false)),
    );
  }

  refresh(): Observable<OrganizationEntitlements | null> {
    return this.load(true);
  }
}
