export interface BranchLibraryCapacityItem {
  id: string;
  name: string;
  floor?: number | null;
  capacity: number;
}

export interface BranchLibraryCapacitySummary {
  branchId: string;
  branchName: string;
  branchCapacity: number;
  allocatedCapacity: number;
  remainingCapacity: number;
  hasBranchCapacityLimit: boolean;
  branchHoursStart?: string | null;
  branchHoursEnd?: string | null;
  libraries: BranchLibraryCapacityItem[];
}
