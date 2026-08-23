export type DashboardPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all';

export interface DashboardQuery {
  period?: DashboardPeriod;
  days?: number;
  institutionId?: string;
  branchId?: string;
  libraryId?: string;
}

export interface DashboardActivityQuery extends DashboardQuery {
  activityDays?: number;
  limit?: number;
}

export interface DashboardActivity {
  isSuperAdmin: boolean;
  scopeLabel: string;
  activityDays: number;
  totalCount: number;
  summary: DashboardActivitySummary;
  items: DashboardActivityItem[];
}

export interface DashboardRevenueBreakdown {
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  allTime: number;
}

export interface DashboardRevenueCharts {
  monthlyTrend: DashboardTrendPoint[];
  quarterlyTrend: DashboardTrendPoint[];
  yearlyTrend: DashboardTrendPoint[];
}

export interface DashboardOverview {
  isSuperAdmin: boolean;
  scopeLabel: string;
  period: DashboardPeriod;
  periodLabel: string;
  days: number;
  kpis: DashboardKpis;
  revenueBreakdown: DashboardRevenueBreakdown;
  revenueCharts: DashboardRevenueCharts;
  revenueTrend: DashboardTrendPoint[];
  attendanceTrend: DashboardAttendanceTrendPoint[];
  memberMix: DashboardMemberMix;
  branchPerformance: DashboardBranchPerformance[];
  libraryPerformance: DashboardLibraryPerformance[];
  recentActivity: DashboardActivityItem[];
  activitySummary: DashboardActivitySummary;
  notifications: DashboardNotificationItem[];
}

export interface DashboardKpis {
  activeMembers: number;
  activeMembersDelta: number;
  occupancyPercent: number;
  occupancyDelta: number;
  revenueMtd: number;
  revenueMtdDelta: number;
  branchesLive: number;
  branchesMaintenance: number;
  totalFeesOwed: number;
  accessibleLibraries: number;
  totalMembers: number;
  totalLibraries: number;
}

export interface DashboardTrendPoint {
  date: string;
  revenue: number;
  renewals: number;
}

export interface DashboardAttendanceTrendPoint {
  date: string;
  present: number;
  late: number;
  absent: number;
}

export interface DashboardMemberMix {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  totalFeesOwed: number;
}

export interface DashboardBranchPerformance {
  branchId: string;
  branchName: string;
  city?: string | null;
  members: number;
  occupancyPercent: number;
  revenueMtd: number;
}

export interface DashboardLibraryPerformance {
  libraryId: string;
  libraryName: string;
  branchName: string;
  members: number;
  occupancyPercent: number;
  revenueMtd: number;
}

export type DashboardActivityType =
  | 'check-in'
  | 'check-out'
  | 'payment'
  | 'enrollment'
  | 'renewal'
  | 'book-checkout'
  | 'book-return'
  | 'pending-payment';

export interface DashboardActivitySummary {
  todayCheckIns: number;
  todayCheckOuts: number;
  todayPayments: number;
  todayEnrollments: number;
  todayBookLoans: number;
  todayPendingPayments: number;
}

export interface DashboardActivityItem {
  id: string;
  activityType: DashboardActivityType;
  actor: string;
  action: string;
  target: string;
  detail?: string | null;
  occurredAtUtc: string;
  timeLabel: string;
}

export interface DashboardNotificationItem {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  createdAtUtc: string;
}

export interface DashboardRevenue {
  isSuperAdmin: boolean;
  scopeLabel: string;
  period: DashboardPeriod;
  periodLabel: string;
  days: number;
  kpis: DashboardRevenueKpis;
  revenueBreakdown: DashboardRevenueBreakdown;
  revenueCharts: DashboardRevenueCharts;
  trend: DashboardTrendPoint[];
  recentTransactions: DashboardPaymentTransaction[];
}

export interface DashboardRevenueKpis {
  totalRevenue: number;
  totalRenewals: number;
  avgDailyRevenue: number;
  paidCount: number;
  pendingCount: number;
}

export interface DashboardPaymentTransaction {
  id: string;
  memberName: string;
  planName: string;
  amount: number;
  paidAmount: number;
  paymentStatus: string;
  createdAtUtc: string;
}

export const DASHBOARD_PERIOD_OPTIONS: { key: DashboardPeriod; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'all', label: 'All time' },
];
