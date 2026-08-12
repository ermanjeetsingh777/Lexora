import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideArrowLeft, LucideMail, LucidePhone, LucideIdCard, LucideBuilding2,
  LucideMapPin, LucideArmchair, LucideClock, LucideDownload, LucideCreditCard,
  LucideChevronLeft, LucideChevronRight, LucideTrendingUp, LucideCheckCircle2,
  LucideXCircle, LucideAlertTriangle, LucideCalendar, LucideUser, LucideShieldAlert,
  LucideCopy, LucideSettings2, LucideArrowRightLeft, LucideBadgeDollarSign,
  LucideTimer,
  LucideWallet,
  LucideBookOpen,
  LucideCrown,
  LucideSparkles,
  LucideLogIn,
  LucideLogOut,
  LucideHistory,
  LucidePencil,
  LucideCalendarClock,
  LucideClock3,
  LucideSun,
  LucideFlame,
  LucideCalendarCheck,
  LucideActivity,
  LucideBookMarked,
  LucideRotateCcw,
} from '@lucide/angular';
import { ToastService } from '@core/services/toast.service';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ChangeMemberPlanShiftRequest, CreateMemberContactRequest, MemberDetailResponse } from '@core/models/MemberRequest';
import { MemberService } from '../MemberService';
import { CommonService } from '@core/services/common.service';
import { MemberContactComponent } from "../pages/member-contact-component/member-contact-component";
import { EVENT_DOT, Shift } from '@core/constType';
import { KeyValueResponse, PlanDropdownResponse, PlanResponse } from '@core/models/institution-dropdown.model';
import { MemberPaymentsComponent } from "../pages/member-payments-component/member-payments-component";
import { SelectButtonModule } from 'primeng/selectbutton';
import { AttendanceService } from '@core/services/attendance.service';
import { AttendanceCalendarResponse, AttendanceResponse, AttendanceStatus, CheckInRequest, CheckOutRequest } from '@core/models/attendanceModels';
import { PlanStatus } from '@core/enums/OnbardingSteps';
import {
  computeMemberLifecycle, LIFECYCLE_TONE_CLASSES, lifecycleBannerClass, MemberLifecycle, RenewTarget,
} from '../member-lifecycle.util';
import { RenewPlanDialogComponent } from '../components/renew-plan-dialog/renew-plan-dialog.component';

type TabId = 'overview' | 'attendance' | 'payments' | 'contacts' | 'plans' | 'books';

type DayStatus = 'present' | 'late' | 'absent' | 'holiday' | 'none';

interface CalendarCell {
  date: Date | null;
  day: AttendanceResponse | null;
}

interface HeatmapCell {
  date: string;
  status: DayStatus;
  hours: number;
}

@Component({
  selector: 'app-member-details-component',
  imports: [
    DatePipe, FormsModule, RouterLink,
    ButtonComponent, PageHeaderComponent, SectionHeaderComponent, GlassCardComponent, StatusBadgeComponent,
    LucideArrowLeft, LucideMail, LucidePhone, LucideIdCard, LucideBuilding2,
    LucideMapPin, LucideArmchair, LucideClock, LucideDownload, LucideCreditCard,
    LucideChevronLeft, LucideChevronRight, LucideTrendingUp, LucideCheckCircle2,
    LucideXCircle, LucideAlertTriangle, LucideCalendar, LucideUser, LucideShieldAlert,
    LucideCopy, LucideSettings2, LucideArrowRightLeft, LucideBadgeDollarSign, DatePipe,
    MemberContactComponent, CurrencyPipe, LucideTimer, LucideWallet, LucideBookOpen,
    LucideHistory, LucidePencil, LucideCalendarClock, LucideClock3, LucideSun,
    LucideFlame, LucideCalendarCheck, LucideActivity, LucideBookMarked, LucideRotateCcw,
    MemberPaymentsComponent, SelectButtonModule, LucideCrown, LucideSparkles, LucideLogIn, LucideLogOut,
    RenewPlanDialogComponent,
  ],
  templateUrl: './member-details-component.html',
  styleUrl: './member-details-component.css',
  providers: [MemberService, AttendanceService]
})
export class MemberDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly memberService = inject(MemberService);
  readonly commonService = inject(CommonService);
  readonly attendanceService = inject(AttendanceService);

  private readonly memberId = this.route.snapshot.paramMap.get('memberId') ?? '';
  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly memberDetails: WritableSignal<MemberDetailResponse | null> = signal<MemberDetailResponse | null>(null);
  readonly plans = signal<PlanResponse[]>([]);

  readonly activeTab = signal<TabId>('overview');
  readonly actionsOpen = signal(false);
  readonly dialog = signal<null | 'branch' | 'seat' | 'shift' | 'plan'>(null);
  hexNumber = Math.floor(Math.random() * 360);
  readonly tabs: { value: TabId; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'books', label: 'Books' },
    { value: 'plans', label: 'Payments & Plans' },
    // { id: 'payments', label: 'Payments' },
    { value: 'contacts', label: 'Contacts' },
  ];

  readonly toShift = signal<Shift>('Morning');
  readonly selectedPlanId = signal<string>('');
  readonly selectedPlan = signal<PlanResponse | null>(null);
  readonly dialogBusy = signal(false);
  readonly renewTarget = signal<RenewTarget | null>(null);
  readonly renewBusy = signal(false);
  readonly attendanceStatus = AttendanceStatus;
  readonly planStatus = PlanStatus;
  readonly today = signal(new Date());
  readonly LIFECYCLE_TONE_CLASSES = LIFECYCLE_TONE_CLASSES;
  readonly lifecycleBannerClass = lifecycleBannerClass;

  // ---- Attendance calendar / dashboard state ----
  readonly calendarDays = signal<AttendanceResponse[]>([]);
  readonly calendarMonth = signal<Date>(new Date());
  readonly calendarLoading = signal(false);
  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly eventDot = EVENT_DOT;

  // Replace with your API response
  readonly todayAttendance = computed(() => {
    const attendance = this.memberDetails()?.todayAttendance;

    if (!attendance) {
      return null;
    }

    return {
      ...attendance,
      // checkInLocal: attendance.checkInTime ? new Date(attendance.checkInTime) : null,
      // checkOutLocal: attendance.checkOutTime ? new Date(attendance.checkOutTime) : null
    };
  });

  readonly remainingDays = computed(() => {
    const member = this.memberDetails();

    if (!member?.planEndDate) {
      return 0;
    }

    const today = new Date();

    const endDate = new Date(member.planEndDate);

    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const difference = endDate.getTime() - today.getTime();

    return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
  });

  readonly elapsedDays = computed(() => {
    const member = this.memberDetails();

    if (!member?.planStartDate) {
      return 0;
    }

    const today = new Date();
    const startDate = new Date(member.planStartDate);

    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    const difference = today.getTime() - startDate.getTime();

    return Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)));
  });

  readonly adjustmentAmount = computed(() => {
    const member = this.memberDetails();

    if (
      !member?.planPrice ||
      !member.planStartDate ||
      !member.planEndDate
    ) {
      return {
        remaingingAmount: 0,
        usedAmount: 0,
      }
    }

    // Same plan selected - no adjustment
    // if (this.selectedPlanId() === member.planId) {
    //   return 0;
    // }

    const start = new Date(member.planStartDate);
    const end = new Date(member.planEndDate);

    const durationMs =
      end.getTime() - start.getTime();

    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));

    const perDayRate = member.planPrice / durationDays;

    return {
      remaingingAmount: Number((perDayRate * this.remainingDays()).toFixed(2)),
      usedAmount: Number((member?.planPrice).toFixed(2)) - Number((perDayRate * this.remainingDays()).toFixed(2))
    };
  });

  readonly amountToPay = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) {
      return 0;
    }

    // Current plan selected
    if (plan.id === this.memberDetails()?.planId) {
      return 0;
    }
    return Number((plan.price - this.adjustmentAmount().remaingingAmount).toFixed(2));
  });

  readonly hasChanges = computed(() => {
    const member = this.memberDetails();

    if (!member) {
      return false;
    }

    const shiftChanged = this.toShift() !== member.shift;
    
    const planChanged = this.selectedPlanId() !== member.planId ? true : true;

    return shiftChanged || planChanged;
  });

  readonly lifetimeSpend = computed(() => {
    const member = this.memberDetails();

    if (!member?.plans?.length) {
      return 0;
    }

    return member.plans.reduce((total, payment) => total + payment.paidAmount, 0);
  });

  readonly nextRenewalDate = computed(() => {
    const member = this.memberDetails();

    if (!member?.plans?.length) {
      return null;
    }

    const latestPayment = member.plans.filter(el => el.isActive && el.isCurrent)[0]

    return latestPayment.endDate;
  });

  readonly averageVisitsPerWeek = computed(() => {

    const member = this.memberDetails();

    if (!member?.joinedOn) {
      return 0;
    }

    const joined = new Date(member.joinedOn);
    const today = new Date();

    const days = Math.max(
      1,
      Math.floor((today.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    const totalVisits = member.visits30d ?? 0;

    const average = (totalVisits / days) * 7;

    return Number(average.toFixed(1));
  });

  readonly attendanceBadge = computed(() => {
    const rate = this.memberDetails()?.attendanceRate ?? 0;

    if (rate >= 95) {
      return {
        text: 'Excellent',
        class: 'bg-emerald-100 text-emerald-700'
      };
    }

    if (rate >= 85) {
      return {
        text: 'Very Good',
        class: 'bg-green-100 text-green-700'
      };
    }

    if (rate >= 75) {
      return {
        text: 'Good',
        class: 'bg-blue-100 text-blue-700'
      };
    }

    if (rate >= 60) {
      return {
        text: 'Average',
        class: 'bg-amber-100 text-amber-700'
      };
    }

    if (rate >= 40) {
      return {
        text: 'Needs Improvement',
        class: 'bg-orange-100 text-orange-700'
      };
    }

    return {
      text: 'Poor',
      class: 'bg-red-100 text-red-700'
    };
  });

  readonly daysAsMember = computed(() => {
    const joined = this.memberDetails()?.joinedOn;
    if (!joined) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(joined).getTime()) / (1000 * 60 * 60 * 24)));
  });

  readonly lifecycle = computed<MemberLifecycle>(() => {
    const member = this.memberDetails();
    return computeMemberLifecycle({
      planEndDate: member?.planEndDate,
      joinDate: member?.joinedOn,
      feesOwed: member?.feesOwed,
    });
  });

  readonly attendanceStats = computed(() => {
    const records = this.calendarDays().filter(r => r.isActive !== false);
    const present = records.filter(r => this.toDayStatus(r.status) === 'present').length;
    const late = records.filter(r => this.toDayStatus(r.status) === 'late').length;
    const absent = records.filter(r => this.toDayStatus(r.status) === 'absent').length;
    const holiday = records.filter(r => this.toDayStatus(r.status) === 'holiday').length;
    const workDays = records.length - holiday;
    const rate = workDays ? Math.round(((present + late) / workDays) * 100) : 0;

    let streak = 0;
    let best = 0;
    for (const r of [...records].sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate))) {
      const s = this.toDayStatus(r.status);
      if (s === 'present' || s === 'late') {
        streak += 1;
        best = Math.max(best, streak);
      } else if (s === 'absent') {
        streak = 0;
      }
    }

    return { present, late, absent, holiday, workDays, rate, bestStreak: best };
  });

  readonly monthLabel = computed(() => {
    const c = this.calendarMonth();
    return c.toLocaleString('en', { month: 'long', year: 'numeric' });
  });

  readonly monthCells = computed<CalendarCell[]>(() => {
    const cursor = this.calendarMonth();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const map = new Map(this.calendarDays().map(r => [r.attendanceDate, r]));

    const cells: CalendarCell[] = [];
    const firstDow = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, day: map.get(this.dateKey(date)) ?? null });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  });

  readonly heatmapCols = computed<HeatmapCell[][]>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 88);
    const map = new Map(this.calendarDays().map(r => [r.attendanceDate, r]));

    const days: HeatmapCell[] = [];
    for (let i = 0; i < 89; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = this.dateKey(d);
      const rec = map.get(key);
      days.push({
        date: key,
        status: rec ? this.toDayStatus(rec.status) : 'none',
        hours: rec ? rec.durationMinutes / 60 : 0,
      });
    }

    const cols: HeatmapCell[][] = [];
    let current: HeatmapCell[] = [];
    for (let i = 0; i < start.getDay(); i++) current.push({ date: '', status: 'none', hours: -1 });
    for (const day of days) {
      current.push(day);
      if (current.length === 7) {
        cols.push(current);
        current = [];
      }
    }
    if (current.length) {
      while (current.length < 7) current.push({ date: '', status: 'none', hours: -1 });
      cols.push(current);
    }
    return cols;
  });

  readonly attendanceLog = computed(() =>
    [...this.calendarDays()]
      .filter(r => r.isActive !== false)
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))
      .slice(0, 30)
  );

  readonly paymentStats = computed(() => {
    const plans = this.memberDetails()?.plans ?? [];
    const paid = plans.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const pending = plans
      .filter(p => p.paymentStatus === 'Pending')
      .reduce((sum, p) => sum + ((p.price || 0) - (p.paidAmount || 0)), 0);
    const outstanding = this.memberDetails()?.feesOwed ?? 0;
    const lastPaid = [...plans]
      .filter(p => p.paymentStatus === 'Paid')
      .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))[0];
    return { paid, pending, outstanding, lastDate: lastPaid?.createdAtUtc ?? null };
  });

  readonly activityTimeline = computed(() => {
    const m = this.memberDetails();
    const events: { id: string; type: string; title: string; description?: string; ts: string }[] = [];

    if (m?.joinedOn) {
      events.push({
        id: 'joined',
        type: 'note',
        title: 'Joined the library',
        description: `Member since ${new Date(m.joinedOn).toISOString().slice(0, 10)}`,
        ts: m.joinedOn,
      });
    }

    for (const p of m?.plans ?? []) {
      events.push({
        id: `plan-${p.id}`,
        type: 'plan',
        title: `${p.planName} — ${p.paymentStatus}`,
        description:
          p.paymentStatus === 'Paid'
            ? `₹${(p.paidAmount || 0).toLocaleString()} paid · valid till ${new Date(p.endDate).toISOString().slice(0, 10)}`
            : `₹${(p.price || 0).toLocaleString()} pending`,
        ts: p.createdAtUtc,
      });
    }

    for (const a of m?.attendance ?? []) {
      events.push({
        id: `att-${a.id}`,
        type: 'attendance',
        title: `Attendance — ${this.statusLabel(a.status)}`,
        description: a.attendanceDate,
        ts: a.checkInAtUtc ? String(a.checkInAtUtc) : a.attendanceDate,
      });
    }

    return events.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 12);
  });

  ngOnInit() {
    this.loadMemberDetails();
    this.loadAttendanceCalendar();
    this.loadRecentAttendance();
  }

  setTab(tab: TabId): void { this.activeTab.set(tab); }

  loadMemberDetails(): void {
    this.loading.set(true);

    this.memberService.getMemberById(this.memberId).subscribe({
      next: (response) => {
        this.memberDetails.set(response.data ?? null);
        if (response.data?.attendance?.length) {
          this.mergeCalendarDays(response.data.attendance);
        }
        this.loading.set(false);
        this.getLibraryPlan();
      },
      error: (error) => {
        this.memberDetails.set(null);
        this.toast.error(error?.error?.message ?? 'Member not found');
        this.loading.set(false);
        this.commonService.goBack();
      }
    });
  }

  getLibraryPlan(): void {
    this.memberService.getLibraryPlan(this.memberDetails()?.institutionId ?? '', this.memberDetails()?.branchId ?? '', this.memberDetails()?.libraryId ?? '').subscribe({
      next: (response) => {
        this.plans.set(response.data ?? []);
      },
      error: (error) => {
        this.plans.set([]);
      }
    });
  }

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  toDayStatus(status?: AttendanceStatus | null): DayStatus {
    switch (status) {
      case AttendanceStatus.Present:
      case AttendanceStatus.CheckedIn:
      case AttendanceStatus.CheckedOut:
      case AttendanceStatus.AutoCheckedOut:
      case AttendanceStatus.MissedCheckout:
      case AttendanceStatus.HalfDay:
        return 'present';
      case AttendanceStatus.Late:
        return 'late';
      case AttendanceStatus.Absent:
        return 'absent';
      case AttendanceStatus.Leave:
      case AttendanceStatus.Holiday:
        return 'holiday';
      default:
        return 'none';
    }
  }

  statusLabel(status?: AttendanceStatus | null): string {
    return status ? AttendanceStatus[status] : 'None';
  }

  dayStatusPillClass(status?: AttendanceStatus | null): string {
    const s = this.toDayStatus(status);
    switch (s) {
      case 'present': return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'late': return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'absent': return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
      case 'holiday': return 'bg-slate-500/15 text-slate-500 border-slate-500/30';
      default: return 'bg-muted/30 text-muted-foreground border-muted';
    }
  }

  calendarCellClass(cell: CalendarCell): string {
    if (!cell.date) return 'opacity-0 pointer-events-none';
    const status = this.toDayStatus(cell.day?.status);
    switch (status) {
      case 'present': return 'bg-emerald-500/70 text-white';
      case 'late': return 'bg-amber-500/70 text-white';
      case 'absent': return 'bg-rose-500/60 text-white';
      case 'holiday': return 'bg-slate-400/30 text-muted-foreground';
      default: return 'bg-muted/40 text-muted-foreground';
    }
  }

  cellTitle(cell: CalendarCell): string {
    if (!cell.date) return '';
    const status = cell.day ? this.statusLabel(cell.day.status) : 'No record';
    const hours = cell.day?.durationMinutes ? ` · ${(cell.day.durationMinutes / 60).toFixed(1)}h` : '';
    return `${cell.date.toDateString()} — ${status}${hours}`;
  }

  heatmapCellClass(cell: HeatmapCell): string {
    if (cell.hours === -1) return 'bg-transparent';
    if (cell.status === 'absent') return 'bg-rose-500/40';
    if (cell.hours <= 0) return 'bg-muted/40';
    if (cell.hours < 3) return 'bg-emerald-500/20';
    if (cell.hours < 5) return 'bg-emerald-500/40';
    if (cell.hours < 7) return 'bg-emerald-500/70';
    return 'bg-emerald-600';
  }

  loadAttendanceCalendar(): void {
    this.calendarLoading.set(true);
    const cursor = this.calendarMonth();
    this.attendanceService.getAttendanceCalendar(this.memberId, cursor.getMonth() + 1, cursor.getFullYear()).subscribe({
      next: (response) => {
        this.mergeCalendarDays(response.data ?? []);
        this.calendarLoading.set(false);
      },
      error: () => this.calendarLoading.set(false),
    });
  }

  loadRecentAttendance(): void {
    // Prefetch previous months so the 90-day heatmap has data
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      this.attendanceService.getAttendanceCalendar(this.memberId, d.getMonth() + 1, d.getFullYear()).subscribe({
        next: (response) => this.mergeCalendarDays(response.data ?? []),
        error: () => undefined,
      });
    }
  }

  mergeCalendarDays(records: AttendanceResponse[]): void {
    if (!records?.length) return;
    const map = new Map<string, AttendanceResponse>();
    for (const r of this.calendarDays()) map.set(r.id, r);
    for (const r of records) map.set(r.id, r);
    this.calendarDays.set([...map.values()]);
  }

  prevMonth(): void {
    const c = this.calendarMonth();
    this.calendarMonth.set(new Date(c.getFullYear(), c.getMonth() - 1, 1));
    this.loadAttendanceCalendar();
  }

  nextMonth(): void {
    const c = this.calendarMonth();
    this.calendarMonth.set(new Date(c.getFullYear(), c.getMonth() + 1, 1));
    this.loadAttendanceCalendar();
  }

  goToday(): void {
    this.calendarMonth.set(new Date());
    this.loadAttendanceCalendar();
  }

  copyId(id: string): void {
    navigator.clipboard.writeText(id).then(
      () => this.toast.success(`Member ID copied: ${id}`),
      () => this.toast.error('Copy failed'),
    );
  }

  openDialog(d: 'branch' | 'seat' | 'shift' | 'plan'): void {
    this.actionsOpen.set(false);
    this.dialog.set(d);
    const member = this.memberDetails();

    if (!member) {
      return;
    }

    const shiftValue = (member?.shift ?? 'Morning') as Shift;
    this.toShift.set(shiftValue);
    this.selectedPlanId.set(member.planId ?? '');

    const currentPlan = this.plans().find(
      x => x.id === member.planId
    );

    this.selectedPlan.set(currentPlan ?? null);
  }

  renewFromBanner(): void {
    const m = this.memberDetails();
    const life = this.lifecycle();
    if (!m?.planId) return;
    this.renewTarget.set({
      id: m.id,
      name: m.name,
      plan: m.plan ?? 'Plan',
      planId: m.planId,
      expiry: life.expiry,
      daysLeft: life.daysLeft,
      feesOwed: m.feesOwed ?? 0,
      planDurationInDays: m.planDurationInDays ?? 30,
    });
  }

  closeRenew(): void {
    this.renewTarget.set(null);
    this.renewBusy.set(false);
  }

  confirmRenew(target: RenewTarget): void {
    this.renewBusy.set(true);
    this.memberService.renewMembership(target.id).subscribe({
      next: (response) => {
        this.memberDetails.set(response.data ?? null);
        this.toast.success(response.message ?? `${target.name} renewed`);
        this.closeRenew();
      },
      error: (error) => {
        this.renewBusy.set(false);
        this.toast.error(error.error?.message || 'Unable to renew plan. Please try again.');
      }
    });
  }

  closeDialog(): void {
    this.dialog.set(null);
    this.dialogBusy.set(false);
  }

  onPlanChange(planId: string): void {
    this.selectedPlanId.set(planId);

    const plan = this.plans().find(x => x.id === planId);

    this.selectedPlan.set(plan ?? null);
  }

  async confirmChangeShift(): Promise<void> {
    this.dialogBusy.set(true);
    await new Promise((r) => setTimeout(r, 500));
    this.toast.success(`Shift updated to ${this.toShift()}`);
    this.dialogBusy.set(false);
    this.closeDialog();
  }

  confirmChangePlanOrShift(): void {
    const member = this.memberDetails();

    if (!member) return;

    const request: ChangeMemberPlanShiftRequest = {};

    // Shift changed
    if (this.toShift() && this.toShift() !== member.shift && this.dialog() === 'shift') {
      request.shift = this.toShift();
    }

    // Plan changed AND valid plan selected
    if (this.selectedPlanId() && this.dialog() ==='plan') {
      request.planId = this.selectedPlanId();
    }

    if (!request.shift && !request.planId) {
      return;
    }

    this.dialogBusy.set(true);

    this.memberService.changePlanOrShift(member.id, request).subscribe({
      next: (response) => {
        this.memberDetails.set(response.data);
        this.toast.success(response.message);
        this.dialogBusy.set(false);

        this.closeDialog();
      },
      error: (error) => {
        this.dialogBusy.set(false);
        this.toast.error(error.error.message || 'Unable to change plan and shift. Please try again.');
      }
    });
  }

  addContact(request: CreateMemberContactRequest) {
    this.memberService.addContact(this.memberId, request).subscribe({
      next: (response) => {
        this.loadMemberDetails();
      },
      error: (error) => {
        this.toast.error(error.error.message || 'Unable to change plan and shift. Please try again.');
      }
    });
  }

  checkIn(isCheckIn: boolean) {
    const request: CheckInRequest = {
      memberId: this.memberId,
      seatNumber: this.memberDetails()?.seatNumber ?? '0',
      deviceId: 'web',
      remarks: (isCheckIn) ? 'Checked in via web app' : 'Checked out via web app',
    };
    this.attendanceService.checkIn(this.memberId, request, isCheckIn).subscribe({
      next: (response) => {
        this.loadMemberDetails();
        this.toast.success(response.message || 'Member checked in successfully.');
      },
      error: (error) => {
        console.error('Check-in error:', error);
        this.toast.error(error.error.message || 'Unable to check in. Please try again.');
      }
    });
  }

  formatDuration(minutes: number): string {
    if (!minutes) {
      return '0m';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${mins}m`;
  }

}