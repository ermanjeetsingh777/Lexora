import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, finalize, of, Subject, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LucideAlertTriangle,
  LucideArrowDownRight,
  LucideArrowUpRight,
  LucideBookOpen,
  LucideBuilding2,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideClock,
  LucideIndianRupee,
  LucideLayoutGrid,
  LucideList,
  LucideMapPin,
  LucidePlus,
  LucideSearch,
  LucideShieldCheck,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import {
  BranchListInsight,
  BranchListItem,
  BranchListSummary,
  BranchListView,
  BranchOccFilter,
  BranchStatusFilter,
  BranchViewMode,
} from '@core/models/branch-list.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import {
  GlassCardComponent,
  PageHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { QuotaBadgeComponent } from '@shared/components/quota-badge/quota-badge.component';
import { BranchService } from '../branch.service';
import { AuthService } from '@core/services/auth.service';
import { PermissionKey } from '@core/constants/permissions';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';

const STATUS_OPTS: BranchStatusFilter[] = ['all', 'Active', 'Maintenance', 'Closed'];
const OCC_OPTS: { value: BranchOccFilter; label: string }[] = [
  { value: 'any', label: 'Any occupancy' },
  { value: 'low', label: '< 50%' },
  { value: 'mid', label: '50–80%' },
  { value: 'high', label: '≥ 80%' },
];
const PAGE_SIZE_OPTS = [12, 24, 48] as const;

@Component({
  selector: 'app-branch-list-component',
  imports: [
    RouterLink,
    FormsModule,
    ButtonComponent,
    PageHeaderComponent,
    GlassCardComponent,
    StatusBadgeComponent,
    QuotaBadgeComponent,
    LucideBuilding2,
    LucidePlus,
    LucideSearch,
    LucideUsers,
    LucideAlertTriangle,
    LucideMapPin,
    LucideArrowUpRight,
    LucideArrowDownRight,
    LucideBookOpen,
    LucideClock,
    LucideIndianRupee,
    LucideShieldCheck,
    LucideLayoutGrid,
    LucideList,
    LucideX,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
  ],
  templateUrl: './branch-list-component.html',
  styleUrls: [
    './branch-list-component.css',
    '../../institutions/institutions-list/institutions-list.css',
    '../../institutions/institution-detail/institution-detail.component.css',
  ],
})
export class BranchListComponent implements OnInit {
  private readonly branchesApi = inject(BranchService);
  private readonly organizationEntitlements = inject(OrganizationEntitlementService);
  private readonly auth = inject(AuthService);
  private readonly search$ = new Subject<string>();

  protected readonly canCreateBranch = computed(
    () => this.organizationEntitlements.canCreateBranch() && this.auth.hasPermission(PermissionKey.BranchesCreate)
  );

  protected readonly Math = Math;
  readonly STATUS_OPTS = STATUS_OPTS;
  readonly OCC_OPTS = OCC_OPTS;
  readonly PAGE_SIZE_OPTS = PAGE_SIZE_OPTS;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<BranchListItem[]>([]);
  readonly topPerformer = signal<BranchListInsight | null>(null);
  readonly needsAttention = signal<BranchListInsight[]>([]);
  readonly summary = signal({
    totalBranches: 0,
    activeBranches: 0,
    totalCapacity: 0,
    totalOccupied: 0,
    averageOccupancyPercent: 0,
    nearCapacityCount: 0,
    totalLibraries: 0,
    cityCount: 0,
    revenueMtd: 0,
    revenuePreviousMtd: 0,
    revenueMonthly: 0,
    revenueQuarterly: 0,
    revenueYearly: 0,
    revenueAllTime: 0,
  });

  readonly query = signal('');
  readonly statusFilter = signal<BranchStatusFilter>('all');
  readonly institutionFilter = signal('all');
  readonly cityFilter = signal('all');
  readonly occFilter = signal<BranchOccFilter>('any');
  readonly view = signal<BranchViewMode>('grid');
  readonly page = signal(1);
  readonly pageSize = signal(12);

  readonly headerDescription = computed(() => {
    const s = this.summary();
    return `${s.totalBranches.toLocaleString()} branches · ${s.activeBranches} active · ${s.averageOccupancyPercent}% avg occupancy`;
  });

  readonly networkMetrics = computed(() => {
    const s = this.summary();
    return [
      { label: 'Active', value: s.activeBranches.toLocaleString(), highlight: true },
      { label: 'Libraries', value: s.totalLibraries.toLocaleString(), highlight: false },
      { label: 'Cities', value: s.cityCount.toLocaleString(), highlight: false },
      { label: 'Near capacity', value: s.nearCapacityCount.toLocaleString(), highlight: false },
    ];
  });

  readonly needsAttentionIds = computed(() => new Set(this.needsAttention().map((b) => b.branchId)));

  readonly topPerformerId = computed(() => this.topPerformer()?.branchId ?? null);

  readonly revenueMtdLabel = computed(() => this.formatRevenue(this.summary().revenueMtd));

  readonly revenueMtdDelta = computed(() => {
    const prev = this.summary().revenuePreviousMtd;
    const curr = this.summary().revenueMtd;
    if (prev <= 0) return undefined;
    return ((curr - prev) / prev) * 100;
  });

  readonly revenuePeriods = computed(() => [
    { label: 'This month', value: this.formatRevenue(this.summary().revenueMonthly), highlight: true },
    { label: 'Quarter', value: this.formatRevenue(this.summary().revenueQuarterly), highlight: false },
    { label: 'Year', value: this.formatRevenue(this.summary().revenueYearly), highlight: false },
    { label: 'All-time', value: this.formatRevenue(this.summary().revenueAllTime), highlight: false },
  ]);

  readonly networkOccupancy = computed(() => this.summary().averageOccupancyPercent);

  readonly networkOccupancyLabel = computed(() => {
    const occ = this.networkOccupancy();
    if (occ >= 80) return 'High utilization';
    if (occ >= 50) return 'Moderate utilization';
    if (occ > 0) return 'Low utilization';
    return 'No occupancy data';
  });

  readonly networkOccupancyTone = computed(() => {
    const occ = this.networkOccupancy();
    if (occ >= 80) return 'high';
    if (occ >= 50) return 'mid';
    return 'low';
  });

  readonly institutionOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const item of this.items()) {
      if (!seen.has(item.institutionId)) {
        seen.set(item.institutionId, item.institutionName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  });

  readonly cityOptions = computed(() =>
    [...new Set(this.items().map((b) => b.city).filter((c): c is string => !!c?.trim()))].sort(),
  );

  readonly filtered = computed(() => {
    const institution = this.institutionFilter();
    const city = this.cityFilter();
    const occ = this.occFilter();

    return this.items().filter((b) => {
      if (institution !== 'all' && b.institutionId !== institution) return false;
      if (city !== 'all' && b.city !== city) return false;
      if (!this.matchOcc(b.occupancyPercent, occ)) return false;
      return true;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageStart = computed(() => (this.currentPage() - 1) * this.pageSize());
  readonly paged = computed(() => {
    const start = this.pageStart();
    return this.filtered().slice(start, start + this.pageSize());
  });

  readonly hasClientFilters = computed(
    () =>
      this.institutionFilter() !== 'all' ||
      this.cityFilter() !== 'all' ||
      this.occFilter() !== 'any',
  );

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(() =>
          this.fetchList().pipe(finalize(() => this.loading.set(false))),
        ),
      )
      .subscribe((view) => this.handleListView(view));

    this.loading.set(true);
    this.fetchList()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((view) => this.handleListView(view));
  }

  load(): void {
    this.loading.set(true);
    this.organizationEntitlements.load().subscribe();
    this.fetchList()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((view) => this.handleListView(view));
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.page.set(1);
    this.loading.set(true);
    this.search$.next(value);
  }

  onStatusChange(value: BranchStatusFilter): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  onInstitutionChange(value: string): void {
    this.institutionFilter.set(value);
    this.page.set(1);
  }

  onCityChange(value: string): void {
    this.cityFilter.set(value);
    this.page.set(1);
  }

  onOccChange(value: BranchOccFilter): void {
    this.occFilter.set(value);
    this.page.set(1);
  }

  setView(mode: BranchViewMode): void {
    this.view.set(mode);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.totalPages())));
  }

  clearClientFilters(): void {
    this.institutionFilter.set('all');
    this.cityFilter.set('all');
    this.occFilter.set('any');
    this.page.set(1);
  }

  clearAllFilters(): void {
    this.query.set('');
    this.statusFilter.set('all');
    this.clearClientFilters();
    this.load();
  }

  formatRevenue(revenue: number): string {
    if (revenue <= 0) return '₹0';
    if (revenue >= 100000) return `₹${(revenue / 100000).toFixed(1)}L`;
    if (revenue >= 1000) return `₹${(revenue / 1000).toFixed(1)}k`;
    return `₹${revenue.toFixed(0)}`;
  }

  branchStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
    const normalized = status.toLowerCase();
    if (normalized === 'active') return 'default';
    if (normalized === 'maintenance') return 'muted';
    if (normalized === 'closed' || normalized === 'inactive') return 'destructive';
    return 'default';
  }

  occupancyTone(pct: number): string {
    if (pct >= 80) return 'high';
    if (pct >= 50) return 'mid';
    return 'low';
  }

  occupancyBarClass(occupancy: number): string {
    if (occupancy >= 80) return 'branch-occ-bar branch-occ-bar--high';
    if (occupancy >= 50) return 'branch-occ-bar branch-occ-bar--mid';
    return 'branch-occ-bar branch-occ-bar--low';
  }

  isNeedsAttention(branchId: string): boolean {
    return this.needsAttentionIds().has(branchId);
  }

  isTopPerformer(branchId: string): boolean {
    return this.topPerformerId() === branchId;
  }

  private buildQuery(search: string) {
    const status = this.statusFilter();
    return {
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
    };
  }

  private applyView(view: {
    summary: BranchListSummary;
    items: BranchListItem[];
    topPerformer?: BranchListInsight | null;
    needsAttention: BranchListInsight[];
  }): void {
    this.summary.set(view.summary);
    this.items.set(view.items);
    this.topPerformer.set(view.topPerformer ?? null);
    this.needsAttention.set(view.needsAttention ?? []);
  }

  private matchOcc(pct: number, filter: BranchOccFilter): boolean {
    if (filter === 'any') return true;
    if (filter === 'low') return pct < 50;
    if (filter === 'mid') return pct >= 50 && pct < 80;
    return pct >= 80;
  }

  private fetchList() {
    return this.branchesApi.getListView(this.buildQuery(this.query())).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 0) {
          return EMPTY;
        }
        return of(null);
      }),
    );
  }

  private handleListView(view: BranchListView | null): void {
    if (!view) {
      this.error.set('Failed to load branches.');
      return;
    }
    this.applyView(view);
    this.error.set(null);
  }
}
