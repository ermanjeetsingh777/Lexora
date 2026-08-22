import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
} from '@lucide/angular';
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
import { ToastService } from '@core/services/toast.service';
import { MemberService } from '../MemberService';
import { MemberListResponse } from '@core/models/MemberRequest';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import { ViewMode } from '@core/constType';
import { CommonService } from '@core/services/common.service';
import { PlanStatus } from '@core/enums/OnbardingSteps';
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
const PAGE_SIZE_OPTS = [10, 25, 50, 100] as const;
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

@Component({
  selector: 'app-members-list-component',
  imports: [
    RouterLink, FormsModule, DatePipe,
    ButtonComponent, KpiCardComponent, PageHeaderComponent, GlassCardComponent, StatusBadgeComponent,
    LucideSearch, LucidePlus, LucideDownload, LucideUsers, LucideAlertCircle, LucideCrown,
    LucideLayoutGrid, LucideList, LucideMoreHorizontal, LucideEye, LucideMail, LucideEdit,
    LucideCopy, LucidePanelRightOpen, LucideRotateCcw, LucideFilter, LucideX, LucideChevronDown,
    LucideBellRing, LucideCalendarClock,
    LucideArrowUp, LucideArrowDown, LucideChevronsUpDown,
    LucideChevronLeft, LucideChevronRight, LucideChevronsLeft, LucideChevronsRight,
    LucideFileSpreadsheet,
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
  private readonly exportService = inject(AttendanceExportService);
  readonly commonService = inject(CommonService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly membersList = signal<MemberListResponse[]>([]);
  readonly attendanceExporting = signal(false);
  readonly attendanceDateFrom = signal(monthStartIsoDate());
  readonly attendanceDateTo = signal(todayIsoDate());

  readonly query = signal('');
  readonly statuses = signal<string[]>([]);
  readonly plans = signal<string[]>([]);
  readonly branches = signal<string[]>([]);
  readonly lifecycles = signal<string[]>([]);
  readonly shifts = signal<string[]>([]);
  readonly needsAction = signal(false);
  readonly view = signal<ViewMode>('grid');
  readonly sortKey = signal<SortKey>(DEFAULT_SORT_KEY);
  readonly sortDir = signal<SortDir>(DEFAULT_SORT_DIR);
  readonly pageSize = signal(25);
  readonly page = signal(1);
  readonly quickId = signal<string | null>(null);
  readonly openDropdownId = signal<string | null>(null);
  readonly openFilter = signal<string | null>(null);
  readonly renewTarget = signal<RenewTarget | null>(null);
  readonly renewPlans = signal<PlanResponse[]>([]);
  readonly renewBusy = signal(false);

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

  readonly shiftOptions = computed(() =>
    [...new Set(this.members().map(m => m.shift).filter((s): s is string => !!s && s !== '—'))].sort()
  );

  readonly branchOptions = computed(() =>
    [...new Set(this.members().map(m => m.branch).filter(b => b && b !== '—'))].sort()
  );

  readonly planOptions = computed(() =>
    [...new Set(
      this.members().map(m => {
        const plan = m.plan?.trim();
        return plan && plan !== '—' ? plan : 'No plan';
      }),
    )].sort((a, b) => a.localeCompare(b))
  );

  readonly statusCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const m of this.members()) counts[m.status] = (counts[m.status] ?? 0) + 1;
    return counts;
  });

  readonly planCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const m of this.members()) {
      const plan = m.plan?.trim();
      const key = plan && plan !== '—' ? plan : 'No plan';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  });

  readonly activeCount = computed(() => this.members().filter(m => m.status === 'Active').length);
  readonly expiringSoon = computed(() =>
    this.members().filter(m => m.life.state === 'Expiring soon' || m.life.state === 'Grace').length
  );
  readonly expiredCount = computed(() => this.members().filter(m => m.life.state === 'Expired').length);
  readonly actionCount = computed(() => this.members().filter(m => m.life.needsAction).length);
  readonly feesDue = computed(() => this.members().reduce((s, m) => s + m.feesOwed, 0));
  readonly premiumCount = computed(() =>
    this.members().filter(m => {
      const plan = m.plan?.trim();
      return plan === 'Yearly' || plan === 'Half Yearly';
    }).length
  );

  readonly lifecycleCounts = computed(() => {
    const counts: Partial<Record<LifecycleState, number>> = {};
    for (const m of this.members()) {
      counts[m.life.state] = (counts[m.life.state] ?? 0) + 1;
    }
    return counts;
  });

  readonly expiryQuickOptions = computed<ExpiryQuickOption[]>(() => {
    const counts = this.lifecycleCounts();
    return [
      { id: 'all', label: 'All', count: this.members().length },
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
    this.lifecycles().length + (this.needsAction() ? 1 : 0) + (this.query() ? 1 : 0)
  );

  readonly isSortDefault = computed(() =>
    this.sortKey() === DEFAULT_SORT_KEY && this.sortDir() === DEFAULT_SORT_DIR
  );

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase();
    const statuses = this.statuses();
    const plans = this.plans();
    const branches = this.branches();
    const shifts = this.shifts();
    const lifecycles = this.lifecycles();
    const needsAction = this.needsAction();

    return this.members().filter(m => {
      const memberPlan = m.plan?.trim();
      const normalizedPlan = memberPlan && memberPlan !== '—' ? memberPlan : 'No plan';

      return (statuses.length === 0 || statuses.includes(m.status)) &&
      (plans.length === 0 || plans.includes(normalizedPlan)) &&
      (branches.length === 0 || branches.includes(m.branch)) &&
      (shifts.length === 0 || shifts.includes(m.shift ?? '')) &&
      (lifecycles.length === 0 || lifecycles.includes(m.life.state)) &&
      (!needsAction || m.life.needsAction) &&
      (q === '' ||
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.institution.toLowerCase().includes(q) ||
        m.branch.toLowerCase().includes(q) ||
        m.library.toLowerCase().includes(q) ||
        (m.shift ?? '').toLowerCase().includes(q) ||
        normalizedPlan.toLowerCase().includes(q));
    });
  });

  readonly sorted = computed(() => {
    const arr = [...this.filtered()];
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    arr.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (key) {
        case 'planExpiry':
          av = a.life.expiry;
          bv = b.life.expiry;
          break;
        case 'plan':
          av = a.plan ?? '';
          bv = b.plan ?? '';
          break;
        case 'attendanceRate':
          av = a.attendanceRate;
          bv = b.attendanceRate;
          break;
        case 'feesOwed':
          av = a.feesOwed;
          bv = b.feesOwed;
          break;
        case 'joinDate':
          av = a.joinDate ?? '';
          bv = b.joinDate ?? '';
          break;
        case 'name':
          av = a.name ?? '';
          bv = b.name ?? '';
          break;
        case 'status':
          av = a.status ?? '';
          bv = b.status ?? '';
          break;
        case 'shift':
          av = a.shift ?? '';
          bv = b.shift ?? '';
          break;
        case 'branch':
          av = a.branch ?? '';
          bv = b.branch ?? '';
          break;
        default:
          av = '';
          bv = '';
      }
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return arr;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.pageSize())));
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageStart = computed(() => (this.currentPage() - 1) * this.pageSize());
  readonly paged = computed(() => {
    const start = this.pageStart();
    return this.sorted().slice(start, start + this.pageSize());
  });

  readonly quickMember = computed(() =>
    this.quickId() ? this.members().find(m => m.id === this.quickId()) ?? null : null
  );

  readonly headerDescription = computed(() => {
    const total = this.members().length;
    const active = this.activeCount();
    const action = this.actionCount();
    return `${total.toLocaleString()} total · ${active} active · ${action} need action`;
  });

  ngOnInit(): void {
    // this.hydrateFilters();
    this.loadAllMembers();
  }

 /*  private hydrateFilters(): void {
    try {
      const raw = localStorage.getItem(MEMBERS_FILTER_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.q !== undefined) this.query.set(saved.q);
      if (saved.statuses) this.statuses.set(saved.statuses);
      if (saved.plans) this.plans.set(saved.plans);
      if (saved.branches) this.branches.set(saved.branches);
      if (saved.shifts) this.shifts.set(saved.shifts);
      if (saved.lifecycles) this.lifecycles.set(saved.lifecycles);
      if (saved.needsAction) this.needsAction.set(saved.needsAction);
      if (saved.view) this.view.set(saved.view);
      if (saved.sortKey) this.sortKey.set(saved.sortKey);
      if (saved.sortDir) this.sortDir.set(saved.sortDir);
      if (saved.pageSize) this.pageSize.set(saved.pageSize);
    } catch { ignore corrupt storage }
  } */

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

  confirmRenew(target: RenewTarget): void {
    this.renewBusy.set(true);

    if (!target.hasPlan) {
      const planId = target.selectedPlanId;
      if (!planId) {
        this.renewBusy.set(false);
        this.toast.error('Please select a plan.');
        return;
      }

      this.memberService.changePlanOrShift(target.id, { planId }).subscribe({
        next: (response) => {
          this.toast.success(response.message ?? `${target.name} plan assigned`);
          this.closeRenew();
          this.loadAllMembers();
        },
        error: (error) => {
          this.renewBusy.set(false);
          this.toast.error(error.error?.message || 'Unable to assign plan. Please try again.');
        },
      });
      return;
    }

    this.memberService.renewMembership(target.id).subscribe({
      next: (response) => {
        this.toast.success(response.message ?? `${target.name} renewed`);
        this.closeRenew();
        this.loadAllMembers();
      },
      error: (error) => {
        this.renewBusy.set(false);
        this.toast.error(error.error?.message || 'Unable to renew plan. Please try again.');
      }
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
    this.statuses.set([]);
    this.plans.set([]);
    this.branches.set([]);
    this.shifts.set([]);
    this.clearExpiryFilters(false);
    this.resetSort(false);
    this.page.set(1);
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
    return this.members().filter(m => m.branch === branch).length;
  }

  shiftOptionCount(shift: string): number {
    return this.members().filter(m => m.shift === shift).length;
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

  loadAllMembers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.memberService.getAllMembers().subscribe({
      next: (response) => {
        this.membersList.set(response.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        this.membersList.set([]);
        this.error.set(error?.error?.message ?? 'Failed to load members.');
        this.loading.set(false);
      }
    });
  }

  onAttendanceDateFromChange(value: string): void {
    this.attendanceDateFrom.set(value);
  }

  onAttendanceDateToChange(value: string): void {
    this.attendanceDateTo.set(value);
  }

  exportAttendanceReport(format: 'excel' | 'pdf'): void {
    if (this.attendanceExporting()) return;

    this.attendanceExporting.set(true);
    const search = this.query().trim();
    const query: AttendanceModuleQuery = {
      dateFrom: this.attendanceDateFrom(),
      dateTo: this.attendanceDateTo(),
      search: search || undefined,
    };

    this.exportService.fetchAllModuleRecords(query).subscribe({
      next: (records) => {
        if (records.length === 0) {
          this.toast.error('No attendance records found for the selected date range.');
          this.attendanceExporting.set(false);
          return;
        }

        const rows = records.map(mapModuleRecordToExportRow);
        const meta: AttendanceExportMeta = {
          title: 'Members Attendance Report',
          subtitle: `${query.dateFrom} to ${query.dateTo} · ${records.length} records${search ? ` · search: ${search}` : ''}`,
          filenameBase: buildExportFilename('members-attendance-report', query.dateFrom ?? 'start', query.dateTo ?? 'end'),
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
    this.page.set(1);
    this.persistFilters();
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
