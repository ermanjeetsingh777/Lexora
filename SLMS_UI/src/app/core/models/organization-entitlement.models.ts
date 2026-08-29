export type OrganizationPackageTier = 'Basic' | 'Value' | 'Premium' | 'Trial' | string;

export interface UserAddonSummary {
  id: string;
  addonId: string;
  addonName: string;
  addonCode: string;
  resourceType: string;
  quantity: number;
  totalExtraQuantity: number;
  amountPaid: number;
  startDateUtc: string;
  endDateUtc: string;
  paymentStatus: string;
  isActive: boolean;
}

export interface OrganizationEntitlements {
  packageCode?: string | null;
  packageName?: string | null;
  packageTier: OrganizationPackageTier;
  isSuperAdmin: boolean;

  // Institutions
  institutionCount: number;
  maxInstitutions: number;
  canCreateInstitution: boolean;

  // Branches
  branchCount: number;
  maxBranches: number;
  canCreateBranch: boolean;

  // Libraries
  libraryCount: number;
  maxLibraries: number;
  canCreateLibrary: boolean;

  // Staff Users
  userCount: number;
  maxUsers: number;
  canCreateUser: boolean;

  // Members
  memberCount: number;
  maxMembers: number;
  canCreateMember: boolean;

  // Active Addons
  activeAddons?: UserAddonSummary[];
}
