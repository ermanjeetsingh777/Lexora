import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, finalize, of, Subject, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LucideAlertTriangle,
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
  LucideLayers,
  LucideList,
  LucideMapPin,
  LucidePlus,
  LucideSearch,
  LucideShieldCheck,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import {
  LibraryListInsight,
  LibraryListItem,
  LibraryListRevenueSummary,
  LibraryListSummary,
  LibraryListView,
  LibraryOccFilter,
  LibraryStatusFilter,
  LibraryViewMode,
} from '@core/models/library-list.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import {
  GlassCardComponent,
  PageHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { LibraryService } from '../library.service';

const STATUS_OPTS: LibraryStatusFilter[] = ['all', 'Active', 'Maintenance', 'Closed'];
const OCC_OPTS: { value: LibraryOccFilter; label: string }[] = [
  { value: 'any', label: 'Any occupancy' },
  { value: 'low', label: '< 50%' },
  { value: 'mid', label: '50–80%' },
  { value: 'high', label: '≥ 80%' },
];
const PAGE_SIZE_OPTS = [12, 24, 48] as const;

@Component({
  selector: 'app-library-list-component',
  imports: [
    RouterLink,
    FormsModule,
    ButtonComponent,
    PageHeaderComponent,
    GlassCardComponent,
    StatusBadgeComponent,
    LucideBookOpen,
    LucidePlus,
    LucideSearch,
    LucideUsers,
    LucideAlertTriangle,
    LucideMapPin,
    LucideArrowUpRight,
    LucideBuilding2,
    LucideClock,
    LucideIndianRupee,
    LucideShieldCheck,
    LucideLayoutGrid,
    LucideList,
    LucideLayers,
    LucideX,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
  ],
  templateUrl: './library-list-component.html',
  styleUrls: [
    './library-list-component.css',
    '../../institutions/institutions-list/institutions-list.css',
    '../../institutions/institution-detail/institution-detail.component.css',
    '../../branches/branch-list-component/branch-list-component.css',
  ],
})
export class LibraryListComponent implements OnInit {
  private readonly librariesApi = inject(LibraryService);
  private readonly search$ = new Subject<string>();

  protected readonly Math = Math;
  readonly STATUS_OPTS = STATUS_OPTS;
  readonly OCC_OPTS = OCC_OPTS;
  readonly PAGE_SIZE_OPTS = PAGE_SIZE_OPTS;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<LibraryListItem[]>([]);
  readonly topPerformer = signal<LibraryListInsight | null>(null);
  readonly needsAttention = signal<LibraryListInsight[]>([]);
  readonly summary = signal({
    totalLibraries: 0,
    activeLibraries: 0,
    totalCapacity: 0,
    totalOccupied: 0,
    averageOccupancyPercent: 0,
    nearCapacityCount: 0,
    branchCount: 0,
    revenueMtd: 0,
    revenuePreviousMtd: 0,
    revenueMonthly: 0,
    revenueQuarterly: 0,
    revenueYearly: 0,
    revenueAllTime: 0,
  });

  readonly query = signal('');
  readonly statusFilter = signal<LibraryStatusFilter>('all');
  readonly institutionFilter = signal('all');
  readonly branchFilter = signal('all');
  readonly floorFilter = signal('all');
  readonly occFilter = signal<LibraryOccFilter>('any');
  readonly view = signal<LibraryViewMode>('grid');
  readonly page = signal(1);
  readonly pageSize = signal(12);

  readonly headerDescription = computed(() => {
    const s = this.summary();
    return `${s.totalLibraries.toLocaleString()} libraries · ${s.activeLibraries} active · ${s.averageOccupancyPercent}% avg occupancy`;
  });

  readonly networkMetrics = computed(() => {
    const s = this.summary();
    return [
      { label: 'Active', value: s.activeLibraries.toLocaleString(), highlight: true },
      { label: 'Branches', value: s.branchCount.toLocaleString(), highlight: false },
      { label: 'Capacity', value: s.totalCapacity.toLocaleString(), highlight: false },
      { label: 'Near capacity', value: s.nearCapacityCount.toLocaleString(), highlight: false },
    ];
  });

  readonly needsAttentionIds = computed(() => new Set(this.needsAttention().map((l) => l.libraryId)));

  readonly topPerformerId = computed(() => this.topPerformer()?.libraryId ?? null);

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

  readonly branchOptions = computed(() => {
    const institution = this.institutionFilter();
    const seen = new Map<string, string>();
    for (const item of this.items()) {
      if (institution !== 'all' && item.institutionId !== institution) continue;
      if (!seen.has(item.branchId)) {
        seen.set(item.branchId, item.branchName);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly branchFilterDisabled = computed(() => this.institutionFilter() === 'all');

  readonly floorOptions = computed(() =>
    [...new Set(this.items().map((l) => l.floor).filter((f): f is number => f != null))].sort((a, b) => a - b),
  );

  readonly filtered = computed(() => {
    const institution = this.institutionFilter();
    const branch = this.branchFilter();
    const floor = this.floorFilter();
    const occ = this.occFilter();

    return this.items().filter((l) => {
      if (institution !== 'all' && l.institutionId !== institution) return false;
      if (branch !== 'all' && l.branchId !== branch) return false;
      if (floor !== 'all' && String(l.floor ?? '') !== floor) return false;
      if (!this.matchOcc(l.occupancyPercent, occ)) return false;
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
      this.branchFilter() !== 'all' ||
      this.floorFilter() !== 'all' ||
      this.occFilter() !== 'any',
  );

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(() => this.fetchList().pipe(finalize(() => this.loading.set(false)))),
      )
      .subscribe((view) => this.handleListView(view));

    this.loading.set(true);
    this.fetchList()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((view) => this.handleListView(view));
  }

  load(): void {
    this.loading.set(true);
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

  onStatusChange(value: LibraryStatusFilter): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  onInstitutionChange(value: string): void {
    this.institutionFilter.set(value);
    this.branchFilter.set('all');
    this.page.set(1);
  }

  onBranchChange(value: string): void {
    this.branchFilter.set(value);
    this.page.set(1);
  }

  onFloorChange(value: string): void {
    this.floorFilter.set(value);
    this.page.set(1);
  }

  onOccChange(value: LibraryOccFilter): void {
    this.occFilter.set(value);
    this.page.set(1);
  }

  setView(mode: LibraryViewMode): void {
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
    this.branchFilter.set('all');
    this.floorFilter.set('all');
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

  libraryStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
    const normalized = status.toLowerCase();
    if (normalized === 'active') return 'default';
    if (normalized === 'maintenance') return 'muted';
    if (normalized === 'closed' || normalized === 'inactive') return 'destructive';
    return 'default';
  }

  occupancyBarClass(occupancy: number): string {
    if (occupancy >= 80) return 'branch-occ-bar branch-occ-bar--high';
    if (occupancy >= 50) return 'branch-occ-bar branch-occ-bar--mid';
    return 'branch-occ-bar branch-occ-bar--low';
  }

  isNeedsAttention(libraryId: string): boolean {
    return this.needsAttentionIds().has(libraryId);
  }

  isTopPerformer(libraryId: string): boolean {
    return this.topPerformerId() === libraryId;
  }

  floorLabel(floor?: number | null): string {
    if (floor == null) return '—';
    return `Floor ${floor}`;
  }

  private buildQuery(search: string) {
    const status = this.statusFilter();
    return {
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
    };
  }

  private applyView(view: {
    summary: LibraryListSummary;
    items: LibraryListItem[];
    topPerformer?: LibraryListInsight | null;
    needsAttention: LibraryListInsight[];
  }, revenue?: LibraryListRevenueSummary | null): void {
    this.summary.set(revenue ? { ...view.summary, ...revenue } : view.summary);
    this.items.set(view.items);
    this.topPerformer.set(view.topPerformer ?? null);
    this.needsAttention.set(view.needsAttention ?? []);
  }

  private mergeRevenue(revenue: LibraryListRevenueSummary): void {
    this.summary.update((s) => ({ ...s, ...revenue }));
  }

  private matchOcc(pct: number, filter: LibraryOccFilter): boolean {
    if (filter === 'any') return true;
    if (filter === 'low') return pct < 50;
    if (filter === 'mid') return pct >= 50 && pct < 80;
    return pct >= 80;
  }

  private fetchList() {
    const query = this.buildQuery(this.query());
    return this.librariesApi.getListView(query).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 0) {
          return EMPTY;
        }
        return of(null);
      }),
    );
  }

  private fetchRevenue() {
    return this.librariesApi.getListRevenueSummary(this.buildQuery(this.query())).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 0) {
          return EMPTY;
        }
        return of(null);
      }),
    );
  }

  private handleListView(view: LibraryListView | null): void {
    if (!view) {
      this.error.set('Failed to load libraries.');
      return;
    }
    this.applyView(view);
    this.error.set(null);

    this.fetchRevenue().subscribe((revenue) => {
      if (revenue) {
        this.mergeRevenue(revenue);
      }
    });
  }
}
