export type InstitutionDetailTab = 'overview' | 'branches' | 'libraries' | 'billing' | 'settings';

export interface InstitutionDetail {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  timeZone?: string | null;
  status: string | number;
  isActive?: boolean;
}

export interface InstitutionOverview {
  id: string;
  code: string;
  name: string;
  type?: string | null;
  location?: string | null;
  status: string;
  isActive: boolean;
  activeBranchCount: number;
  totalLibraryCount: number;
  enrolledMemberCount: number;
  occupiedSeats: number;
  totalSeats: number;
  occupancyPercent: number;
  capacityUtilization: {
    totalSeats: number;
    currentMembers: number;
    totalLibraries: number;
  };
  memberMix: {
    active: number;
    inactive: number;
    suspended: number;
  };
  revenueMtd: number;
  revenuePreviousMtd?: number;
  revenueMonthly?: number;
  revenueQuarterly?: number;
  revenueYearly?: number;
  revenueAllTime?: number;
  revenueTrend?: InstitutionRevenueDay[];
  occupancyTrend?: InstitutionTrendPoint[];
  attendanceTrend?: InstitutionAttendanceDay[];
  occupancyHeatmap?: InstitutionOccupancyHeatmap;
}

export interface InstitutionRevenueDay {
  date: string;
  revenue: number;
  renewals: number;
}

export interface InstitutionAttendanceDay {
  date: string;
  present: number;
  late: number;
  absent: number;
}

export interface InstitutionOccupancyHeatmap {
  days: string[];
  hours: number[];
  cells: { day: string; hour: number; value: number }[];
}

export interface InstitutionTrendPoint {
  date: string;
  value: number;
}

export interface InstitutionBilling {
  status: string;
  revenueMtd: number;
  revenueAllTime: number;
  activeMembers: number;
  invoices: InstitutionBillingInvoice[];
}

export interface InstitutionBillingInvoice {
  id: string;
  memberId?: string | null;
  memberName?: string | null;
  number: string;
  issuedAtUtc: string;
  paidAtUtc?: string | null;
  planStartDate?: string | null;
  planEndDate?: string | null;
  amount: number;
  status: string;
  description: string;
  planName?: string | null;
}

export interface InstitutionBranchCard {
  id: string;
  name: string;
  city?: string | null;
  contact?: string | null;
  capacity: number;
  occupancyPercent: number;
  libraryCount: number;
  memberCount: number;
  status: string;
  isActive: boolean;
}

export interface InstitutionBranchesView {
  institutionId: string;
  institutionName: string;
  code: string;
  type?: string | null;
  location?: string | null;
  summary: {
    totalBranches: number;
    activeBranches: number;
    totalCapacity: number;
    averageOccupancyPercent: number;
    nearCapacityCount: number;
  };
  branches: InstitutionBranchCard[];
  topPerformer?: {
    branchId: string;
    name: string;
    city?: string | null;
    occupancyPercent: number;
    memberCount: number;
    libraryCount: number;
    capacity: number;
  } | null;
  needsAttention: {
    branchId: string;
    name: string;
    city?: string | null;
    occupancyPercent: number;
    memberCount: number;
    libraryCount: number;
    capacity: number;
  }[];
}

export interface UpdateInstitutionRequest {
  name?: string | null;
  description?: string | null;
  type?: string | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  timeZone?: string | null;
  isActive?: boolean | null;
}

export interface InstitutionListSummary {
  totalInstitutions: number;
  totalBranches: number;
  totalLibraries: number;
  totalMembers: number;
  revenueMtd: number;
  revenuePreviousMtd: number;
  revenueMonthly: number;
  revenueQuarterly: number;
  revenueYearly: number;
  revenueAllTime: number;
  averageOccupancyPercent: number;
}

export interface InstitutionListItem {
  id: string;
  code: string;
  name: string;
  initials: string;
  type?: string | null;
  location?: string | null;
  status: string;
  updateCount: number;
  occupancyPercent: number;
  branchCount: number;
  memberCount: number;
  revenue: number;
  healthStatus: string;
  logoUrl?: string | null;
  isActive: boolean;
}

export interface InstitutionListView {
  summary: InstitutionListSummary;
  items: InstitutionListItem[];
}

export interface InstitutionListQuery {
  search?: string;
  type?: string;
  status?: string;
}

export interface InstitutionBranchListQuery {
  search?: string;
  status?: string;
  size?: string;
}

export interface InstitutionLibraryCard {
  id: string;
  branchId: string;
  name: string;
  branchName: string;
  city?: string | null;
  floor?: number | null;
  capacity: number;
  memberCount: number;
  occupancyPercent: number;
  status: string;
  isActive: boolean;
}

export interface InstitutionLibrariesView {
  institutionId: string;
  institutionName: string;
  summary: {
    totalLibraries: number;
    activeLibraries: number;
    totalCapacity: number;
    averageOccupancyPercent: number;
  };
  libraries: InstitutionLibraryCard[];
}

export interface InstitutionQuickViewQuery {
  metric?: 'occupancy' | 'revenue';
  range?: 7 | 14 | 30;
}

export interface InstitutionQuickViewActivityItem {
  occurredAtUtc: string;
  text: string;
  severity: 'info' | 'warn';
}

export interface InstitutionQuickView {
  trend: {
    metric: string;
    rangeDays: number;
    points: InstitutionTrendPoint[];
  };
  activity: InstitutionQuickViewActivityItem[];
}
