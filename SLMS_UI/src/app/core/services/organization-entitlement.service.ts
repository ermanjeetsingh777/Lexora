import { computed, inject, Injectable, signal } from '@angular/core';
import { OrganizationEntitlements } from '@core/models/organization-entitlement.models';
import { ApiService } from '@core/services/api.service';
import { catchError, map, Observable, of, tap } from 'rxjs';

export interface ResourceQuotaDetails {
  resourceType: 'institution' | 'branch' | 'library' | 'user' | 'member';
  resourceLabel: string;
  count: number;
  max: number;
  remaining: number;
  canCreate: boolean;
  isSuperAdmin: boolean;
  percent: number;
  packageTier: string;
  packageName: string;
}

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

  readonly institutionQuota = computed<ResourceQuotaDetails>(() => {
    const ent = this.entitlements();
    const isSuper = ent?.isSuperAdmin ?? false;
    const count = ent?.institutionCount ?? 0;
    const max = ent?.maxInstitutions ?? 1;
    const remaining = isSuper ? 9999 : Math.max(0, max - count);
    return {
      resourceType: 'institution',
      resourceLabel: 'Institutions',
      count,
      max,
      remaining,
      canCreate: isSuper || (ent?.canCreateInstitution ?? false),
      isSuperAdmin: isSuper,
      percent: isSuper ? 0 : Math.min(100, Math.round((count / Math.max(1, max)) * 100)),
      packageTier: ent?.packageTier ?? 'Basic',
      packageName: ent?.packageName ?? 'Base Plan'
    };
  });

  readonly branchQuota = computed<ResourceQuotaDetails>(() => {
    const ent = this.entitlements();
    const isSuper = ent?.isSuperAdmin ?? false;
    const count = ent?.branchCount ?? 0;
    const max = ent?.maxBranches ?? 1;
    const remaining = isSuper ? 9999 : Math.max(0, max - count);
    return {
      resourceType: 'branch',
      resourceLabel: 'Branches',
      count,
      max,
      remaining,
      canCreate: isSuper || (ent?.canCreateBranch ?? false),
      isSuperAdmin: isSuper,
      percent: isSuper ? 0 : Math.min(100, Math.round((count / Math.max(1, max)) * 100)),
      packageTier: ent?.packageTier ?? 'Basic',
      packageName: ent?.packageName ?? 'Base Plan'
    };
  });

  readonly libraryQuota = computed<ResourceQuotaDetails>(() => {
    const ent = this.entitlements();
    const isSuper = ent?.isSuperAdmin ?? false;
    const count = ent?.libraryCount ?? 0;
    const max = ent?.maxLibraries ?? 1;
    const remaining = isSuper ? 9999 : Math.max(0, max - count);
    return {
      resourceType: 'library',
      resourceLabel: 'Libraries',
      count,
      max,
      remaining,
      canCreate: isSuper || (ent?.canCreateLibrary ?? false),
      isSuperAdmin: isSuper,
      percent: isSuper ? 0 : Math.min(100, Math.round((count / Math.max(1, max)) * 100)),
      packageTier: ent?.packageTier ?? 'Basic',
      packageName: ent?.packageName ?? 'Base Plan'
    };
  });

  readonly userQuota = computed<ResourceQuotaDetails>(() => {
    const ent = this.entitlements();
    const isSuper = ent?.isSuperAdmin ?? false;
    const count = ent?.userCount ?? 0;
    const max = ent?.maxUsers ?? 2;
    const remaining = isSuper ? 9999 : Math.max(0, max - count);
    return {
      resourceType: 'user',
      resourceLabel: 'Staff Users',
      count,
      max,
      remaining,
      canCreate: isSuper || (ent?.canCreateUser ?? false),
      isSuperAdmin: isSuper,
      percent: isSuper ? 0 : Math.min(100, Math.round((count / Math.max(1, max)) * 100)),
      packageTier: ent?.packageTier ?? 'Basic',
      packageName: ent?.packageName ?? 'Base Plan'
    };
  });

  readonly memberQuota = computed<ResourceQuotaDetails>(() => {
    const ent = this.entitlements();
    const isSuper = ent?.isSuperAdmin ?? false;
    const count = ent?.memberCount ?? 0;
    const max = ent?.maxMembers ?? 200;
    const remaining = isSuper ? 999999 : Math.max(0, max - count);
    return {
      resourceType: 'member',
      resourceLabel: 'Active Members',
      count,
      max,
      remaining,
      canCreate: isSuper || (ent?.canCreateMember ?? false),
      isSuperAdmin: isSuper,
      percent: isSuper ? 0 : Math.min(100, Math.round((count / Math.max(1, max)) * 100)),
      packageTier: ent?.packageTier ?? 'Basic',
      packageName: ent?.packageName ?? 'Base Plan'
    };
  });

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
