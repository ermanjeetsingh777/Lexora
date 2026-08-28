import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideArrowLeft,
  LucideArrowUpRight,
  LucideBuilding2,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideCreditCard,
  LucideDownload,
  LucideIndianRupee,
  LucideLibrary,
  LucideMapPin,
  LucideMoreHorizontal,
  LucidePlus,
  LucideReceipt,
  LucideRefreshCw,
  LucideSearch,
  LucideSettings,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import {
  GlassCardComponent,
  PageHeaderComponent,
  SectionHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InvoiceDetailSheetComponent } from '@shared/components/invoice-detail-sheet/invoice-detail-sheet.component';
import { buildInvoiceDocument } from '@shared/utils/invoice-pdf.util';
import {
  InstitutionBilling,
  InstitutionBillingInvoice,
  InstitutionBranchesView,
  InstitutionDetail,
  InstitutionDetailTab,
  InstitutionLibrariesView,
  InstitutionOverview,
  UpdateInstitutionRequest,
} from '@core/models/institution-detail.models';
import { InstitutionsService } from '../institutions.service';
import { AuthService } from '@core/services/auth.service';
import { PermissionKey } from '@core/constants/permissions';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { ToastService } from '@core/services/toast.service';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import {
  buildAttendanceChartData,
  buildAttendanceChartOptions,
  buildMemberMixChartData,
  buildMemberMixChartOptions,
  buildOccupancyChartData,
  buildOccupancyChartOptions,
  buildRevenueChartData,
  buildRevenueChartOptions,
  getHeatmapValue,
  heatmapCellColor,
  memberMixColors,
  normalizeOccupancyHeatmap,
} from './institution-detail.util';
import { libraryDetailLink as buildLibraryDetailLink, memberDetailLink as buildMemberDetailLink } from '@core/utils/entity-routes.util';
import { ScopedMembersPanelComponent } from '../../members/components/scoped-members-panel/scoped-members-panel.component';

type BranchStatusFilter = 'all' | 'Active' | 'Maintenance' | 'Closed';
type BranchCapFilter = 'any' | 'small' | 'mid' | 'large';
type LibraryStatusFilter = 'all' | 'Active' | 'Maintenance' | 'Closed';
type LibraryOccFilter = 'any' | 'low' | 'mid' | 'high';
type LibraryBranchFilter = 'all' | string;
type BillingStatusFilter = 'all' | 'paid' | 'due' | 'pending' | 'failed' | 'refunded';

const BRANCH_STATUSES: BranchStatusFilter[] = ['all', 'Active', 'Maintenance', 'Closed'];
const LIBRARY_STATUSES: LibraryStatusFilter[] = ['all', 'Active', 'Maintenance', 'Closed'];
const BILLING_STATUSES: BillingStatusFilter[] = ['all', 'paid', 'due', 'pending', 'failed', 'refunded'];
const BRANCH_CAPS: { value: BranchCapFilter; label: string }[] = [
  { value: 'any', label: 'Any size' },
  { value: 'small', label: '< 50' },
  { value: 'mid', label: '50–150' },
  { value: 'large', label: '150+' },
];
const LIBRARY_OCC_FILTERS: { value: LibraryOccFilter; label: string }[] = [
  { value: 'any', label: 'Any occupancy' },
  { value: 'low', label: '< 50%' },
  { value: 'mid', label: '50–80%' },
  { value: 'high', label: '80%+' },
];
const LIST_PAGE_SIZE_OPTS = [5, 10, 15, 30] as const;

@Component({
  selector: 'app-institution-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DecimalPipe,
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    PageHeaderComponent,
    GlassCardComponent,
    SectionHeaderComponent,
    KpiCardComponent,
    StatusBadgeComponent,
    ButtonComponent,
    InvoiceDetailSheetComponent,
    ChartModule,
    SelectButtonModule,
    LucideArrowLeft,
    LucideBuilding2,
    LucideLibrary,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideUsers,
    LucideActivity,
    LucideAlertTriangle,
    LucideSearch,
    LucideX,
    LucidePlus,
    LucideMapPin,
    LucideMoreHorizontal,
    LucideArrowUpRight,
    LucideRefreshCw,
    LucideSettings,
    LucideCreditCard,
    LucideReceipt,
    LucideDownload,
    LucideIndianRupee,
    ScopedMembersPanelComponent,
  ],
  templateUrl: './institution-detail.component.html',
  styleUrls: ['./institution-detail.component.css', '../institutions-list/institutions-list.css'],
})
export class InstitutionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly institutions = inject(InstitutionsService);
  private readonly organizationEntitlements = inject(OrganizationEntitlementService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly canCreateBranch = computed(
    () => this.organizationEntitlements.canCreateBranch() && this.auth.hasPermission(PermissionKey.BranchesCreate)
  );
  protected readonly canCreateLibrary = computed(
    () => this.organizationEntitlements.canCreateLibrary() && this.auth.hasPermission(PermissionKey.LibrariesCreate)
  );
  protected readonly canUpdateInstitution = computed(
    () => this.auth.hasPermission(PermissionKey.InstitutionsUpdate)
  );
  protected readonly canDeleteInstitution = computed(
    () => this.auth.hasPermission(PermissionKey.InstitutionsDelete)
  );

  protected readonly Math = Math;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly institution = signal<InstitutionDetail | null>(null);
  readonly overview = signal<InstitutionOverview | null>(null);
  readonly branchesView = signal<InstitutionBranchesView | null>(null);
  readonly librariesView = signal<InstitutionLibrariesView | null>(null);
  readonly billing = signal<InstitutionBilling | null>(null);

  readonly tab = signal<InstitutionDetailTab>('overview');
  readonly branchQuery = signal('');
  readonly branchStatus = signal<BranchStatusFilter>('all');
  readonly branchCap = signal<BranchCapFilter>('any');
  readonly libraryQuery = signal('');
  readonly libraryStatus = signal<LibraryStatusFilter>('all');
  readonly libraryBranch = signal<LibraryBranchFilter>('all');
  readonly libraryOcc = signal<LibraryOccFilter>('any');
  readonly billingQuery = signal('');
  readonly billingStatus = signal<BillingStatusFilter>('all');

  readonly settingsForm = signal<UpdateInstitutionRequest>({});

  readonly branchStatuses = BRANCH_STATUSES;
  readonly branchCaps = BRANCH_CAPS;
  readonly libraryStatuses = LIBRARY_STATUSES;
  readonly libraryOccFilters = LIBRARY_OCC_FILTERS;
  readonly billingStatuses = BILLING_STATUSES;
  readonly LIST_PAGE_SIZE_OPTS = LIST_PAGE_SIZE_OPTS;
  readonly branchPage = signal(1);
  readonly branchPageSize = signal(10);
  readonly libraryPage = signal(1);
  readonly libraryPageSize = signal(10);
  readonly billingPage = signal(1);
  readonly billingPageSize = signal(10);
  readonly selectedInvoice = signal<InstitutionBillingInvoice | null>(null);
  readonly heatmapLegend = [10, 30, 50, 70, 95];
  readonly memberMixLegend = memberMixColors();
  readonly heatmapCellColor = heatmapCellColor;
  readonly getHeatmapValue = getHeatmapValue;

  readonly tabs: { id: InstitutionDetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'branches', label: 'Branches' },
    { id: 'libraries', label: 'Libraries' },
    { id: 'members', label: 'Members' },
    { id: 'billing', label: 'Billing' },
    { id: 'settings', label: 'Settings' },
  ];

  readonly showSummaryCards = computed(() => {
    const current = this.tab();
    return current === 'overview' || current === 'branches' || current === 'libraries' || current === 'members' || current === 'billing';
  });

  readonly institutionId = computed(() => this.route.snapshot.paramMap.get('institutionId') ?? '');

  libraryDetailLink(libraryId: string, branchId: string): string[] {
    return buildLibraryDetailLink(libraryId, {
      institutionId: this.institutionId(),
      libraryBranchId: branchId,
      onInstitutionRoute: true,
    });
  }

  memberDetailLink(memberId: string): string[] {
    return buildMemberDetailLink(memberId, {
      institutionId: this.institutionId(),
      onInstitutionRoute: true,
    });
  }

  readonly subtitle = computed(() => {
    const inst = this.institution();
    if (!inst) return '';
    const parts = [inst.type, inst.city, inst.country].filter(Boolean);
    return parts.join(' · ');
  });

  readonly occupancyLabel = computed(() => {
    const pct = this.overview()?.occupancyPercent ?? 0;
    if (pct > 85) return 'Tight';
    if (pct > 60) return 'Healthy';
    return 'Slack';
  });

  readonly occupancyBadgeClass = computed(() => {
    const pct = this.overview()?.occupancyPercent ?? 0;
    if (pct > 85) return 'inst-detail-badge inst-detail-badge--tight';
    if (pct > 60) return 'inst-detail-badge inst-detail-badge--healthy';
    return 'inst-detail-badge inst-detail-badge--slack';
  });

  readonly institutionOccupancy = computed(() => this.overview()?.occupancyPercent ?? 0);

  readonly institutionOccupancyLabel = computed(() => {
    const occ = this.institutionOccupancy();
    if (occ >= 80) return 'High utilization';
    if (occ >= 50) return 'Moderate utilization';
    if (occ > 0) return 'Low utilization';
    return 'No occupancy data';
  });

  readonly institutionOccupancyTone = computed(() => {
    const occ = this.institutionOccupancy();
    if (occ >= 80) return 'high';
    if (occ >= 50) return 'mid';
    return 'low';
  });

  readonly institutionMetrics = computed(() => {
    const ov = this.overview();
    if (!ov) {
      return [
        { label: 'Branches', value: '0', highlight: true },
        { label: 'Libraries', value: '0', highlight: false },
        { label: 'Members', value: '0', highlight: false },
        { label: 'Seats', value: '0', highlight: false },
      ];
    }

    return [
      { label: 'Branches', value: ov.activeBranchCount.toLocaleString(), highlight: true },
      { label: 'Libraries', value: ov.totalLibraryCount.toLocaleString(), highlight: false },
      { label: 'Members', value: ov.enrolledMemberCount.toLocaleString(), highlight: false },
      { label: 'Seats', value: ov.totalSeats.toLocaleString(), highlight: false },
    ];
  });

  readonly revenueMtdLabel = computed(() => this.formatRevenue(this.overview()?.revenueMtd ?? 0));

  readonly revenueMtdDelta = computed(() => {
    const ov = this.overview();
    if (!ov) return undefined;
    const prev = ov.revenuePreviousMtd ?? 0;
    const curr = ov.revenueMtd ?? 0;
    if (prev <= 0) return undefined;
    return ((curr - prev) / prev) * 100;
  });

  readonly revenuePeriods = computed(() => {
    const ov = this.overview();
    return [
      { label: 'This month', value: this.formatRevenue(ov?.revenueMonthly ?? ov?.revenueMtd ?? 0), highlight: true },
      { label: 'Quarter', value: this.formatRevenue(ov?.revenueQuarterly ?? 0), highlight: false },
      { label: 'Year', value: this.formatRevenue(ov?.revenueYearly ?? 0), highlight: false },
      { label: 'All-time', value: this.formatRevenue(ov?.revenueAllTime ?? 0), highlight: false },
    ];
  });

  readonly revenueChartData = computed(() => {
    const points = (this.overview()?.revenueTrend ?? []).map((p) => ({
      date: p.date,
      revenue: p.revenue ?? 0,
      renewals: p.renewals ?? 0,
    }));
    return buildRevenueChartData(points);
  });

  readonly revenueChartMax = computed(() => {
    const points = this.overview()?.revenueTrend ?? [];
    return Math.max(
      0,
      ...points.map((p) => Math.max(p.revenue ?? 0, p.renewals ?? 0)),
    );
  });

  readonly revenueChartOptions = computed(() => buildRevenueChartOptions(this.revenueChartMax()));

  readonly occupancyChartData = computed(() => {
    const points = (this.overview()?.occupancyTrend ?? []).map((p) => ({
      date: p.date,
      value: p.value ?? 0,
    }));
    return buildOccupancyChartData(points);
  });

  readonly occupancyChartMax = computed(() => {
    const points = this.overview()?.occupancyTrend ?? [];
    return Math.max(0, ...points.map((p) => p.value ?? 0));
  });

  readonly occupancyChartOptions = computed(() => buildOccupancyChartOptions(this.occupancyChartMax()));

  readonly memberMixChartData = computed(() => {
    const mix = this.overview()?.memberMix ?? { active: 0, inactive: 0, suspended: 0 };
    return buildMemberMixChartData(mix);
  });

  readonly memberMixChartOptions = computed(() => buildMemberMixChartOptions());

  readonly hasMemberMixData = computed(() => {
    const mix = this.overview()?.memberMix;
    if (!mix) return false;
    return mix.active + mix.inactive + mix.suspended > 0;
  });

  readonly attendanceChartData = computed(() => {
    const points = (this.overview()?.attendanceTrend ?? []).map((p) => ({
      date: p.date,
      present: p.present,
      late: p.late,
      absent: p.absent,
    }));
    return buildAttendanceChartData(points);
  });

  readonly attendanceChartMax = computed(() => {
    const points = this.overview()?.attendanceTrend ?? [];
    return Math.max(0, ...points.map((p) => p.present + p.late + p.absent));
  });

  readonly attendanceChartOptions = computed(() =>
    buildAttendanceChartOptions(this.attendanceChartMax()),
  );

  readonly heatmap = computed(() =>
    normalizeOccupancyHeatmap(this.overview()?.occupancyHeatmap),
  );

  readonly hasHeatmap = computed(() => {
    const heatmap = this.heatmap();
    return heatmap.days.length > 0 && heatmap.hours.length > 0;
  });

  readonly filteredBranches = computed(() => {
    const view = this.branchesView();
    if (!view) return [];
    const q = this.branchQuery().trim().toLowerCase();
    const status = this.branchStatus();
    const cap = this.branchCap();

    return view.branches.filter((b) => {
      if (status !== 'all' && b.status !== status) return false;
      if (!this.matchCap(b.capacity, cap)) return false;
      if (!q) return true;
      return [b.name, b.city, b.contact].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  });

  readonly allLibraries = computed(() => this.librariesView()?.libraries ?? []);

  readonly libraryBranchOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const lib of this.allLibraries()) {
      if (!seen.has(lib.branchId)) {
        seen.set(lib.branchId, lib.branchName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  });

  readonly filteredLibraries = computed(() => {
    const libraries = this.allLibraries();
    const q = this.libraryQuery().trim().toLowerCase();
    const status = this.libraryStatus();
    const branch = this.libraryBranch();
    const occ = this.libraryOcc();

    return libraries.filter((lib) => {
      if (status !== 'all' && lib.status !== status) return false;
      if (branch !== 'all' && lib.branchId !== branch) return false;
      if (!this.matchLibraryOcc(lib.occupancyPercent, occ)) return false;
      if (!q) return true;
      const floorLabel = lib.floor != null ? `floor ${lib.floor}` : '';
      return [lib.name, lib.branchName, lib.city, floorLabel].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      );
    });
  });

  readonly hasLibraryFilters = computed(
    () =>
      !!this.libraryQuery() ||
      this.libraryStatus() !== 'all' ||
      this.libraryBranch() !== 'all' ||
      this.libraryOcc() !== 'any',
  );

  readonly hasBranchFilters = computed(
    () => !!this.branchQuery() || this.branchStatus() !== 'all' || this.branchCap() !== 'any',
  );

  readonly branchTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredBranches().length / this.branchPageSize())),
  );

  readonly branchCurrentPage = computed(() =>
    Math.min(this.branchPage(), this.branchTotalPages()),
  );

  readonly branchPageStart = computed(() =>
    (this.branchCurrentPage() - 1) * this.branchPageSize(),
  );

  readonly pagedBranches = computed(() => {
    const start = this.branchPageStart();
    return this.filteredBranches().slice(start, start + this.branchPageSize());
  });

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

  readonly allInvoices = computed(() => this.billing()?.invoices ?? []);

  readonly filteredInvoices = computed(() => {
    const invoices = this.allInvoices();
    const q = this.billingQuery().trim().toLowerCase();
    const status = this.billingStatus();

    return invoices.filter((inv) => {
      if (status !== 'all' && inv.status.toLowerCase() !== status) return false;
      if (!q) return true;
      const plan = inv.planName || this.invoicePlanLabel(inv.description);
      return [inv.number, inv.memberName, inv.description, plan].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      );
    });
  });

  readonly hasBillingFilters = computed(
    () => !!this.billingQuery() || this.billingStatus() !== 'all',
  );

  readonly billingTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredInvoices().length / this.billingPageSize())),
  );

  readonly billingCurrentPage = computed(() =>
    Math.min(this.billingPage(), this.billingTotalPages()),
  );

  readonly billingPageStart = computed(() =>
    (this.billingCurrentPage() - 1) * this.billingPageSize(),
  );

  readonly pagedInvoices = computed(() => {
    const start = this.billingPageStart();
    return this.filteredInvoices().slice(start, start + this.billingPageSize());
  });

  readonly billingCollectionRate = computed(() => {
    const invoices = this.allInvoices();
    if (!invoices.length) return 0;
    const paid = invoices.filter((inv) => inv.status.toLowerCase() === 'paid').length;
    return Math.round((paid / invoices.length) * 100);
  });

  readonly selectedInvoiceDocument = computed(() => {
    const invoice = this.selectedInvoice();
    if (!invoice) return null;
    return buildInvoiceDocument(invoice, this.institution());
  });

  branchStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
    const normalized = status.toLowerCase();
    if (normalized === 'active') return 'default';
    if (normalized === 'maintenance') return 'muted';
    if (normalized === 'closed' || normalized === 'inactive') return 'destructive';
    return 'default';
  }

  branchStatusLabel(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'inactive') return 'Closed';
    return status;
  }

  formatRevenue(revenue: number): string {
    if (revenue <= 0) return '₹0';
    if (revenue >= 100_000) return `₹${(revenue / 100_000).toFixed(1)}L`;
    if (revenue >= 1_000) return `₹${(revenue / 1_000).toFixed(1)}k`;
    return `₹${revenue.toFixed(0)}`;
  }

  invoicePlanLabel(description: string | null | undefined, planName?: string | null): string {
    if (planName?.trim()) return planName.trim();
    if (!description?.trim()) return '—';
    const cleaned = description.replace(/\s+membership payment$/i, '').trim();
    return cleaned || description;
  }

  invoiceStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
    const normalized = status.toLowerCase();
    if (normalized === 'paid') return 'success';
    if (normalized === 'due' || normalized === 'pending') return 'warning';
    if (normalized === 'failed') return 'destructive';
    if (normalized === 'refunded') return 'muted';
    return 'default';
  }

  setBillingPageSize(size: number): void {
    this.billingPageSize.set(size);
    this.billingPage.set(1);
  }

  goToBillingPage(page: number): void {
    this.billingPage.set(Math.max(1, Math.min(page, this.billingTotalPages())));
  }

  onBillingQueryChange(value: string): void {
    this.billingQuery.set(value);
    this.billingPage.set(1);
  }

  onBillingStatusChange(value: BillingStatusFilter): void {
    this.billingStatus.set(value);
    this.billingPage.set(1);
  }

  clearBillingFilters(): void {
    this.billingQuery.set('');
    this.billingStatus.set('all');
    this.billingPage.set(1);
  }

  openInvoice(invoice: InstitutionBillingInvoice): void {
    this.selectedInvoice.set(invoice);
  }

  closeInvoice(): void {
    this.selectedInvoice.set(null);
  }

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') as InstitutionDetailTab | null;
    if (tab && this.tabs.some((t) => t.id === tab)) {
      this.tab.set(tab);
    }
    this.load();
  }

  load(): void {
    const id = this.institutionId();
    if (!id) {
      this.error.set('Invalid institution id.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    forkJoin({
      institution: this.institutions.getById(id).pipe(catchError(() => of(null))),
      overview: this.institutions.getOverview(id).pipe(catchError(() => of(null))),
      branches: this.institutions.getBranchesView(id).pipe(catchError(() => of(null))),
      libraries: this.institutions.getLibrariesView(id).pipe(catchError(() => of(null))),
      billing: this.institutions.getBilling(id).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ institution, overview, branches, libraries, billing }) => {
        if (!institution) {
          this.error.set('Institution not found.');
          this.loading.set(false);
          return;
        }
        this.institution.set(institution);
        this.overview.set(this.normalizeOverview(overview));
        this.branchesView.set(branches);
        this.librariesView.set(libraries);
        this.billing.set(billing);
        this.settingsForm.set(this.toSettingsForm(institution));
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        this.error.set('Failed to load institution.');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: InstitutionDetailTab | null | undefined): void {
    if (!tab || !this.tabs.some((item) => item.id === tab)) {
      return;
    }

    if (this.tab() !== tab) {
      this.clearBranchFilters();
      this.clearLibraryFilters();
      this.clearBillingFilters();
      this.closeInvoice();
    }
    this.tab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'overview' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  refresh(): void {
    this.load();
    this.toast.success('Refreshed');
  }

  clearBranchFilters(): void {
    this.branchQuery.set('');
    this.branchStatus.set('all');
    this.branchCap.set('any');
    this.branchPage.set(1);
  }

  clearLibraryFilters(): void {
    this.libraryQuery.set('');
    this.libraryStatus.set('all');
    this.libraryBranch.set('all');
    this.libraryOcc.set('any');
    this.libraryPage.set(1);
  }

  onBranchQueryChange(value: string): void {
    this.branchQuery.set(value);
    this.branchPage.set(1);
  }

  onBranchStatusChange(value: BranchStatusFilter): void {
    this.branchStatus.set(value);
    this.branchPage.set(1);
  }

  onBranchCapChange(value: BranchCapFilter): void {
    this.branchCap.set(value);
    this.branchPage.set(1);
  }

  setBranchPageSize(size: number): void {
    this.branchPageSize.set(size);
    this.branchPage.set(1);
  }

  goToBranchPage(page: number): void {
    this.branchPage.set(Math.max(1, Math.min(page, this.branchTotalPages())));
  }

  onLibraryQueryChange(value: string): void {
    this.libraryQuery.set(value);
    this.libraryPage.set(1);
  }

  onLibraryStatusChange(value: LibraryStatusFilter): void {
    this.libraryStatus.set(value);
    this.libraryPage.set(1);
  }

  onLibraryBranchChange(value: LibraryBranchFilter): void {
    this.libraryBranch.set(value);
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

  saveSettings(): void {
    const id = this.institutionId();
    const form = this.settingsForm();
    if (!id || !form.name?.trim()) {
      this.toast.error('Institution name is required');
      return;
    }

    this.saving.set(true);
    this.institutions.updateInstitution(id, form).subscribe({
      next: (updated) => {
        this.institution.set(updated);
        this.settingsForm.set(this.toSettingsForm(updated));
        this.saving.set(false);
        this.toast.success('Settings saved');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to save settings');
      },
    });
  }

  updateSettings<K extends keyof UpdateInstitutionRequest>(key: K, value: UpdateInstitutionRequest[K]): void {
    this.settingsForm.update((f) => ({ ...f, [key]: value }));
  }

  private normalizeOverview(overview: InstitutionOverview | null): InstitutionOverview | null {
    if (!overview) return null;

    return {
      ...overview,
      revenueTrend: overview.revenueTrend ?? [],
      revenuePreviousMtd: overview.revenuePreviousMtd ?? 0,
      revenueMonthly: overview.revenueMonthly ?? overview.revenueMtd ?? 0,
      revenueQuarterly: overview.revenueQuarterly ?? 0,
      revenueYearly: overview.revenueYearly ?? 0,
      revenueAllTime: overview.revenueAllTime ?? 0,
      occupancyTrend: overview.occupancyTrend ?? [],
      attendanceTrend: overview.attendanceTrend ?? [],
      occupancyHeatmap: normalizeOccupancyHeatmap(overview.occupancyHeatmap),
      memberMix: overview.memberMix ?? { active: 0, inactive: 0, suspended: 0 },
      capacityUtilization: overview.capacityUtilization ?? {
        totalSeats: overview.totalSeats ?? 0,
        currentMembers: overview.enrolledMemberCount ?? 0,
        totalLibraries: overview.totalLibraryCount ?? 0,
      },
    };
  }

  private toSettingsForm(inst: InstitutionDetail): UpdateInstitutionRequest {
    return {
      name: inst.name,
      description: inst.description,
      type: inst.type,
      email: inst.email,
      phone: inst.phone,
      websiteUrl: inst.websiteUrl,
      logoUrl: inst.logoUrl,
      address: inst.address,
      city: inst.city,
      state: inst.state,
      postalCode: inst.postalCode,
      country: inst.country,
      timeZone: inst.timeZone,
      isActive: inst.isActive ?? true,
    };
  }

  private matchCap(capacity: number, filter: BranchCapFilter): boolean {
    if (filter === 'small') return capacity < 50;
    if (filter === 'mid') return capacity >= 50 && capacity < 150;
    if (filter === 'large') return capacity >= 150;
    return true;
  }

  private matchLibraryOcc(occupancyPercent: number, filter: LibraryOccFilter): boolean {
    if (filter === 'low') return occupancyPercent < 50;
    if (filter === 'mid') return occupancyPercent >= 50 && occupancyPercent < 80;
    if (filter === 'high') return occupancyPercent >= 80;
    return true;
  }
}
