import type {
  InstitutionAttendanceDay,
  InstitutionOccupancyHeatmap,
  InstitutionTrendPoint,
} from './institution-detail.models';

export type BranchDetailTab = 'overview' | 'usage' | 'libraries' | 'staffing' | 'activity';
export type BranchActivityFilter = 'all' | 'check-in' | 'payment' | 'enrollment';

export interface BranchPeakHour {
  hour: string;
  checkIns: number;
}

export interface BranchFootfallDay {
  day: string;
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export interface BranchLibraryCard {
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

export interface BranchStaffMember {
  id: string;
  name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
}

export interface BranchActivityItem {
  id: string;
  type: string;
  actor: string;
  detail: string;
  occurredAtUtc: string;
}

export interface BranchDetailView {
  id: string;
  institutionId: string;
  institutionName: string;
  name: string;
  description?: string | null;
  city?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  managerName?: string | null;
  status: string;
  isActive: boolean;
  hoursStart?: string | null;
  hoursEnd?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity: number;
  memberCount: number;
  occupancyPercent: number;
  libraryCount: number;
  avgFootfallPerDay: number;
  revenueMtd: number;
  revenuePreviousMtd: number;
  revenueMonthly: number;
  revenueQuarterly: number;
  revenueYearly: number;
  revenueAllTime: number;
  occupancyTrend: InstitutionTrendPoint[];
  attendanceTrend: InstitutionAttendanceDay[];
  occupancyHeatmap: InstitutionOccupancyHeatmap;
  peakHours: BranchPeakHour[];
  footfallByShift: BranchFootfallDay[];
  libraries: BranchLibraryCard[];
  staff: BranchStaffMember[];
  activity: BranchActivityItem[];
}
