import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideArrowLeft,
  LucideArrowUpRight,
  LucideBuilding2,
  LucideCreditCard,
  LucideLibrary,
  LucideMapPin,
  LucidePlus,
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
import {
  InstitutionBranchesView,
  InstitutionDetail,
  InstitutionDetailTab,
  InstitutionOverview,
  UpdateInstitutionRequest,
} from '@core/models/institution-detail.models';
import { InstitutionsService } from '../institutions.service';
import { ToastService } from '@core/services/toast.service';

type BranchStatusFilter = 'all' | 'Active' | 'Maintenance' | 'Closed';
type BranchCapFilter = 'any' | 'small' | 'mid' | 'large';

const BRANCH_STATUSES: BranchStatusFilter[] = ['all', 'Active', 'Maintenance', 'Closed'];
const BRANCH_CAPS: { value: BranchCapFilter; label: string }[] = [
  { value: 'any', label: 'Any size' },
  { value: 'small', label: '< 50' },
  { value: 'mid', label: '50–150' },
  { value: 'large', label: '150+' },
];

@Component({
  selector: 'app-institution-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DecimalPipe,
    PageHeaderComponent,
    GlassCardComponent,
    SectionHeaderComponent,
    KpiCardComponent,
    StatusBadgeComponent,
    ButtonComponent,
    LucideArrowLeft,
    LucideBuilding2,
    LucideLibrary,
    LucideUsers,
    LucideActivity,
    LucideAlertTriangle,
    LucideSearch,
    LucideX,
    LucidePlus,
    LucideMapPin,
    LucideArrowUpRight,
    LucideRefreshCw,
    LucideSettings,
    LucideCreditCard,
  ],
  templateUrl: './institution-detail.component.html',
  styleUrl: './institution-detail.component.css',
})
export class InstitutionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly institutions = inject(InstitutionsService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly institution = signal<InstitutionDetail | null>(null);
  readonly overview = signal<InstitutionOverview | null>(null);
  readonly branchesView = signal<InstitutionBranchesView | null>(null);

  readonly tab = signal<InstitutionDetailTab>('overview');
  readonly branchQuery = signal('');
  readonly branchStatus = signal<BranchStatusFilter>('all');
  readonly branchCap = signal<BranchCapFilter>('any');

  readonly settingsForm = signal<UpdateInstitutionRequest>({});

  readonly branchStatuses = BRANCH_STATUSES;
  readonly branchCaps = BRANCH_CAPS;
  readonly tabs: { id: InstitutionDetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'branches', label: 'Branches' },
    { id: 'libraries', label: 'Libraries' },
    { id: 'billing', label: 'Billing' },
    { id: 'settings', label: 'Settings' },
  ];

  readonly institutionId = computed(() => this.route.snapshot.paramMap.get('institutionId') ?? '');

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
    if (pct > 85) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (pct > 60) return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-muted text-muted-foreground border-border';
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

  readonly libraryRows = computed(() => {
    const view = this.branchesView();
    if (!view) return [];
    return view.branches
      .filter((b) => b.libraryCount > 0)
      .map((b) => ({
        branchId: b.id,
        branchName: b.name,
        city: b.city,
        libraryCount: b.libraryCount,
        memberCount: b.memberCount,
        capacity: b.capacity,
        occupancyPercent: b.occupancyPercent,
        status: b.status,
      }));
  });

  readonly hasBranchFilters = computed(
    () => !!this.branchQuery() || this.branchStatus() !== 'all' || this.branchCap() !== 'any',
  );

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
    }).subscribe({
      next: ({ institution, overview, branches }) => {
        if (!institution) {
          this.error.set('Institution not found.');
          this.loading.set(false);
          return;
        }
        this.institution.set(institution);
        this.overview.set(overview);
        this.branchesView.set(branches);
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

  setTab(tab: InstitutionDetailTab): void {
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
}
