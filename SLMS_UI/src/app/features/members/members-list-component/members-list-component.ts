import { Component, computed, DestroyRef, effect, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  LucideSearch, LucidePlus, LucideDownload, LucideUsers, LucideAlertCircle, LucideCrown,
  LucideLayoutGrid, LucideList, LucideMoreHorizontal, LucideEye, LucideMail, LucideEdit,
  LucideCopy, LucidePanelRightOpen, LucideFilter, LucideX, LucideChevronDown,
  LucideBellRing, LucideCalendarClock, LucideRotateCcw,
  LucideArrowUp, LucideArrowDown, LucideChevronsUpDown,
  LucideChevronLeft, LucideChevronRight, LucideChevronsLeft, LucideChevronsRight,
  LucideFileSpreadsheet,
  LucideKeyRound,
  LucideMessageCircle,
} from '@lucide/angular';
import { Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, of, switchMap, tap } from 'rxjs';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { AttendanceModuleQuery } from '@core/models/attendanceModels';
import { AttendanceExportService } from '@features/attendance/attendance-export.service';
import {
  AttendanceExportMeta,
  buildExportFilename,
  downloadAttendanceExcel,
  downloadAttendancePdf,
  mapModuleRecordToExportRow,
} from '@features/attendance/attendance-report-export.util';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { QuotaBadgeComponent } from '@shared/components/quota-badge/quota-badge.component';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { PermissionKey } from '@core/constants/permissions';
import { MemberService } from '../MemberService';
import { MemberDetailResponse, MemberListQuery, MemberListResponse, MembershipSummary, PagedMemberList } from '@core/models/MemberRequest';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import { ViewMode } from '@core/constType';
import { CommonService } from '@core/services/common.service';
import { PlanStatus } from '@core/enums/OnbardingSteps';
import { memberAttendanceReportQuery } from '@core/utils/entity-routes.util';
import {
  computeMemberLifecycle, LIFECYCLE_OPTS, LIFECYCLE_TONE_CLASSES, MEMBERS_FILTER_STORAGE_KEY,
  LifecycleState, lifecycleRelativeClass, lifecycleRowClass, MemberLifecycle, RenewTarget, renewTargetFromListMember,
} from '../member-lifecycle.util';

type ExpiryQuickFilter = 'all' | 'expiring' | 'expired' | 'grace' | 'no-plan' | 'needs-action';

interface ExpiryQuickOption {
  id: ExpiryQuickFilter;
  label: string;
  count: number;
  tone?: 'warning' | 'destructive' | 'muted';
}

import { RenewPlanDialogComponent } from '../components/renew-plan-dialog/renew-plan-dialog.component';
import { MemberAvatarComponent } from '../components/member-avatar/member-avatar.component';

type FilterKey = 'statuses' | 'plans' | 'branches' | 'shifts' | 'lifecycles';

type SortKey = 'name' | 'status' | 'plan' | 'shift' | 'branch' | 'attendanceRate' | 'feesOwed' | 'joinDate' | 'planExpiry';
type SortDir = 'asc' | 'desc';

const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'] as const;
const PAGE_SIZE_OPTS = [12, 24, 48] as const;
const DEFAULT_SORT_KEY: SortKey = 'name';
const DEFAULT_SORT_DIR: SortDir = 'asc';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

interface MemberRow extends MemberListResponse {
  life: MemberLifecycle;
}

function cacheKey(query: MemberListQuery): string {
  return JSON.stringify(query);
}

@Component({
  selector: 'app-members-list-component',
  imports: [
    RouterLink, FormsModule, DatePipe,
    ButtonComponent, KpiCardComponent, PageHeaderComponent, GlassCardComponent, StatusBadgeComponent, QuotaBadgeComponent,
    LucideSearch, LucidePlus, LucideDownload, LucideUsers, LucideAlertCircle, LucideCrown,
    LucideLayoutGrid, LucideList, LucideMoreHorizontal, LucideEye, LucideMail, LucideEdit,
    LucideCopy, LucidePanelRightOpen, LucideRotateCcw, LucideFilter, LucideX, LucideChevronDown,
    LucideBellRing, LucideCalendarClock,
    LucideArrowUp, LucideArrowDown, LucideChevronsUpDown,
    LucideChevronLeft, LucideChevronRight, LucideChevronsLeft, LucideChevronsRight,
    LucideFileSpreadsheet,
    LucideKeyRound,
    LucideMessageCircle,
    RenewPlanDialogComponent,
    MemberAvatarComponent,
  ],
  templateUrl: './members-list-component.html',
  styleUrl: './members-list-component.css',
  providers: [MemberService],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class MembersListComponent implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly memberService = inject(MemberService);
  private readonly auth = inject(AuthService);
  private readonly entitlements = inject(OrganizationEntitlementService);
  private readonly exportService = inject(AttendanceExportService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly membersReload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();
  private readonly pageCache = new Map<string, PagedMemberList>();
  private syncingUrl = false;
  private hydrated = false;
  readonly commonService = inject(CommonService);

  readonly loading = signal(true);
  readonly initialLoading = signal(true);
  readonly pageLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly membersList = signal<MemberListResponse[]>([]);
  readonly summary = signal<MembershipSummary | null>(null);
  readonly totalCount = signal(0);
  readonly totalPages = signal(1);
  readonly attendanceExporting = signal(false);
  readonly showAttendanceDownloadPanel = signal(false);
  readonly attendanceDateFrom = signal(monthStartIsoDate());
  readonly attendanceDateTo = signal(todayIsoDate());
  readonly attendanceReportQuery = memberAttendanceReportQuery();

  readonly query = signal('');
  readonly searchDebounced = signal('');
  readonly statuses = signal<string[]>([]);
  readonly plans = signal<string[]>([]);
  readonly branches = signal<string[]>([]);
  readonly lifecycles = signal<string[]>([]);
  readonly shifts = signal<string[]>([]);
  readonly needsAction = signal(false);
  readonly view = signal<ViewMode>('grid');
  readonly sortKey = signal<SortKey>(DEFAULT_SORT_KEY);
  readonly sortDir = signal<SortDir>(DEFAULT_SORT_DIR);
  readonly pageSize = signal(12);
  readonly page = signal(1);
  readonly quickId = signal<string | null>(null);
  readonly openDropdownId = signal<string | null>(null);
  readonly openFilter = signal<string | null>(null);
  readonly renewTarget = signal<RenewTarget | null>(null);
  readonly renewPlans = signal<PlanResponse[]>([]);
  readonly renewBusy = signal(false);
  readonly canCreate = computed(
    () => this.auth.hasPermission(PermissionKey.MembersCreate) && (this.entitlements.canCreateMember() || this.auth.hasRole('SuperAdmin'))
  );
  readonly canUpdate = this.auth.hasPermission(PermissionKey.MembersUpdate);
  readonly canChangePassword =
    this.auth.hasRole('SuperAdmin') || this.auth.hasRole('OrganisationAdmin');
  readonly passwordTarget = signal<{ id: string; name: string } | null>(null);
  readonly passwordBusy = signal(false);
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  readonly STATUS_OPTS = STATUS_OPTS;
  readonly LIFECYCLE_OPTS = LIFECYCLE_OPTS;
  readonly PAGE_SIZE_OPTS = PAGE_SIZE_OPTS;
  readonly LIFECYCLE_TONE_CLASSES = LIFECYCLE_TONE_CLASSES;
  readonly lifecycleRelativeClass = lifecycleRelativeClass;
  readonly lifecycleRowClass = lifecycleRowClass;
  readonly MemberPlanStatus = PlanStatus;
  readonly Math = Math;

  readonly members = computed<MemberRow[]>(() =>
    this.membersList().map(m => ({
      ...m,
      life: computeMemberLifecycle({
        planEndDate: m.planEndDate,
        joinDate: m.joinDate,
        feesOwed: m.feesOwed,
      }),
    }))
  );

  readonly shiftOptions = computed(() => this.summary()?.shifts ?? []);
  readonly branchOptions = computed(() => this.summary()?.branches ?? []);
  readonly planOptions = computed(() => this.summary()?.plans ?? []);

  readonly statusCounts = computed(() => this.summary()?.statusCounts ?? {});
  readonly planCounts = computed(() => this.summary()?.planCounts ?? {});
  readonly lifecycleCounts = computed(() => this.summary()?.lifecycleCounts ?? {} as Partial<Record<LifecycleState, number>>);

  readonly activeCount = computed(() => this.summary()?.activeCount ?? 0);
  readonly expiringSoon = computed(() => this.summary()?.expiringSoonCount ?? 0);
  readonly expiredCount = computed(() => this.summary()?.expiredCount ?? 0);
  readonly actionCount = computed(() => this.summary()?.needsActionCount ?? 0);
  readonly feesDue = computed(() => this.summary()?.feesDueTotal ?? 0);
  readonly premiumCount = computed(() => this.summary()?.premiumCount ?? 0);

  readonly expiryQuickOptions = computed<ExpiryQuickOption[]>(() => {
    const counts = this.lifecycleCounts();
    const total = this.summary()?.totalMembers ?? 0;
    return [
      { id: 'all', label: 'All', count: total },
      { id: 'expiring', label: 'Expiring ≤7d', count: (counts['Expiring soon'] ?? 0) + (counts['Grace'] ?? 0), tone: 'warning' },
      { id: 'expired', label: 'Expired', count: counts['Expired'] ?? 0, tone: 'destructive' },
      { id: 'grace', label: 'Grace', count: counts['Grace'] ?? 0, tone: 'warning' },
      { id: 'no-plan', label: 'No plan', count: counts['No plan'] ?? 0, tone: 'muted' },
      { id: 'needs-action', label: 'Needs action', count: this.actionCount(), tone: 'warning' },
    ];
  });

  readonly activeExpiryQuick = computed<ExpiryQuickFilter | null>(() => {
    const lc = [...this.lifecycles()].sort();
    const needsAction = this.needsAction();

    if (needsAction && lc.length === 0) return 'needs-action';
    if (!needsAction && lc.length === 0) return 'all';
    if (!needsAction && lc.length === 2 && lc.includes('Expiring soon') && lc.includes('Grace')) return 'expiring';
    if (!needsAction && lc.length === 1 && lc[0] === 'Expired') return 'expired';
    if (!needsAction && lc.length === 1 && lc[0] === 'Grace') return 'grace';
    if (!needsAction && lc.length === 1 && lc[0] === 'No plan') return 'no-plan';
    return null;
  });

  readonly hasExpiryFilters = computed(() =>
    this.lifecycles().length > 0 || this.needsAction()
  );

  readonly activeFilterCount = computed(() =>
    this.statuses().length + this.plans().length + this.branches().length + this.shifts().length +
    this.lifecycles().length + (this.needsAction() ? 1 : 0) + (this.searchDebounced() ? 1 : 0)
  );

  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  readonly isSortDefault = computed(() =>
    this.sortKey() === DEFAULT_SORT_KEY && this.sortDir() === DEFAULT_SORT_DIR
  );

  readonly sorted = computed(() => this.members());
  readonly matchedCount = computed(() => this.totalCount());
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageStart = computed(() => (this.currentPage() - 1) * this.pageSize());
  readonly paged = computed(() => this.members());
  readonly skeletonSlots = computed(() => Array.from({ length: Math.min(this.pageSize(), 12) }, (_, i) => i));

  readonly quickMember = computed(() =>
    this.quickId() ? this.members().find(m => m.id === this.quickId()) ?? null : null
  );

  readonly headerDescription = computed(() => {
    const total = this.summary()?.totalMembers ?? this.totalCount();
    const active = this.activeCount();
    const action = this.actionCount();
    return `${total.toLocaleString()} total · ${active} active · ${action} need action`;
  });

  constructor() {
    this.searchInput$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((value) => {
      this.searchDebounced.set(value);
      this.page.set(1);
      this.persistFilters();
    });

    this.membersReload$.pipe(
      tap(() => {
        if (this.initialLoading() || this.membersList().length === 0) {
          this.loading.set(true);
        } else {
          this.pageLoading.set(true);
        }
        this.error.set(null);
      }),
      switchMap(() => {
        const query = this.buildMemberListQuery();
        const key = cacheKey(query);
        const cached = this.pageCache.get(key);
        if (cached) {
          return of({ success: true, data: cached, message: '', errors: null });
        }
        return this.memberService.getAllMembers(query).pipe(
          catchError((error) => {
            this.membersList.set([]);
            this.totalCount.set(0);
            this.totalPages.set(1);
            this.error.set(error?.error?.message ?? 'Failed to load members.');
            this.loading.set(false);
            this.pageLoading.set(false);
            this.initialLoading.set(false);
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((response) => {
      if (!response) return;
      const page = response.data;
      if (!page) return;
      const query = this.buildMemberListQuery();
      this.pageCache.set(cacheKey(query), page);
      this.applyPageResult(page);
      this.prefetchNextPage(query, page);
    });

    effect(() => {
      this.searchDebounced();
      this.statuses();
      this.plans();
      this.branches();
      this.shifts();
      this.lifecycles();
      this.needsAction();
      this.sortKey();
      this.sortDir();
      this.page();
      this.pageSize();
      if (!this.hydrated) return;
      this.syncUrlFromState();
      this.membersReload$.next();
    });
  }

  ngOnInit(): void {
    this.hydrateFilters();
    this.hydrateFromUrl();
    this.hydrated = true;
    this.entitlements.load().subscribe();
    this.loadMembershipSummary();
    this.membersReload$.next();
  }

  private applyPageResult(page: PagedMemberList): void {
    const pages = Math.max(1, page.totalPages ?? 1);
    this.membersList.set(page.items ?? []);
    this.totalCount.set(page.totalCount ?? 0);
    this.totalPages.set(pages);
    if (this.page() > pages) {
      this.page.set(pages);
      return;
    }
    this.loading.set(false);
    this.pageLoading.set(false);
    this.initialLoading.set(false);
  }

  private prefetchNextPage(query: MemberListQuery, page: PagedMemberList): void {
    if (!page.hasNextPage) return;
    const nextQuery = { ...query, page: (page.pageNumber ?? this.page()) + 1 };
    const key = cacheKey(nextQuery);
    if (this.pageCache.has(key)) return;
    this.memberService.getAllMembers(nextQuery).subscribe({
      next: (res) => {
        if (res.data) this.pageCache.set(key, res.data);
      },
    });
  }

  private hydrateFilters(): void {
    try {
      const raw = localStorage.getItem(MEMBERS_FILTER_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.q !== undefined) {
        this.query.set(saved.q);
        this.searchDebounced.set(saved.q);
      }
      if (saved.statuses) this.statuses.set(saved.statuses);
      if (saved.plans) this.plans.set(saved.plans);
      if (saved.branches) this.branches.set(saved.branches);
      if (saved.shifts) this.shifts.set(saved.shifts);
      if (saved.lifecycles) this.lifecycles.set(saved.lifecycles);
      if (saved.needsAction) this.needsAction.set(!!saved.needsAction);
      if (saved.view) this.view.set(saved.view);
      if (saved.sortKey) this.sortKey.set(saved.sortKey);
      if (saved.sortDir) this.sortDir.set(saved.sortDir);
      if (saved.pageSize && PAGE_SIZE_OPTS.includes(saved.pageSize)) this.pageSize.set(saved.pageSize);
    } catch {
      /* ignore corrupt storage */
    }
  }

  private hydrateFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const q = params.get('q');
    if (q != null) {
      this.query.set(q);
      this.searchDebounced.set(q);
    }
    const csv = (key: string) => {
      const v = params.get(key);
      return v ? v.split(',').map(s => s.trim()).filter(Boolean) : null;
    };
    const statuses = csv('statuses');
    if (statuses) this.statuses.set(statuses);
    const plans = csv('plans');
    if (plans) this.plans.set(plans);
    const branches = csv('branches');
    if (branches) this.branches.set(branches);
    const shifts = csv('shifts');
    if (shifts) this.shifts.set(shifts);
    const lifecycles = csv('lifecycles');
    if (lifecycles) this.lifecycles.set(lifecycles);
    if (params.get('needsAction') === '1' || params.get('needsAction') === 'true') this.needsAction.set(true);
    const sortKey = params.get('sortBy') as SortKey | null;
    if (sortKey) this.sortKey.set(sortKey);
    const sortDir = params.get('sortDir') as SortDir | null;
    if (sortDir === 'asc' || sortDir === 'desc') this.sortDir.set(sortDir);
    const page = Number(params.get('page'));
    if (page > 0) this.page.set(page);
    const pageSize = Number(params.get('pageSize'));
    if (PAGE_SIZE_OPTS.includes(pageSize as 12 | 24 | 48)) this.pageSize.set(pageSize as 12 | 24 | 48);
    const view = params.get('view') as ViewMode | null;
    if (view === 'grid' || view === 'table') this.view.set(view);
  }

  private syncUrlFromState(): void {
    if (this.syncingUrl) return;
    this.syncingUrl = true;
    const queryParams: Record<string, string | number | null> = {
      q: this.searchDebounced() || null,
      statuses: this.statuses().length ? this.statuses().join(',') : null,
      plans: this.plans().length ? this.plans().join(',') : null,
      branches: this.branches().length ? this.branches().join(',') : null,
      shifts: this.shifts().length ? this.shifts().join(',') : null,
      lifecycles: this.lifecycles().length ? this.lifecycles().join(',') : null,
      needsAction: this.needsAction() ? '1' : null,
      sortBy: this.isSortDefault() ? null : this.sortKey(),
      sortDir: this.isSortDefault() ? null : this.sortDir(),
      page: this.page() > 1 ? this.page() : null,
      pageSize: this.pageSize() !== 12 ? this.pageSize() : null,
      view: this.view() !== 'grid' ? this.view() : null,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    }).finally(() => {
      this.syncingUrl = false;
    });
  }

 /* removed old hydrateFilters comment block */

  private persistFilters(): void {
    localStorage.setItem(MEMBERS_FILTER_STORAGE_KEY, JSON.stringify({
      q: this.query(),
      statuses: this.statuses(),
      plans: this.plans(),
      branches: this.branches(),
      shifts: this.shifts(),
      lifecycles: this.lifecycles(),
      needsAction: this.needsAction(),
      view: this.view(),
      sortKey: this.sortKey(),
      sortDir: this.sortDir(),
      pageSize: this.pageSize(),
    }));
  }

  openRenew(member: MemberRow): void {
    const target = renewTargetFromListMember(member);
    this.renewTarget.set(target);
    this.renewPlans.set([]);

    if (!target.hasPlan) {
      this.memberService.getMemberById(member.id).subscribe({
        next: (response) => {
          const detail = response.data;
          if (!detail) return;
          this.memberService.getLibraryPlan(detail.institutionId, detail.branchId, detail.libraryId).subscribe({
            next: (plansResponse) => this.renewPlans.set(plansResponse.data ?? []),
            error: () => this.renewPlans.set([]),
          });
        },
        error: () => this.renewPlans.set([]),
      });
    }
  }

  closeRenew(): void {
    this.renewTarget.set(null);
    this.renewBusy.set(false);
    this.renewPlans.set([]);
  }

  openPasswordDialog(member: MemberRow): void {
    this.closeDropdown();
    this.passwordTarget.set({ id: member.id, name: member.name });
    this.newPassword.set('');
    this.confirmPassword.set('');
  }

  closePasswordDialog(): void {
    this.passwordTarget.set(null);
    this.passwordBusy.set(false);
    this.newPassword.set('');
    this.confirmPassword.set('');
  }

  confirmPasswordChange(): void {
    const target = this.passwordTarget();
    if (!target) return;

    const password = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (password.length < 8) {
      this.toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirm) {
      this.toast.error('Passwords do not match');
      return;
    }

    this.passwordBusy.set(true);
    this.memberService.changeMemberPassword(target.id, {
      newPassword: password,
      confirmPassword: confirm,
    }).subscribe({
      next: (response) => {
        this.passwordBusy.set(false);
        this.closePasswordDialog();
        this.toast.success(response.message ?? 'Member password updated');
      },
      error: (error) => {
        this.passwordBusy.set(false);
        this.toast.error(error?.error?.message ?? 'Failed to update member password');
      },
    });
  }

  confirmRenew(target: RenewTarget): void {
    this.renewBusy.set(true);
    const dates = {
      startDate: target.startDate || undefined,
      endDate: target.endDate || undefined,
      paidAmount: target.paidAmount,
      dueAmount: target.dueAmount ?? 0,
    };
    const wasExpired = target.daysLeft < 0;

    if (!target.hasPlan) {
      const planId = target.selectedPlanId;
      if (!planId) {
        this.renewBusy.set(false);
        this.toast.error('Please select a plan.');
        return;
      }

      this.memberService.changePlanOrShift(target.id, { planId, ...dates }).subscribe({
        next: (response) => {
          this.toast.success(response.message ?? `${target.name} plan assigned`);
          this.closeRenew();
          this.loadAllMembers();
          this.notifyRenewWhatsApp(response.data, target, wasExpired);
        },
        error: (error) => {
          this.renewBusy.set(false);
          this.toast.error(error.error?.message || 'Unable to assign plan. Please try again.');
        },
      });
      return;
    }

    this.memberService.renewMembership(target.id, dates).subscribe({
      next: (response) => {
        this.toast.success(response.message ?? `${target.name} renewed`);
        this.closeRenew();
        this.loadAllMembers();
        this.notifyRenewWhatsApp(response.data, target, wasExpired);
      },
      error: (error) => {
        this.renewBusy.set(false);
        this.toast.error(error.error?.message || 'Unable to renew plan. Please try again.');
      }
    });
  }

  notifyPaymentWhatsApp(m: MemberRow): void {
    if (!m.phone) {
      this.toast.error('Member phone number is required for WhatsApp.');
      return;
    }
    this.whatsapp.membershipRenewalPayment({
      phone: m.phone,
      memberName: m.name,
      plan: m.plan || 'Plan',
      planAmount: m.planPrice ?? 0,
      paidAmount: m.paidAmount ?? 0,
      dueAmount: m.dueAmount ?? m.feesOwed ?? 0,
      dueOrExpiry: m.life.expiry || '—',
      libraryName: m.library || 'Lexora Library',
      expired: m.life.state === 'Expired' || m.life.state === 'Grace',
    });
  }

  private notifyRenewWhatsApp(
    member: MemberDetailResponse | null | undefined,
    target: RenewTarget,
    expired: boolean,
  ): void {
    const phone = member?.phone;
    if (!phone) return;
    const planAmount = target.planPrice ?? member?.planPrice ?? 0;
    const paid = target.paidAmount ?? member?.planPaidAmount ?? planAmount;
    const due = member?.planEndDate
      ? new Date(member.planEndDate).toLocaleDateString()
      : (target.endDate || '—');
    this.whatsapp.membershipRenewalPayment({
      phone,
      memberName: target.name,
      plan: member?.plan || target.plan || 'Plan',
      planAmount,
      paidAmount: paid,
      dueAmount: target.dueAmount ?? member?.planDueAmount ?? member?.feesOwed ?? 0,
      dueOrExpiry: due,
      libraryName: member?.library || 'Lexora Library',
      expired,
    });
  }

  renewPlan(member: MemberRow): void {
    this.openRenew(member);
  }

  toggleFilter(name: string): void {
    this.openFilter.update(cur => cur === name ? null : name);
  }

  closeFilters(): void {
    this.openFilter.set(null);
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.openFilter()) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.member-filters')) return;
    this.closeFilters();
  }

  onFilterPillClick(key: FilterKey, value: string, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (key === 'plans') {
      const plan = value?.trim();
      this.toggleIn(key, plan && plan !== '—' ? plan : 'No plan');
      return;
    }
    if (!value || value === '—') return;
    this.toggleIn(key, value);
  }

  onNeedsActionPillClick(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.toggleNeedsAction();
  }

  filterBadgeClass(active: boolean): string {
    return active ? 'filter-badge-btn filter-badge-btn--active' : 'filter-badge-btn';
  }

  toggleIn(key: FilterKey, value: string): void {
    const map = { statuses: this.statuses, plans: this.plans, branches: this.branches, shifts: this.shifts, lifecycles: this.lifecycles };
    const sig = map[key];
    sig.update(arr => arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);
    this.page.set(1);
    this.persistFilters();
  }

  clearFilter(key: FilterKey): void {
    const map = { statuses: this.statuses, plans: this.plans, branches: this.branches, shifts: this.shifts, lifecycles: this.lifecycles };
    map[key].set([]);
    this.page.set(1);
    this.persistFilters();
  }

  clearAll(): void {
    this.query.set('');
    this.searchDebounced.set('');
    this.statuses.set([]);
    this.plans.set([]);
    this.branches.set([]);
    this.shifts.set([]);
    this.clearExpiryFilters(false);
    this.resetSort(false);
    this.page.set(1);
    this.pageCache.clear();
    this.persistFilters();
  }

  applyExpiryQuick(id: ExpiryQuickFilter): void {
    if (this.activeExpiryQuick() === id) {
      this.clearExpiryFilters();
      return;
    }

    switch (id) {
      case 'all':
        this.lifecycles.set([]);
        this.needsAction.set(false);
        break;
      case 'expiring':
        this.lifecycles.set(['Expiring soon', 'Grace']);
        this.needsAction.set(false);
        break;
      case 'expired':
        this.lifecycles.set(['Expired']);
        this.needsAction.set(false);
        break;
      case 'grace':
        this.lifecycles.set(['Grace']);
        this.needsAction.set(false);
        break;
      case 'no-plan':
        this.lifecycles.set(['No plan']);
        this.needsAction.set(false);
        break;
      case 'needs-action':
        this.lifecycles.set([]);
        this.needsAction.set(true);
        break;
    }

    this.page.set(1);
    this.persistFilters();
  }

  clearExpiryFilters(persist = true): void {
    this.lifecycles.set([]);
    this.needsAction.set(false);
    this.page.set(1);
    if (persist) this.persistFilters();
  }

  lifecycleOptionCount(state: LifecycleState): number {
    return this.lifecycleCounts()[state] ?? 0;
  }

  statusOptionCount(status: string): number {
    return this.statusCounts()[status] ?? 0;
  }

  planOptionCount(plan: string): number {
    return this.planCounts()[plan] ?? 0;
  }

  branchOptionCount(branch: string): number {
    return this.summary()?.branchCounts?.[branch] ?? 0;
  }

  shiftOptionCount(shift: string): number {
    return this.summary()?.shiftCounts?.[shift] ?? 0;
  }

  resetSort(persist = true): void {
    this.sortKey.set(DEFAULT_SORT_KEY);
    this.sortDir.set(DEFAULT_SORT_DIR);
    this.page.set(1);
    if (persist) this.persistFilters();
  }

  toggleNeedsAction(): void {
    this.needsAction.update(v => !v);
    this.page.set(1);
    this.persistFilters();
  }

  clearNeedsActionFilter(): void {
    this.needsAction.set(false);
    this.page.set(1);
    this.persistFilters();
  }

  applyNeedsActionFilter(): void {
    this.applyExpiryQuick('needs-action');
  }

  setView(v: ViewMode): void {
    this.view.set(v);
    this.persistFilters();
  }

  onSort(key: SortKey): void {
    if (this.sortKey() === key) {
      if (this.sortDir() === 'asc') {
        this.sortDir.set('desc');
      } else if (key === DEFAULT_SORT_KEY) {
        this.resetSort();
        return;
      } else {
        this.resetSort();
        return;
      }
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    this.page.set(1);
    this.persistFilters();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.persistFilters();
  }

  goToPage(p: number): void {
    this.page.set(Math.max(1, Math.min(p, this.totalPages())));
  }

  openQuick(id: string): void {
    this.quickId.set(id);
  }

  closeQuick(): void {
    this.quickId.set(null);
  }

  toggleDropdown(id: string): void {
    this.openDropdownId.update(cur => cur === id ? null : id);
  }

  closeDropdown(): void {
    this.openDropdownId.set(null);
  }

  copyId(id: string): void {
    navigator.clipboard.writeText(id).then(
      () => this.toast.success(`Member ID copied: ${id}`),
      () => this.toast.error('Copy failed'),
    );
    this.closeDropdown();
  }

  /** Reload current page + KPI summary (after renew / password / etc.). */
  loadAllMembers(): void {
    this.pageCache.clear();
    this.loadMembershipSummary();
    this.membersReload$.next();
  }

  private buildMemberListQuery(): MemberListQuery {
    const join = (values: string[]) => (values.length ? values.join(',') : undefined);
    return {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.searchDebounced().trim() || undefined,
      statuses: join(this.statuses()),
      plans: join(this.plans()),
      branches: join(this.branches()),
      shifts: join(this.shifts()),
      lifecycles: join(this.lifecycles()),
      needsAction: this.needsAction() || undefined,
      sortBy: this.sortKey(),
      sortDir: this.sortDir(),
    };
  }

  private loadMembershipSummary(): void {
    this.memberService.getMembershipSummary().subscribe({
      next: (response) => this.summary.set(response.data ?? null),
      error: () => this.summary.set(null),
    });
  }

  onAttendanceDateFromChange(value: string): void {
    this.attendanceDateFrom.set(value);
  }

  onAttendanceDateToChange(value: string): void {
    this.attendanceDateTo.set(value);
  }

  toggleAttendanceDownloadPanel(): void {
    this.showAttendanceDownloadPanel.update((open) => !open);
  }

  exportAttendanceReport(format: 'excel' | 'pdf'): void {
    if (this.attendanceExporting()) return;

    this.attendanceExporting.set(true);
    const filterQuery = this.buildMemberListQuery();
    const attendanceQuery: AttendanceModuleQuery = {
      dateFrom: this.attendanceDateFrom(),
      dateTo: this.attendanceDateTo(),
    };

    forkJoin({
      members: this.memberService.fetchAllFilteredMembers({ ...filterQuery, page: 1, pageSize: 200 }),
      records: this.exportService.fetchAllModuleRecords(attendanceQuery),
    }).subscribe({
      next: ({ members, records }) => {
        const memberIds = new Set(members.map((m) => m.id));
        const filtered = this.hasActiveFilters()
          ? records.filter((r) => memberIds.has(r.memberId))
          : records;

        if (filtered.length === 0) {
          this.toast.error('No attendance records found for the selected filters / date range.');
          this.attendanceExporting.set(false);
          return;
        }

        const rows = filtered.map(mapModuleRecordToExportRow);
        const filterLabel = this.hasActiveFilters()
          ? ` · ${memberIds.size} filtered members`
          : '';
        const meta: AttendanceExportMeta = {
          title: 'Members Attendance Report',
          subtitle: `${attendanceQuery.dateFrom} to ${attendanceQuery.dateTo} · ${filtered.length} records${filterLabel}`,
          filenameBase: buildExportFilename('members-attendance-report', attendanceQuery.dateFrom ?? 'start', attendanceQuery.dateTo ?? 'end'),
        };

        if (format === 'excel') {
          downloadAttendanceExcel(rows, meta, 'module');
        } else {
          downloadAttendancePdf(rows, meta, 'module');
        }

        this.toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} attendance report downloaded.`);
        this.attendanceExporting.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Could not export attendance report.');
        this.attendanceExporting.set(false);
      },
    });
  }

  isFilterSelected(key: FilterKey, value: string): boolean {
    const map = { statuses: this.statuses, plans: this.plans, branches: this.branches, shifts: this.shifts, lifecycles: this.lifecycles };
    return map[key]().includes(value);
  }

  filterCount(key: FilterKey): number {
    const map = { statuses: this.statuses, plans: this.plans, branches: this.branches, shifts: this.shifts, lifecycles: this.lifecycles };
    return map[key]().length;
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.searchInput$.next(value.trim());
  }

  sortLabel(): string {
    const labels: Record<SortKey, string> = {
      name: 'Member',
      status: 'Status',
      plan: 'Plan',
      planExpiry: 'Expires',
      shift: 'Shift',
      branch: 'Branch',
      attendanceRate: 'Attendance',
      feesOwed: 'Fees',
      joinDate: 'Join date',
    };
    return `${labels[this.sortKey()]} (${this.sortDir()})`;
  }
}
