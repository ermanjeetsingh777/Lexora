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
  LucideLayers,
  LucideLibrary,
  LucideMapPin,
  LucidePlus,
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
import { SidebarService } from '../../../layouts/sidebar/sidebar.service';

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
    LucideSearch,
    LucideUsers,
    LucideLayers,
    LucideLibrary,
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
  private readonly sidebar = inject(SidebarService);
  private readonly search$ = new Subject<string>();

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
      { label: 'Institutions', value: s.totalInstitutions.toLocaleString(), icon: 'institutions' as const },
      { label: 'Branches', value: s.totalBranches.toLocaleString(), icon: 'branches' as const },
      { label: 'Libraries', value: s.totalLibraries.toLocaleString(), icon: 'libraries' as const },
      { label: 'Members', value: s.totalMembers.toLocaleString(), icon: 'members' as const },
    ];
  });

  readonly portfolioOccupancy = computed(() => this.summary().averageOccupancyPercent);

  readonly portfolioOccupancyTone = computed(() => {
    const occ = this.portfolioOccupancy();
    if (occ >= 80) return 'high';
    if (occ >= 50) return 'mid';
    return 'low';
  });

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
    this.quickView.set(inst);
  }

  closeQuickView(): void {
    this.quickView.set(null);
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

  quickViewActivity(inst: InstitutionListItem): { when: string; text: string; warn: boolean }[] {
    const items: { when: string; text: string; warn: boolean }[] = [
      { when: '2h ago', text: `${Math.max(1, Math.round(inst.memberCount * 0.08))} new check-ins recorded`, warn: false },
      { when: 'Yesterday', text: `${Math.max(1, Math.round(inst.branchCount / 2))} branch report submitted`, warn: false },
    ];
    const occ = Number(inst.occupancyPercent);
    if (occ >= 85) items.unshift({ when: 'now', text: 'Capacity nearing limit', warn: true });
    if (occ > 0 && occ < 35) items.unshift({ when: 'now', text: 'Low utilization alert', warn: true });
    return items;
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
