export interface DashboardQuery {
  days?: number;
  institutionId?: string;
  branchId?: string;
  libraryId?: string;
}

export interface DashboardOverview {
  isSuperAdmin: boolean;
  scopeLabel: string;
  days: number;
  kpis: DashboardKpis;
  revenueTrend: DashboardTrendPoint[];
  attendanceTrend: DashboardAttendanceTrendPoint[];
  memberMix: DashboardMemberMix;
  branchPerformance: DashboardBranchPerformance[];
  recentActivity: DashboardActivityItem[];
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

export interface DashboardActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
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
  days: number;
  kpis: DashboardRevenueKpis;
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
