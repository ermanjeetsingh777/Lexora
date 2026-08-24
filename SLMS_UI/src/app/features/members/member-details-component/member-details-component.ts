import { Component, computed, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AppDatePipe, AppDateTimePipe, AppTimePipe } from '@core/pipes/app-date.pipes';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft, LucideMail, LucidePhone, LucideIdCard, LucideBuilding2,
  LucideMapPin, LucideArmchair, LucideClock, LucideDownload, LucideCreditCard,
  LucideChevronLeft, LucideChevronRight, LucideChevronsLeft, LucideChevronsRight, LucideTrendingUp, LucideCheckCircle2,
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
  LucideFileSpreadsheet,
  LucideKeyRound,
} from '@lucide/angular';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ChangeMemberPlanShiftRequest, CreateMemberContactRequest, MemberDetailResponse } from '@core/models/MemberRequest';
import { MemberService } from '../MemberService';
import { AttendanceScannerService } from '@core/services/attendance-scanner.service';
import { BookService } from '@features/books/book.service';
import { BookLoanStatus, LOAN_STATUS_LABELS, MemberBookLoan } from '@core/models/book.models';
import { formatBookDate } from '@features/books/book-format.util';
import { CommonService } from '@core/services/common.service';
import { MemberContactComponent } from "../pages/member-contact-component/member-contact-component";
import { MemberDigitalBooksComponent } from "../pages/member-digital-books-component/member-digital-books-component";
import { EVENT_DOT, Shift } from '@core/constType';
import { KeyValueResponse, PlanDropdownResponse, PlanResponse } from '@core/models/institution-dropdown.model';
import { MemberPaymentsComponent } from "../pages/member-payments-component/member-payments-component";
import { SelectButtonModule } from 'primeng/selectbutton';
import { AttendanceService } from '@core/services/attendance.service';
import { AttendanceCalendarResponse, AttendanceResponse, AttendanceStatisticsResponse, AttendanceStatus, CheckInRequest, CheckOutRequest, UpdateAttendanceRequest } from '@core/models/attendanceModels';
import { PlanStatus } from '@core/enums/OnbardingSteps';
import {
  computeMemberLifecycle, LIFECYCLE_TONE_CLASSES, lifecycleBannerClass, MemberLifecycle, RenewTarget,
} from '../member-lifecycle.util';
import { RenewPlanDialogComponent } from '../components/renew-plan-dialog/renew-plan-dialog.component';
import { MemberAttendanceCalendarComponent } from '../components/member-attendance-calendar/member-attendance-calendar.component';
import { LibraryCalendarComponent } from '@features/libraries/library-detail-component/library-calendar/library-calendar.component';
import { AttendanceSeatPickerComponent } from '@features/attendance/components/attendance-seat-picker/attendance-seat-picker.component';
import { AttendanceSeatOption } from '@core/models/attendanceModels';
import {
  attendanceTimeInputValue,
  localTimeInputToUtcTimeOnly,
} from '@features/attendance/attendance-format.util';
import { AttendanceExportService } from '@features/attendance/attendance-export.service';
import { collectRouteParams, memberBackNav, memberEditLink } from '@core/utils/entity-routes.util';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

type TabId = 'overview' | 'attendance' | 'library-calendar' | 'payments' | 'contacts' | 'plans' | 'books' | 'ebooks';

const ATTENDANCE_LOG_PAGE_SIZE_OPTS = [5, 10, 15, 30] as const;
const ACTIVITY_TIMELINE_PAGE_SIZE = 5;

type DayStatus = 'present' | 'late' | 'absent' | 'checkedIn' | 'holiday' | 'none' | 'future';

interface HeatmapCell {
  date: string;
  status: DayStatus;
  hours: number;
}

@Component({
  selector: 'app-member-details-component',
  imports: [
    AppDatePipe, AppDateTimePipe, AppTimePipe, FormsModule, RouterLink,
    ButtonComponent, PageHeaderComponent, SectionHeaderComponent, GlassCardComponent, StatusBadgeComponent,
    LucideArrowLeft, LucideMail, LucidePhone, LucideIdCard, LucideBuilding2,
    LucideMapPin, LucideArmchair, LucideClock, LucideDownload, LucideCreditCard,
    LucideChevronLeft, LucideChevronRight, LucideChevronsLeft, LucideChevronsRight, LucideTrendingUp, LucideCheckCircle2,
    LucideXCircle, LucideAlertTriangle, LucideCalendar, LucideUser, LucideShieldAlert,
    LucideCopy, LucideSettings2, LucideArrowRightLeft, LucideBadgeDollarSign,
    MemberContactComponent, MemberDigitalBooksComponent, CurrencyPipe, LucideTimer, LucideWallet, LucideBookOpen,
    LucideHistory, LucidePencil, LucideCalendarClock, LucideClock3, LucideSun,
    LucideFlame, LucideCalendarCheck, LucideActivity, LucideBookMarked, LucideRotateCcw,
    LucideDownload, LucideFileSpreadsheet,
    MemberPaymentsComponent, SelectButtonModule, LucideCrown, LucideSparkles, LucideLogIn, LucideLogOut,
    RenewPlanDialogComponent,
    MemberAttendanceCalendarComponent,
    LibraryCalendarComponent,
    AttendanceSeatPickerComponent,
  ],
  templateUrl: './member-details-component.html',
  styleUrl: './member-details-component.css',
  providers: [MemberService, AttendanceService, BookService]
})
export class MemberDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly memberService = inject(MemberService);
  private readonly attendanceScanner = inject(AttendanceScannerService);
  private readonly bookService = inject(BookService);
  readonly commonService = inject(CommonService);
  readonly attendanceService = inject(AttendanceService);
  private readonly attendanceExportService = inject(AttendanceExportService);

  get routeParams(): Record<string, string> {
    return collectRouteParams(this.route.snapshot);
  }

  get memberId(): string {
    return this.routeParams['memberId'] ?? '';
  }

  get backLink(): string | string[] {
    return memberBackNav(this.routeParams).link;
  }

  get backQueryParams(): { tab: string } | undefined {
    return memberBackNav(this.routeParams).queryParams;
  }

  get backLabel(): string {
    return memberBackNav(this.routeParams).label;
  }

  get editLink(): string[] {
    return memberEditLink(this.memberId, {
      institutionId: this.routeParams['institutionId'],
      branchId: this.routeParams['branchId'],
      libraryId: this.routeParams['libraryId'],
      onInstitutionRoute: this.router.url.startsWith('/institutions'),
    });
  }

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly memberDetails: WritableSignal<MemberDetailResponse | null> = signal<MemberDetailResponse | null>(null);
  readonly memberPhotoPreview = signal<string | null>(null);
  readonly memberAadhaarPreview = signal<string | null>(null);
  readonly memberAadhaarIsPdf = signal(false);
  readonly aadhaarUploading = signal(false);
  readonly memberAttendanceQr = signal<string | null>(null);
  readonly memberAttendanceScanUrl = signal<string | null>(null);
  readonly plans = signal<PlanResponse[]>([]);

  readonly activeTab = signal<TabId>('overview');
  readonly actionsOpen = signal(false);
  readonly dialog = signal<null | 'branch' | 'seat' | 'shift' | 'plan' | 'attendance' | 'password'>(null);
  hexNumber = Math.floor(Math.random() * 360);
  readonly tabs: { value: TabId; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'library-calendar', label: 'Library Calendar' },
    { value: 'books', label: 'Books' },
    { value: 'ebooks', label: 'E-Books' },
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
  readonly memberReportRecords = signal<AttendanceResponse[]>([]);
  readonly attendanceStatistics = signal<AttendanceStatisticsResponse | null>(null);
  readonly calendarMonth = signal<Date>(new Date());
  readonly calendarLoading = signal(false);
  readonly memberReportLoading = signal(false);
  readonly attendanceExporting = signal(false);
  readonly attendanceDateFrom = signal(monthStartIsoDate());
  readonly attendanceDateTo = signal(todayIsoDate());
  readonly librarySeats = signal<AttendanceSeatOption[]>([]);
  readonly seatsLoading = signal(false);
  readonly selectedSeatNumber = signal<string | null>(null);
  readonly editCheckInTime = signal('');
  readonly editCheckOutTime = signal('');
  readonly editSeatNumber = signal('');
  readonly editRemarks = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly canChangePassword =
    this.auth.hasRole('SuperAdmin') || this.auth.hasRole('OrganisationAdmin');
  readonly eventDot = EVENT_DOT;
  readonly ATTENDANCE_LOG_PAGE_SIZE_OPTS = ATTENDANCE_LOG_PAGE_SIZE_OPTS;
  readonly attendanceLogPage = signal(1);
  readonly attendanceLogPageSize = signal(10);
  readonly activityTimelineLimit = signal(ACTIVITY_TIMELINE_PAGE_SIZE);
  readonly Math = Math;
  readonly bookLoans = signal<MemberBookLoan[]>([]);
  readonly bookLoansLoading = signal(false);
  readonly BookLoanStatus = BookLoanStatus;
  readonly LOAN_STATUS_LABELS = LOAN_STATUS_LABELS;
  readonly formatBookDate = formatBookDate;

  readonly bookLoanStats = computed(() => {
    const loans = this.bookLoans();
    const physicalLoans = loans.filter(l => l.requiresReturn !== false);
    return {
      active: physicalLoans.filter(l => l.status === BookLoanStatus.Active).length,
      overdue: physicalLoans.filter(l => l.status === BookLoanStatus.Overdue).length,
      returned: physicalLoans.filter(l => l.status === BookLoanStatus.Returned).length,
      digital: loans.filter(l => l.hasPdf).length,
      total: loans.length,
      finesOwed: physicalLoans.reduce((sum, l) => sum + (l.fineAmount ?? 0), 0),
    };
  });

  readonly overdueBookLoans = computed(() =>
    this.bookLoans().filter(l => l.requiresReturn !== false && l.status === BookLoanStatus.Overdue)
  );

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

    if (!member) {
      return null;
    }

    const latestPayment = member.plans?.find((el) => el.isActive && el.isCurrent);
    if (latestPayment?.endDate) {
      return latestPayment.endDate;
    }

    return member.planEndDate ?? null;
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
    const records = this.memberReportRecords();
    const presentStatuses = new Set<AttendanceStatus>([
      AttendanceStatus.Present,
      AttendanceStatus.CheckedIn,
      AttendanceStatus.CheckedOut,
      AttendanceStatus.AutoCheckedOut,
      AttendanceStatus.MissedCheckout,
      AttendanceStatus.HalfDay,
    ]);

    const present = records.filter((r) => presentStatuses.has(r.status)).length;
    const late = records.filter((r) => r.status === AttendanceStatus.Late).length;
    const absent = records.filter((r) => r.status === AttendanceStatus.Absent).length;
    const holiday = records.filter((r) => r.status === AttendanceStatus.Holiday || r.status === AttendanceStatus.Leave).length;
    const workDays = records.length - holiday;
    const rate = workDays > 0 ? Math.round(((present + late) / workDays) * 100) : 0;

    let streak = 0;
    let best = 0;
    for (const record of [...records].sort((a, b) =>
      this.normalizeAttendanceDate(a.attendanceDate).localeCompare(this.normalizeAttendanceDate(b.attendanceDate)))) {
      if (presentStatuses.has(record.status) || record.status === AttendanceStatus.Late) {
        streak += 1;
        best = Math.max(best, streak);
      } else if (record.status === AttendanceStatus.Absent) {
        streak = 0;
      }
    }

    const apiStats = this.attendanceStatistics();
    return {
      present,
      late,
      absent,
      holiday,
      workDays,
      rate,
      bestStreak: best || apiStats?.longestStreak || 0,
    };
  });

  readonly heatmapCols = computed<HeatmapCell[][]>(() => {
    const today = this.startOfToday();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 88);
    const map = new Map(this.calendarDays().map(r => [this.normalizeAttendanceDate(r.attendanceDate), r]));

    const days: HeatmapCell[] = [];
    for (let i = 0; i < 89; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (d > today) break;
      const key = this.dateKey(d);
      const rec = map.get(key);
      days.push({
        date: key,
        status: rec ? this.toDayStatus(rec.status, d) : 'none',
        hours: rec ? (this.attendanceDurationMinutes(rec) ?? 0) / 60 : 0,
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
    [...this.memberReportRecords()].sort((a, b) =>
      this.normalizeAttendanceDate(b.attendanceDate).localeCompare(this.normalizeAttendanceDate(a.attendanceDate)),
    ),
  );

  readonly attendanceLogTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.attendanceLog().length / this.attendanceLogPageSize()))
  );

  readonly attendanceLogCurrentPage = computed(() =>
    Math.min(this.attendanceLogPage(), this.attendanceLogTotalPages())
  );

  readonly attendanceLogPageStart = computed(() =>
    (this.attendanceLogCurrentPage() - 1) * this.attendanceLogPageSize()
  );

  readonly pagedAttendanceLog = computed(() => {
    const start = this.attendanceLogPageStart();
    return this.attendanceLog().slice(start, start + this.attendanceLogPageSize());
  });

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

    return events.sort((a, b) => b.ts.localeCompare(a.ts));
  });

  readonly visibleActivityTimeline = computed(() =>
    this.activityTimeline().slice(0, this.activityTimelineLimit())
  );

  readonly hasMoreActivityTimeline = computed(() =>
    this.activityTimeline().length > this.activityTimelineLimit()
  );

  readonly activityTimelineRemaining = computed(() =>
    Math.max(0, this.activityTimeline().length - this.activityTimelineLimit())
  );

  ngOnInit() {
    this.loadMemberDetails();
    this.loadBookLoans();
    this.loadAttendanceCalendar();
    this.loadRecentAttendance();
    this.loadAttendanceStatistics();
  }

  ngOnDestroy(): void {
    this.revokeMemberPhotoPreview();
    this.revokeMemberAadhaarPreview();
  }

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
    if (tab === 'attendance') {
      this.loadAttendanceCalendar();
      this.loadAttendanceStatistics();
      this.loadMemberAttendanceReport();
    }
    if (tab === 'books') {
      this.loadBookLoans();
    }
  }

  onAttendanceDateFromChange(value: string): void {
    this.attendanceDateFrom.set(value);
    this.attendanceLogPage.set(1);
    this.loadMemberAttendanceReport();
  }

  onAttendanceDateToChange(value: string): void {
    this.attendanceDateTo.set(value);
    this.attendanceLogPage.set(1);
    this.loadMemberAttendanceReport();
  }

  loadMemberAttendanceReport(): void {
    if (!this.memberId) return;

    const dateFrom = this.attendanceDateFrom();
    const dateTo = this.attendanceDateTo();
    if (!dateFrom || !dateTo) return;

    this.memberReportLoading.set(true);
    this.attendanceExportService.loadMemberRecords(this.memberId, dateFrom, dateTo).subscribe({
      next: (records) => {
        this.memberReportRecords.set(records);
        this.memberReportLoading.set(false);
      },
      error: () => {
        this.memberReportRecords.set([]);
        this.memberReportLoading.set(false);
        this.toast.error('Could not load attendance records for the selected dates.');
      },
    });
  }

  exportMemberAttendanceReport(format: 'excel' | 'pdf'): void {
    const member = this.memberDetails();
    if (!member || this.attendanceExporting()) return;

    this.attendanceExporting.set(true);
    this.attendanceExportService.exportMemberRecords({
      memberId: member.id,
      memberName: member.name,
      membershipNo: member.membershipNo ?? '',
      libraryName: member.library,
      branchName: member.branch,
      shift: member.shift ?? '',
      dateFrom: this.attendanceDateFrom(),
      dateTo: this.attendanceDateTo(),
      format,
    }, () => this.attendanceExporting.set(false));
  }

  loadBookLoans(): void {
    if (!this.memberId) return;
    this.bookLoansLoading.set(true);
    this.bookService.getMemberLoans(this.memberId).subscribe({
      next: (res) => {
        this.bookLoans.set(res.data ?? []);
        this.bookLoansLoading.set(false);
      },
      error: () => {
        this.bookLoans.set([]);
        this.bookLoansLoading.set(false);
      },
    });
  }

  sendBookReturnReminder(loan: MemberBookLoan): void {
    if (loan.requiresReturn === false) {
      this.toast.error('Return reminders do not apply to digital PDF books.');
      return;
    }

    const member = this.memberDetails();
    if (!member?.institutionId || !member.branchId || !member.libraryId) {
      this.toast.error('Library scope is missing for this member.');
      return;
    }

    const scope = {
      institutionId: member.institutionId,
      branchId: member.branchId,
      libraryId: member.libraryId,
    };

    this.bookService.sendReturnReminder(scope, loan.bookId, loan.id).subscribe({
      next: (res) => {
        const reminder = res.data;
        this.toast.success('Return reminder sent.');
        if (reminder?.memberPhone) {
          this.whatsapp.bookReturnReminder(
            reminder.memberPhone,
            reminder.memberName,
            reminder.bookTitle,
            this.formatBookDate(reminder.dueAtUtc),
            reminder.daysOverdue,
            reminder.estimatedFine,
            member.library ?? 'Library',
          );
        }
        this.loadBookLoans();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to send reminder'),
    });
  }

  private loadMemberPhotoPreview(memberId: string): void {
    this.memberService.downloadPhoto(memberId).subscribe({
      next: (blob) => {
        this.revokeMemberPhotoPreview();
        this.memberPhotoPreview.set(URL.createObjectURL(blob));
      },
      error: () => this.memberPhotoPreview.set(null),
    });
  }

  private revokeMemberPhotoPreview(): void {
    const current = this.memberPhotoPreview();
    if (current) URL.revokeObjectURL(current);
    this.memberPhotoPreview.set(null);
  }

  private loadMemberAadhaarPreview(memberId: string): void {
    this.memberService.downloadAadhaar(memberId).subscribe({
      next: (blob) => {
        this.revokeMemberAadhaarPreview();
        const isPdf = blob.type === 'application/pdf';
        this.memberAadhaarIsPdf.set(isPdf);
        this.memberAadhaarPreview.set(URL.createObjectURL(blob));
      },
      error: () => {
        this.memberAadhaarIsPdf.set(false);
        this.memberAadhaarPreview.set(null);
      },
    });
  }

  private revokeMemberAadhaarPreview(): void {
    const current = this.memberAadhaarPreview();
    if (current) URL.revokeObjectURL(current);
    this.memberAadhaarPreview.set(null);
    this.memberAadhaarIsPdf.set(false);
  }

  onAadhaarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      this.toast.error('Please select a JPG, PNG, WEBP, or PDF file.');
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Aadhaar document must be 10 MB or smaller.');
      input.value = '';
      return;
    }

    this.aadhaarUploading.set(true);
    this.memberService.uploadAadhaar(this.memberId, file).subscribe({
      next: (response) => {
        this.toast.success('Aadhaar document uploaded.');
        if (response.data) {
          this.memberDetails.update((current) => current ? { ...current, hasAadhaar: true } : current);
        }
        this.loadMemberAadhaarPreview(this.memberId);
        this.aadhaarUploading.set(false);
        input.value = '';
      },
      error: (error) => {
        this.toast.error(error?.error?.message ?? 'Unable to upload Aadhaar document.');
        this.aadhaarUploading.set(false);
        input.value = '';
      },
    });
  }

  openAadhaarInNewTab(): void {
    const url = this.memberAadhaarPreview();
    if (url) window.open(url, '_blank', 'noopener');
  }

  private loadMemberAttendanceQr(): void {
    this.attendanceScanner.getMemberQr(this.memberId).subscribe({
      next: (qr) => {
        this.memberAttendanceQr.set(qr.qrCodeBase64);
        this.memberAttendanceScanUrl.set(qr.scanUrl);
      },
      error: () => {
        this.memberAttendanceQr.set(null);
        this.memberAttendanceScanUrl.set(null);
      },
    });
  }

  loadMemberDetails(): void {
    this.loading.set(true);
    this.activityTimelineLimit.set(ACTIVITY_TIMELINE_PAGE_SIZE);

    this.memberService.getMemberById(this.memberId).subscribe({
      next: (response) => {
        this.memberDetails.set(response.data ?? null);
        this.revokeMemberPhotoPreview();
        if (response.data?.hasPhoto) {
          this.loadMemberPhotoPreview(response.data.id);
        }
        this.revokeMemberAadhaarPreview();
        if (response.data?.hasAadhaar) {
          this.loadMemberAadhaarPreview(response.data.id);
        }
        this.loadMemberAttendanceQr();
        if (response.data?.attendance?.length) {
          this.mergeCalendarDays(response.data.attendance);
        }
        this.loadLibrarySeats(response.data?.libraryId);
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

  setAttendanceLogPageSize(size: number): void {
    this.attendanceLogPageSize.set(size);
    this.attendanceLogPage.set(1);
  }

  goToAttendanceLogPage(page: number): void {
    this.attendanceLogPage.set(Math.max(1, Math.min(page, this.attendanceLogTotalPages())));
  }

  showMoreActivityTimeline(): void {
    this.activityTimelineLimit.update((count) => count + ACTIVITY_TIMELINE_PAGE_SIZE);
  }

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  normalizeAttendanceDate(value?: string | null): string {
    if (!value) return '';
    return value.length >= 10 ? value.slice(0, 10) : value;
  }

  formatAttendanceTime(value?: string | Date | null): string {
    if (!value) return '—';
    if (typeof value === 'string') {
      if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return value;
    }
    return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatAttendanceDate(value?: string | null): string {
    const normalized = this.normalizeAttendanceDate(value);
    return normalized || '—';
  }

  attendanceDurationMinutes(record: AttendanceResponse): number | null {
    const dayDate = this.parseAttendanceDate(record.attendanceDate);
    const checkIn = this.combineAttendanceDateTime(dayDate, record.checkInAtUtc ?? record.checkInTime);
    const checkOut = this.combineAttendanceDateTime(dayDate, record.checkOutAtUtc ?? record.checkOutTime);

    if (checkIn && checkOut) {
      return Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60_000));
    }

    if (checkIn && record.durationMinutes != null && record.durationMinutes >= 0) {
      return record.durationMinutes;
    }

    return null;
  }

  private parseAttendanceDate(value?: string | null): Date {
    const normalized = this.normalizeAttendanceDate(value);
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private combineAttendanceDateTime(dayDate: Date, value?: string | Date | null): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        value.getHours(),
        value.getMinutes(),
        0,
        0,
      );
    }

    if (/^\d{2}:\d{2}/.test(value)) {
      const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
      const combined = new Date(dayDate);
      combined.setHours(hours, minutes, 0, 0);
      return combined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return new Date(
      dayDate.getFullYear(),
      dayDate.getMonth(),
      dayDate.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      0,
      0,
    );
  }

  toDayStatus(status?: AttendanceStatus | null, date?: Date): DayStatus {
    if (date && date > this.startOfToday()) return 'future';

    switch (status) {
      case AttendanceStatus.CheckedIn:
        return 'checkedIn';
      case AttendanceStatus.Present:
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
      case 'checkedIn': return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
      case 'present': return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'late': return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'absent': return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
      case 'holiday': return 'bg-slate-500/15 text-slate-500 border-slate-500/30';
      default: return 'bg-muted/30 text-muted-foreground border-muted';
    }
  }

  onCalendarViewDateChange(date: Date): void {
    const current = this.calendarMonth();
    if (
      current.getFullYear() !== date.getFullYear() ||
      current.getMonth() !== date.getMonth()
    ) {
      this.calendarMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
      this.loadAttendanceCalendar();
    } else {
      this.calendarMonth.set(date);
    }
  }

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  heatmapCellClass(cell: HeatmapCell): string {
    if (cell.hours === -1) return 'bg-transparent';
    if (cell.status === 'checkedIn') return 'bg-blue-500/50';
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
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      this.attendanceService.getAttendanceCalendar(this.memberId, d.getMonth() + 1, d.getFullYear()).subscribe({
        next: (response) => this.mergeCalendarDays(response.data ?? []),
        error: () => undefined,
      });
    }
  }

  loadAttendanceStatistics(): void {
    this.attendanceService.getAttendanceStatistics(this.memberId).subscribe({
      next: (response) => this.attendanceStatistics.set(response.data ?? null),
      error: () => this.attendanceStatistics.set(null),
    });
  }

  mergeCalendarDays(records: AttendanceResponse[]): void {
    if (!records?.length) return;
    const map = new Map<string, AttendanceResponse>();
    for (const r of this.calendarDays()) {
      map.set(this.normalizeAttendanceDate(r.attendanceDate), r);
    }
    for (const r of records) {
      map.set(this.normalizeAttendanceDate(r.attendanceDate), r);
    }
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

  openAttendanceHistory(): void {
    this.setTab('attendance');
    this.attendanceLogPage.set(1);
    setTimeout(() => {
      document.getElementById('attendance-check-in-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  openTodayAttendanceEdit(): void {
    const today = this.todayAttendance();
    if (!today?.checkInAtUtc && !today?.checkInTime) {
      this.toast.error('No attendance record to edit for today.');
      return;
    }

    this.editCheckInTime.set(attendanceTimeInputValue(today.checkInAtUtc, today.checkInTime));
    this.editCheckOutTime.set(attendanceTimeInputValue(today.checkOutAtUtc, today.checkOutTime));
    this.editSeatNumber.set(today.seatNo ?? this.memberDetails()?.seatNumber ?? '');
    this.editRemarks.set(today.remarks ?? '');
    this.dialog.set('attendance');
  }

  confirmUpdateTodayAttendance(): void {
    const today = this.todayAttendance();
    if (!today?.id) {
      this.toast.error('Attendance record not found.');
      return;
    }

    if (!this.editCheckInTime()) {
      this.toast.error('Check-in time is required.');
      return;
    }

    const checkInUtc = localTimeInputToUtcTimeOnly(this.editCheckInTime(), this.today());
    if (!checkInUtc) {
      this.toast.error('Invalid check-in time.');
      return;
    }

    let checkOutUtc: string | null = null;
    if (this.editCheckOutTime()) {
      checkOutUtc = localTimeInputToUtcTimeOnly(this.editCheckOutTime(), this.today());
      if (!checkOutUtc) {
        this.toast.error('Invalid check-out time.');
        return;
      }
    }

    const request: UpdateAttendanceRequest = {
      checkInTime: checkInUtc,
      checkOutTime: checkOutUtc,
      status: today.status,
      seatNumber: this.editSeatNumber() || undefined,
      remarks: this.editRemarks() || undefined,
      isActive: true,
    };

    this.dialogBusy.set(true);
    this.attendanceService.updateAttendance(today.id, request).subscribe({
      next: (response) => {
        this.dialogBusy.set(false);
        this.closeDialog();
        this.loadMemberDetails();
        this.loadAttendanceCalendar();
        this.loadAttendanceStatistics();
        this.toast.success(response.message || 'Attendance updated successfully.');
      },
      error: (error) => {
        this.dialogBusy.set(false);
        this.toast.error(error.error?.message || 'Unable to update attendance.');
      },
    });
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

  openPasswordDialog(): void {
    this.actionsOpen.set(false);
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.dialog.set('password');
  }

  confirmChangePassword(): void {
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

    this.dialogBusy.set(true);
    this.memberService.changeMemberPassword(this.memberId, {
      newPassword: password,
      confirmPassword: confirm,
    }).subscribe({
      next: (response) => {
        this.dialogBusy.set(false);
        this.closeDialog();
        this.toast.success(response.message ?? 'Member password updated');
      },
      error: (error) => {
        this.dialogBusy.set(false);
        this.toast.error(error?.error?.message ?? 'Failed to update member password');
      },
    });
  }

  renewFromBanner(): void {
    const m = this.memberDetails();
    const life = this.lifecycle();
    if (!m) return;
    this.renewTarget.set({
      id: m.id,
      name: m.name,
      plan: m.plan ?? 'Plan',
      planId: m.planId ?? '',
      hasPlan: life.state !== 'No plan',
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

    if (!target.hasPlan) {
      const planId = target.selectedPlanId;
      if (!planId) {
        this.renewBusy.set(false);
        this.toast.error('Please select a plan.');
        return;
      }

      this.memberService.changePlanOrShift(target.id, { planId }).subscribe({
        next: (response) => {
          this.memberDetails.set(response.data ?? null);
          this.toast.success(response.message ?? `${target.name} plan assigned`);
          this.closeRenew();
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

  loadLibrarySeats(libraryId?: string | null): void {
    if (!libraryId) {
      this.librarySeats.set([]);
      return;
    }

    this.seatsLoading.set(true);
    this.attendanceService.getLibrarySeats(libraryId).subscribe({
      next: (response) => {
        this.librarySeats.set(response.data ?? []);
        this.seatsLoading.set(false);
      },
      error: () => {
        this.librarySeats.set([]);
        this.seatsLoading.set(false);
      },
    });
  }

  checkIn(isCheckIn: boolean) {
    if (isCheckIn && !this.selectedSeatNumber()) {
      this.toast.error('Please select an available seat before checking in.');
      return;
    }

    const request: CheckInRequest = {
      memberId: this.memberId,
      seatNumber: isCheckIn ? this.selectedSeatNumber() ?? undefined : undefined,
      deviceId: 'web',
      remarks: (isCheckIn) ? 'Checked in via web app' : 'Checked out via web app',
    };
    this.attendanceService.checkIn(this.memberId, request, isCheckIn).subscribe({
      next: (response) => {
        this.loadMemberDetails();
        this.loadAttendanceCalendar();
        this.loadAttendanceStatistics();
        if (isCheckIn) {
          this.selectedSeatNumber.set(null);
        }
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