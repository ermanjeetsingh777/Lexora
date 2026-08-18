export interface BranchListSummary {
  totalBranches: number;
  activeBranches: number;
  totalCapacity: number;
  totalOccupied: number;
  averageOccupancyPercent: number;
  nearCapacityCount: number;
  totalLibraries: number;
  cityCount: number;
  revenueMtd: number;
  revenuePreviousMtd: number;
  revenueMonthly: number;
  revenueQuarterly: number;
  revenueYearly: number;
  revenueAllTime: number;
}

export interface BranchListItem {
  id: string;
  institutionId: string;
  institutionName: string;
  name: string;
  city?: string | null;
  contact?: string | null;
  managerName?: string | null;
  capacity: number;
  memberCount: number;
  occupancyPercent: number;
  libraryCount: number;
  status: string;
  isActive: boolean;
  hoursStart?: string | null;
  hoursEnd?: string | null;
}

export interface BranchListInsight {
  branchId: string;
  institutionId: string;
  institutionName: string;
  name: string;
  city?: string | null;
  occupancyPercent: number;
  memberCount: number;
  libraryCount: number;
  capacity: number;
}

export interface BranchListView {
  summary: BranchListSummary;
  items: BranchListItem[];
  topPerformer?: BranchListInsight | null;
  needsAttention: BranchListInsight[];
}

export interface BranchListQuery {
  search?: string;
  status?: string;
  institutionId?: string;
}

export type BranchStatusFilter = 'all' | 'Active' | 'Maintenance' | 'Closed';
export type BranchOccFilter = 'any' | 'low' | 'mid' | 'high';
export type BranchViewMode = 'grid' | 'table';
