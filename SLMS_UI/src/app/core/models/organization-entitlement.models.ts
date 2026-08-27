export type OrganizationPackageTier = 'Basic' | 'Value' | 'Premium';

export interface OrganizationEntitlements {
  packageCode?: string | null;
  packageName?: string | null;
  packageTier: OrganizationPackageTier;
  institutionCount: number;
  branchCount: number;
  libraryCount: number;
  isSuperAdmin: boolean;
  canCreateInstitution: boolean;
  canCreateBranch: boolean;
  canCreateLibrary: boolean;
}
