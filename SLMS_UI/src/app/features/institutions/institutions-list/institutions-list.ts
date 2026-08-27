import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideArrowUpRight,
  LucideBell,
  LucideBuilding2,
  LucideEye,
  LucideIndianRupee,
  LucideMapPin,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTrendingUp,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { InstitutionListItem, InstitutionListView } from '@core/models/institution-detail.models';
import { InstitutionsService } from '../institutions.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { SidebarService } from '../../../layouts/sidebar/sidebar.service';
import {
  buildAreaTrendSvg,
  formatRelativeTime,
  QuickViewActivityItem,
  QuickViewLoadState,
  TrendMetric,
  TrendPoint,
  TrendRangeDays,
} from './institutions-list.util';

type TypeFilter = 'All' | 'School' | 'College' | 'Library' | 'CoachingCenter' | 'University' | 'Coaching' | 'Other';

const TYPE_FILTERS: { value: TypeFilter; label: string; apiType?: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'School', label: 'School', apiType: 'School' },
  { value: 'College', label: 'College', apiType: 'College' },
  { value: 'Library', label: 'Library', apiType: 'Library' },
  { value: 'CoachingCenter', label: 'Coaching', apiType: 'Coaching' },
];

@Component({
  selector: 'app-institutions-list',
  templateUrl: './institutions-list.html',
  styleUrl: './institutions-list.css',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ButtonComponent,
    PageHeaderComponent,
    GlassCardComponent,
    StatusBadgeComponent,
    LucideBuilding2,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideUsers,
    LucideIndianRupee,
    LucideTrendingUp,
    LucideMapPin,
    LucideArrowUpRight,
    LucideBell,
    LucideAlertTriangle,
    LucideEye,
    LucideX,
    LucideActivity,
  ],
})
export class InstitutionsListComponent implements OnInit {
  private readonly institutions = inject(InstitutionsService);
  private readonly organizationEntitlements = inject(OrganizationEntitlementService);
  private readonly sidebar = inject(SidebarService);
  private readonly search$ = new Subject<string>();

  protected readonly canCreateInstitution = this.organizationEntitlements.canCreateInstitution;

  protected readonly Math = Math;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<InstitutionListItem[]>([]);
  readonly summary = signal({
    totalInstitutions: 0,
    totalBranches: 0,
    totalLibraries: 0,
    totalMembers: 0,
    revenueMtd: 0,
    revenuePreviousMtd: 0,
    revenueMonthly: 0,
    revenueQuarterly: 0,
    revenueYearly: 0,
    revenueAllTime: 0,
    averageOccupancyPercent: 0,
  });

  readonly query = signal('');
  readonly type = signal<TypeFilter>('All');
  readonly quickView = signal<InstitutionListItem | null>(null);
  readonly quickViewMetric = signal<TrendMetric>('occupancy');
  readonly quickViewRange = signal<TrendRangeDays>(14);
  readonly quickViewState = signal<QuickViewLoadState>('ready');
  readonly quickViewTrendPoints = signal<TrendPoint[]>([]);
  readonly quickViewActivityItems = signal<QuickViewActivityItem[]>([]);
  readonly activityVisibleCount = signal(4);

  readonly activityPageSize = 4;

  readonly trendRangeOptions: TrendRangeDays[] = [7, 14, 30];

  protected readonly formatRelativeTime = formatRelativeTime;

  readonly typeFilters = TYPE_FILTERS;

  readonly overlayLeft = computed(() => {
    if (this.sidebar.isMobile()) return '0';
    if (this.sidebar.isTablet()) return '4rem';
    return this.sidebar.collapsed() ? '4rem' : '16rem';
  });

  readonly filtered = computed(() => this.items());

  readonly revenueMtdLabel = computed(() => this.formatRevenue(this.summary().revenueMtd));

  readonly revenueMtdDelta = computed(() => {
    const prev = this.summary().revenuePreviousMtd;
    const curr = this.summary().revenueMtd;
    if (prev <= 0) return undefined;
    return ((curr - prev) / prev) * 100;
  });

  readonly revenueCompareMax = computed(() => {
    const s = this.summary();
    return Math.max(s.revenueMtd, s.revenuePreviousMtd, 1);
  });

  readonly revenueMtdCompareWidth = computed(
    () => (this.summary().revenueMtd / this.revenueCompareMax()) * 100,
  );

  readonly revenuePrevCompareWidth = computed(
    () => (this.summary().revenuePreviousMtd / this.revenueCompareMax()) * 100,
  );

  readonly revenuePeriods = computed(() => [
    { label: 'This month', value: this.formatRevenue(this.summary().revenueMonthly), highlight: true },
    { label: 'Quarter', value: this.formatRevenue(this.summary().revenueQuarterly), highlight: false },
    { label: 'Year', value: this.formatRevenue(this.summary().revenueYearly), highlight: false },
    { label: 'All-time', value: this.formatRevenue(this.summary().revenueAllTime), highlight: false },
  ]);

  readonly portfolioMetrics = computed(() => {
    const s = this.summary();
    return [
      { label: 'Institutions', value: s.totalInstitutions.toLocaleString(), highlight: true },
      { label: 'Branches', value: s.totalBranches.toLocaleString(), highlight: false },
      { label: 'Libraries', value: s.totalLibraries.toLocaleString(), highlight: false },
      { label: 'Members', value: s.totalMembers.toLocaleString(), highlight: false },
    ];
  });

  readonly portfolioCompareMax = computed(() => {
    const s = this.summary();
    return Math.max(s.totalBranches, s.totalLibraries, s.totalMembers, 1);
  });

  readonly branchesCompareWidth = computed(
    () => (this.summary().totalBranches / this.portfolioCompareMax()) * 100,
  );

  readonly librariesCompareWidth = computed(
    () => (this.summary().totalLibraries / this.portfolioCompareMax()) * 100,
  );

  readonly portfolioOccupancy = computed(() => this.summary().averageOccupancyPercent);

  readonly portfolioOccupancyLabel = computed(() => {
    const occ = this.portfolioOccupancy();
    if (occ >= 80) return 'High utilization';
    if (occ >= 50) return 'Moderate utilization';
    if (occ > 0) return 'Low utilization';
    return 'No occupancy data';
  });

  readonly portfolioOccupancyTone = computed(() => {
    const occ = this.portfolioOccupancy();
    if (occ >= 80) return 'high';
    if (occ >= 50) return 'mid';
    return 'low';
  });

  readonly quickViewTrendChart = computed(() =>
    buildAreaTrendSvg(this.quickViewTrendPoints(), this.quickViewMetric()),
  );

  readonly quickViewActivity = computed(() => this.quickViewActivityItems());

  readonly visibleQuickViewActivity = computed(() =>
    this.quickViewActivityItems().slice(0, this.activityVisibleCount()),
  );

  readonly hasMoreActivity = computed(
    () => this.quickViewActivityItems().length > this.activityVisibleCount(),
  );

  readonly remainingActivityCount = computed(
    () => this.quickViewActivityItems().length - this.activityVisibleCount(),
  );

  readonly trendTooltip = signal<{ left: number; top: number; text: string } | null>(null);

  readonly trendHoverIndex = signal<number | null>(null);

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(() => this.fetchList()),
      )
      .subscribe({
        next: (view) => this.applyView(view),
        error: () => {
          this.error.set('Failed to load institutions.');
          this.loading.set(false);
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.fetchList().subscribe({
      next: (view) => this.applyView(view),
      error: () => {
        this.error.set('Failed to load institutions.');
        this.loading.set(false);
      },
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.search$.next(value);
  }

  setType(t: TypeFilter): void {
    this.type.set(t);
    this.load();
  }

  openQuickView(inst: InstitutionListItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickViewMetric.set('occupancy');
    this.quickViewRange.set(14);
    this.activityVisibleCount.set(this.activityPageSize);
    this.quickView.set(inst);
    this.loadQuickView(inst.id);
  }

  closeQuickView(): void {
    this.quickView.set(null);
    this.quickViewTrendPoints.set([]);
    this.quickViewActivityItems.set([]);
    this.activityVisibleCount.set(this.activityPageSize);
    this.quickViewState.set('ready');
    this.clearTrendTooltip();
  }

  setQuickViewMetric(metric: TrendMetric): void {
    if (this.quickViewMetric() === metric) return;
    this.quickViewMetric.set(metric);
    const inst = this.quickView();
    if (inst) this.loadQuickView(inst.id);
  }

  setQuickViewRange(days: TrendRangeDays): void {
    if (this.quickViewRange() === days) return;
    this.quickViewRange.set(days);
    const inst = this.quickView();
    if (inst) this.loadQuickView(inst.id);
  }

  retryQuickViewLoad(): void {
    const inst = this.quickView();
    if (inst) this.loadQuickView(inst.id);
  }

  showTrendTooltip(event: MouseEvent, index: number, chartWidth: number, chartHeight: number): void {
    const chart = this.quickViewTrendChart();
    const pt = chart.plotPoints[index];
    if (!pt) return;

    const wrap = (event.currentTarget as SVGElement).closest('.inst-trend__chart-wrap') as HTMLElement | null;
    if (!wrap) return;

    const svg = wrap.querySelector('svg');
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const scaleX = svgRect.width / chartWidth;
    const scaleY = svgRect.height / chartHeight;
    const cx = pt.x * scaleX;
    const cy = pt.y * scaleY;

    this.trendHoverIndex.set(index);
    this.trendTooltip.set({
      left: cx + (svgRect.left - wrapRect.left),
      top: Math.max(0, cy + (svgRect.top - wrapRect.top) - 36),
      text: pt.label,
    });
  }

  clearTrendTooltip(): void {
    this.trendTooltip.set(null);
    this.trendHoverIndex.set(null);
  }

  loadMoreActivity(): void {
    const next = this.activityVisibleCount() + this.activityPageSize;
    this.activityVisibleCount.set(
      Math.min(next, this.quickViewActivityItems().length),
    );
  }

  private loadQuickView(institutionId: string): void {
    this.clearTrendTooltip();
    this.activityVisibleCount.set(this.activityPageSize);
    this.quickViewState.set('loading');
    this.institutions
      .getQuickView(institutionId, {
        metric: this.quickViewMetric(),
        range: this.quickViewRange(),
      })
      .pipe(catchError(() => of(null)))
      .subscribe((view) => {
        if (!view) {
          this.quickViewTrendPoints.set([]);
          this.quickViewActivityItems.set([]);
          this.quickViewState.set('error');
          return;
        }

        this.quickViewTrendPoints.set(view.trend?.points ?? []);
        this.quickViewActivityItems.set(view.activity ?? []);
        this.quickViewState.set('ready');
      });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  alertCount(inst: InstitutionListItem): number {
    const occ = Number(inst.occupancyPercent);
    return occ >= 85 || (occ > 0 && occ < 35) ? 1 : 0;
  }

  occupancyBarClass(occupancy: number): string {
    if (occupancy >= 80) return 'bg-success';
    if (occupancy >= 50) return 'bg-primary';
    return 'bg-warning';
  }

  formatRevenue(revenue: number): string {
    if (revenue <= 0) return '₹0';
    if (revenue >= 100000) return `₹${(revenue / 100000).toFixed(1)}L`;
    if (revenue >= 1000) return `₹${(revenue / 1000).toFixed(1)}k`;
    return `₹${revenue.toFixed(0)}`;
  }

  revenueLabel(revenue: number): string {
    return this.formatRevenue(revenue);
  }

  private fetchList() {
    const filter = this.typeFilters.find((f) => f.value === this.type());
    return this.institutions
      .getListView({
        search: this.query().trim() || undefined,
        type: filter?.apiType,
      })
      .pipe(catchError(() => of(null)));
  }

  private applyView(view: InstitutionListView | null): void {
    if (!view) {
      this.error.set('Failed to load institutions.');
      this.loading.set(false);
      return;
    }
    this.summary.set(view.summary);
    this.items.set(view.items ?? []);
    this.loading.set(false);
    this.error.set(null);
  }
}
