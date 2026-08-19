export interface LibraryListSummary {
  totalLibraries: number;
  activeLibraries: number;
  totalCapacity: number;
  totalOccupied: number;
  averageOccupancyPercent: number;
  nearCapacityCount: number;
  branchCount: number;
  revenueMtd: number;
  revenuePreviousMtd: number;
  revenueMonthly: number;
  revenueQuarterly: number;
  revenueYearly: number;
  revenueAllTime: number;
}

export interface LibraryListItem {
  id: string;
  institutionId: string;
  institutionName: string;
  branchId: string;
  branchName: string;
  name: string;
  city?: string | null;
  floor?: number | null;
  capacity: number;
  memberCount: number;
  occupancyPercent: number;
  status: string;
  isActive: boolean;
  hoursStart?: string | null;
  hoursEnd?: string | null;
}

export interface LibraryListInsight {
  libraryId: string;
  branchId: string;
  institutionId: string;
  institutionName: string;
  branchName: string;
  name: string;
  city?: string | null;
  floor?: number | null;
  occupancyPercent: number;
  memberCount: number;
  capacity: number;
}

export interface LibraryListRevenueSummary {
  revenueMtd: number;
  revenuePreviousMtd: number;
  revenueMonthly: number;
  revenueQuarterly: number;
  revenueYearly: number;
  revenueAllTime: number;
}

export interface LibraryListView {
  summary: LibraryListSummary;
  items: LibraryListItem[];
  topPerformer?: LibraryListInsight | null;
  needsAttention: LibraryListInsight[];
}

export interface LibraryListQuery {
  search?: string;
  status?: string;
  institutionId?: string;
  branchId?: string;
}

export type LibraryStatusFilter = 'all' | 'Active' | 'Maintenance' | 'Closed';
export type LibraryOccFilter = 'any' | 'low' | 'mid' | 'high';
export type LibraryViewMode = 'grid' | 'table';
