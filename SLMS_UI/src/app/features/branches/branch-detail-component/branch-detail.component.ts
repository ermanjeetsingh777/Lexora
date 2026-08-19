import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideArrowLeft,
  LucideBookOpen,
  LucideBuilding2,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideClock,
  LucideFootprints,
  LucideIndianRupee,
  LucideLibrary,
  LucideMail,
  LucideMapPin,
  LucideMoreHorizontal,
  LucidePhone,
  LucidePlus,
  LucideSearch,
  LucideShieldCheck,
  LucideUserCog,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import {
  BranchActivityFilter,
  BranchDetailTab,
  BranchDetailView,
} from '@core/models/branch-detail.models';
import { BranchService } from '../branch.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { buttonVariants } from '@shared/components/button/button.variants';
import {
  GlassCardComponent,
  PageHeaderComponent,
  SectionHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import {
  activityDotClass,
  buildBranchOccupancyAreaChartData,
  buildBranchOccupancyAreaChartOptions,
  buildFootfallChartData,
  buildFootfallChartOptions,
  FOOTFALL_SHIFT_LEGEND,
  buildPeakHoursChartData,
  buildPeakHoursChartOptions,
  buildShiftMixChartData,
  buildShiftMixChartOptions,
  buildShiftMixTotals,
  formatActivityTime,
} from './branch-detail.util';
import {
  getHeatmapValue,
  heatmapCellColor,
  normalizeOccupancyHeatmap,
} from '../../institutions/institution-detail/institution-detail.util';

const TABS: { id: BranchDetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'usage', label: 'Usage' },
  { id: 'libraries', label: 'Libraries' },
  { id: 'staffing', label: 'Staffing' },
  { id: 'activity', label: 'Activity' },
];

const ACTIVITY_FILTERS: { id: BranchActivityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'check-in', label: 'Check-in' },
  { id: 'payment', label: 'Payment' },
  { id: 'enrollment', label: 'Enrollment' },
];

type LibraryStatusFilter = 'all' | 'Active' | 'Maintenance' | 'Closed';
type LibraryOccFilter = 'any' | 'low' | 'mid' | 'high';

const LIBRARY_STATUSES: LibraryStatusFilter[] = ['all', 'Active', 'Maintenance', 'Closed'];
const LIBRARY_OCC_FILTERS: { value: LibraryOccFilter; label: string }[] = [
  { value: 'any', label: 'Any occupancy' },
  { value: 'low', label: '< 50%' },
  { value: 'mid', label: '50–80%' },
  { value: 'high', label: '80%+' },
];
const LIST_PAGE_SIZE_OPTS = [5, 10, 15, 30] as const;
const ACTIVITY_PAGE_SIZE_OPTS = [15, 25, 50] as const;

@Component({
  selector: 'app-branch-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DecimalPipe,
    PageHeaderComponent,
    GlassCardComponent,
    SectionHeaderComponent,
    StatusBadgeComponent,
    ButtonComponent,
    ChartModule,
    SelectButtonModule,
    LucideArrowLeft,
    LucideBuilding2,
    LucideIndianRupee,
    LucideUsers,
    LucideActivity,
    LucideAlertTriangle,
    LucideFootprints,
    LucideUserCog,
    LucideMapPin,
    LucideClock,
    LucideMail,
    LucidePhone,
    LucideShieldCheck,
    LucideBookOpen,
    LucideLibrary,
    LucideSearch,
    LucideX,
    LucidePlus,
    LucideMoreHorizontal,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
  ],
  templateUrl: './branch-detail.component.html',
  styleUrls: [
    './branch-detail.component.css',
    '../../institutions/institution-detail/institution-detail.component.css',
    '../../institutions/institutions-list/institutions-list.css',
  ],
})
export class BranchDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly branchesApi = inject(BranchService);

  protected readonly Math = Math;

  readonly tabs = TABS;
  readonly activityFilters = ACTIVITY_FILTERS;
  readonly footfallLegend = FOOTFALL_SHIFT_LEGEND;
  readonly libraryStatuses = LIBRARY_STATUSES;
  readonly libraryOccFilters = LIBRARY_OCC_FILTERS;
  readonly LIST_PAGE_SIZE_OPTS = LIST_PAGE_SIZE_OPTS;
  readonly ACTIVITY_PAGE_SIZE_OPTS = ACTIVITY_PAGE_SIZE_OPTS;
  readonly heatmapLegend = [10, 30, 50, 70, 95];
  readonly heatmapCellColor = heatmapCellColor;
  readonly getHeatmapValue = getHeatmapValue;
  readonly formatActivityTime = formatActivityTime;
  readonly activityDotClass = activityDotClass;
  readonly emailButtonClass = buttonVariants({ variant: 'outline', size: 'sm' });
  readonly callButtonClass = buttonVariants({ variant: 'default', size: 'sm' });

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<BranchDetailView | null>(null);
  readonly tab = signal<BranchDetailTab>('overview');
  readonly activityFilter = signal<BranchActivityFilter>('all');
  readonly libraryQuery = signal('');
  readonly libraryStatus = signal<LibraryStatusFilter>('all');
  readonly libraryOcc = signal<LibraryOccFilter>('any');
  readonly libraryPage = signal(1);
  readonly libraryPageSize = signal(10);
  readonly activityPage = signal(1);
  readonly activityPageSize = signal(25);

  readonly branchId = computed(() => this.route.snapshot.paramMap.get('branchId') ?? '');

  readonly institutionIdFromRoute = computed(
    () => this.route.snapshot.paramMap.get('institutionId'),
  );

  readonly backLink = computed(() => {
    const institutionId = this.institutionIdFromRoute();
    if (institutionId) {
      return ['/institutions', institutionId];
    }
    return ['/branches'];
  });

  readonly backQueryParams = computed(() => {
    if (this.institutionIdFromRoute()) {
      return { tab: 'branches' };
    }
    return undefined;
  });

  readonly pageEyebrow = computed(() =>
    this.institutionIdFromRoute() ? 'Institutions' : 'Branches',
  );

  readonly subtitle = computed(() => {
    const d = this.detail();
    if (!d) return '';
    const parts = [d.institutionName, d.city, d.managerName ? `Manager ${d.managerName}` : null].filter(Boolean);
    return parts.join(' · ');
  });

  readonly branchMetrics = computed(() => {
    const d = this.detail();
    if (!d) return [];
    return [
      { label: 'Libraries', value: d.libraryCount.toLocaleString(), highlight: false },
      { label: 'Members', value: d.memberCount.toLocaleString(), highlight: true },
      { label: 'Avg footfall', value: d.avgFootfallPerDay.toLocaleString(), highlight: false },
      { label: 'Capacity', value: d.capacity.toLocaleString(), highlight: false },
    ];
  });

  readonly branchOccupancy = computed(() => this.detail()?.occupancyPercent ?? 0);

  readonly branchOccupancyLabel = computed(() => {
    const occ = this.branchOccupancy();
    if (occ >= 80) return 'High utilization';
    if (occ >= 50) return 'Moderate utilization';
    if (occ > 0) return 'Low utilization';
    return 'No occupancy data';
  });

  readonly branchOccupancyTone = computed(() => {
    const occ = this.branchOccupancy();
    if (occ >= 80) return 'high';
    if (occ >= 50) return 'mid';
    return 'low';
  });

  readonly revenueMtdLabel = computed(() => this.formatRevenue(this.detail()?.revenueMtd ?? 0));

  readonly revenueMtdDelta = computed(() => {
    const d = this.detail();
    if (!d) return undefined;
    const prev = d.revenuePreviousMtd;
    const curr = d.revenueMtd;
    if (prev <= 0) return undefined;
    return ((curr - prev) / prev) * 100;
  });

  readonly revenuePeriods = computed(() => {
    const d = this.detail();
    if (!d) return [];
    return [
      { label: 'This month', value: this.formatRevenue(d.revenueMonthly), highlight: true },
      { label: 'Quarter', value: this.formatRevenue(d.revenueQuarterly), highlight: false },
      { label: 'Year', value: this.formatRevenue(d.revenueYearly), highlight: false },
      { label: 'All-time', value: this.formatRevenue(d.revenueAllTime), highlight: false },
    ];
  });

  readonly filteredActivity = computed(() => {
    const filter = this.activityFilter();
    const items = this.detail()?.activity ?? [];
    if (filter === 'all') return items;
    return items.filter((a) => a.type === filter);
  });

  readonly activityTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredActivity().length / this.activityPageSize())),
  );

  readonly activityCurrentPage = computed(() =>
    Math.min(this.activityPage(), this.activityTotalPages()),
  );

  readonly activityPageStart = computed(() =>
    (this.activityCurrentPage() - 1) * this.activityPageSize(),
  );

  readonly pagedActivity = computed(() => {
    const start = this.activityPageStart();
    return this.filteredActivity().slice(start, start + this.activityPageSize());
  });

  readonly recentActivity = computed(() => (this.detail()?.activity ?? []).slice(0, 10));

  readonly heatmap = computed(() => normalizeOccupancyHeatmap(this.detail()?.occupancyHeatmap));
  readonly hasHeatmap = computed(() => {
    const h = this.heatmap();
    return h.days.length > 0 && h.hours.length > 0;
  });

  readonly occupancyChartData = computed(() =>
    buildBranchOccupancyAreaChartData(this.detail()?.occupancyTrend ?? []),
  );
  readonly occupancyChartOptions = computed(() => {
    const max = Math.max(0, ...(this.detail()?.occupancyTrend ?? []).map((p) => p.value));
    return buildBranchOccupancyAreaChartOptions(max);
  });

  readonly footfallChartData = computed(() =>
    buildFootfallChartData(this.detail()?.footfallByShift ?? []),
  );
  readonly footfallChartOptions = computed(() => {
    const points = this.detail()?.footfallByShift ?? [];
    const max = points.reduce(
      (m, p) => Math.max(m, p.morning, p.afternoon, p.evening, p.night),
      0,
    );
    return buildFootfallChartOptions(max);
  });

  readonly peakHoursChartData = computed(() =>
    buildPeakHoursChartData(this.detail()?.peakHours ?? []),
  );
  readonly peakHoursChartOptions = computed(() => {
    const max = Math.max(0, ...(this.detail()?.peakHours ?? []).map((p) => p.checkIns));
    return buildPeakHoursChartOptions(max);
  });

  readonly shiftMixTotals = computed(() =>
    buildShiftMixTotals(this.detail()?.footfallByShift ?? []),
  );
  readonly hasShiftMixData = computed(() =>
    this.shiftMixTotals().some((item) => item.value > 0),
  );
  readonly shiftMixChartData = computed(() =>
    buildShiftMixChartData(this.detail()?.footfallByShift ?? []),
  );
  readonly shiftMixChartOptions = buildShiftMixChartOptions();

  readonly allLibraries = computed(() => this.detail()?.libraries ?? []);

  readonly filteredLibraries = computed(() => {
    const libraries = this.allLibraries();
    const q = this.libraryQuery().trim().toLowerCase();
    const status = this.libraryStatus();
    const occ = this.libraryOcc();

    return libraries.filter((lib) => {
      if (status !== 'all' && lib.status !== status) return false;
      if (!this.matchLibraryOcc(lib.occupancyPercent, occ)) return false;
      if (!q) return true;
      const floorLabel = lib.floor != null ? `floor ${lib.floor}` : '';
      return [lib.name, lib.city, floorLabel].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  });

  readonly hasLibraryFilters = computed(
    () => !!this.libraryQuery() || this.libraryStatus() !== 'all' || this.libraryOcc() !== 'any',
  );

  readonly libraryTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredLibraries().length / this.libraryPageSize())),
  );

  readonly libraryCurrentPage = computed(() =>
    Math.min(this.libraryPage(), this.libraryTotalPages()),
  );

  readonly libraryPageStart = computed(() =>
    (this.libraryCurrentPage() - 1) * this.libraryPageSize(),
  );

  readonly pagedLibraries = computed(() => {
    const start = this.libraryPageStart();
    return this.filteredLibraries().slice(start, start + this.libraryPageSize());
  });

  readonly staffOnDutyCount = computed(() => this.detail()?.staff.length ?? 0);

  ngOnInit(): void {
    this.load();
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab') as BranchDetailTab | null;
      if (tab && TABS.some((t) => t.id === tab)) this.tab.set(tab);
      const af = params.get('af') as BranchActivityFilter | null;
      if (af && ACTIVITY_FILTERS.some((f) => f.id === af)) this.activityFilter.set(af);
    });
  }

  load(): void {
    const id = this.branchId();
    if (!id) {
      this.error.set('Invalid branch.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.branchesApi
      .getDetailView(id)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((view) => {
        if (!view) {
          this.error.set('Branch not found or you do not have access.');
          this.detail.set(null);
          return;
        }
        this.detail.set(view);
        this.error.set(null);
      });
  }

  setTab(value: BranchDetailTab): void {
    this.tab.set(value);
  }

  setActivityFilter(value: BranchActivityFilter): void {
    this.activityFilter.set(value);
    this.activityPage.set(1);
  }

  setActivityPageSize(size: number): void {
    this.activityPageSize.set(size);
    this.activityPage.set(1);
  }

  goToActivityPage(page: number): void {
    this.activityPage.set(Math.max(1, Math.min(page, this.activityTotalPages())));
  }

  clearLibraryFilters(): void {
    this.libraryQuery.set('');
    this.libraryStatus.set('all');
    this.libraryOcc.set('any');
    this.libraryPage.set(1);
  }

  onLibraryQueryChange(value: string): void {
    this.libraryQuery.set(value);
    this.libraryPage.set(1);
  }

  onLibraryStatusChange(value: LibraryStatusFilter): void {
    this.libraryStatus.set(value);
    this.libraryPage.set(1);
  }

  onLibraryOccChange(value: LibraryOccFilter): void {
    this.libraryOcc.set(value);
    this.libraryPage.set(1);
  }

  setLibraryPageSize(size: number): void {
    this.libraryPageSize.set(size);
    this.libraryPage.set(1);
  }

  goToLibraryPage(page: number): void {
    this.libraryPage.set(Math.max(1, Math.min(page, this.libraryTotalPages())));
  }

  libraryStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
    return this.branchStatusVariant(status);
  }

  branchStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
    const normalized = status.toLowerCase();
    if (normalized === 'active') return 'default';
    if (normalized === 'maintenance') return 'muted';
    if (normalized === 'closed' || normalized === 'inactive') return 'destructive';
    return 'default';
  }

  formatRevenue(revenue: number): string {
    if (revenue <= 0) return '₹0';
    if (revenue >= 100000) return `₹${(revenue / 100000).toFixed(1)}L`;
    if (revenue >= 1000) return `₹${(revenue / 1000).toFixed(1)}k`;
    return `₹${revenue.toFixed(0)}`;
  }

  private matchLibraryOcc(occupancyPercent: number, filter: LibraryOccFilter): boolean {
    if (filter === 'low') return occupancyPercent < 50;
    if (filter === 'mid') return occupancyPercent >= 50 && occupancyPercent < 80;
    if (filter === 'high') return occupancyPercent >= 80;
    return true;
  }
}
