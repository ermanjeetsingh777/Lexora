export type LibraryDetailTab = 'overview' | 'seats' | 'members' | 'plans' | 'profile' | 'hours' | 'exceptions' | 'calendar' | 'sections';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DaySlot {
  closed: boolean;
  open: string | null;
  close: string | null;
}

export interface LibraryDayHours {
  day: DayKey;
  closed: boolean;
  open?: string | null;
  close?: string | null;
}

export interface HoursException {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  closed: boolean;
  open: string | null;
  close: string | null;
}

export interface LibrarySection {
  name: string;
  capacity: number;
  occupied?: number;
}

export interface LibraryFloorBreakdown {
  floor: number;
  libraries: number;
  capacity: number;
  occupied: number;
}

export interface LibraryTrendPoint {
  date: string;
  value: number;
}

export interface LibraryActivityItem {
  id: string;
  detail: string;
  occurredAtUtc: string;
}

export interface LibraryDetailView {
  id: string;
  institutionId: string;
  institutionName: string;
  branchId: string;
  branchName: string;
  city?: string | null;
  name: string;
  description?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  floor?: number | null;
  capacity: number;
  memberCount: number;
  checkedInToday: number;
  occupancyPercent: number;
  status: string;
  isActive: boolean;
  hoursStart?: string | null;
  hoursEnd?: string | null;
  branchHoursStart?: string | null;
  branchHoursEnd?: string | null;
  peakHourStart?: string | null;
  peakHourEnd?: string | null;
  occupancyTrend: LibraryTrendPoint[];
  floorBreakdown: LibraryFloorBreakdown[];
  weeklyHours: LibraryDayHours[];
  hoursExceptions: HoursException[];
  seats: LibrarySeat[];
  sections: LibrarySection[];
  recentActivity: LibraryActivityItem[];
}

export interface UpdateLibraryPayload {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  floor?: number;
  capacity?: number;
  isActive?: boolean;
}

export interface UpdateLibraryWeeklyHoursPayload {
  weeklyHours: LibraryDayHours[];
}

export interface UpdateLibraryHoursExceptionsPayload {
  exceptions: HoursExceptionPayload[];
}

export interface HoursExceptionPayload {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  closed: boolean;
  open: string | null;
  close: string | null;
}

export type SeatStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface LibrarySeatSession {
  memberName: string;
  membershipNo?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  isActive: boolean;
}

export interface LibrarySeat {
  id: string;
  number: string;
  row: number;
  col: number;
  section: string;
  floor: number;
  status: SeatStatus;
  type: string;
  memberName?: string | null;
  todaySessionCount?: number;
  todaySessions?: LibrarySeatSession[];
}

export type TimeFormat = '24h' | '12h';

export type TrendRange = 7 | 30 | 90;

export interface LibraryDetailQuery {
  trendDays?: TrendRange;
}
