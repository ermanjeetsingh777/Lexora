import { OnboardingSteps } from '@core/enums/OnbardingSteps';

export interface TenantRegistrationAddonItem {
  addonId: string;
  addonName: string;
  addonCode: string;
  resourceType: string;
  quantity: number;
  unitQuantity: number;
  totalExtraQuantity: number;
  amountPaid: number;
  isActive: boolean;
}

export interface TenantRegistrationItem {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  registeredAtUtc: string;
  onboardingStep: OnboardingSteps;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | string;
  adminRemarks?: string;
  finalApprovedAmount?: number;
  totalCalculatedAmount: number;
  approvedAtUtc?: string;
  rejectedAtUtc?: string;
  approvedBy?: string;
  isActive: boolean;

  // Package Details
  packageId?: string;
  packageName?: string;
  packageCode?: string;
  packageTier?: string;
  packagePrice: number;
  durationInDays: number;

  // Addons
  addons: TenantRegistrationAddonItem[];

  // Organization Nodes
  institutionId?: string;
  institutionName?: string;
  institutionCode?: string;
  institutionContactEmail?: string;
  institutionContactPhone?: string;

  branchId?: string;
  branchName?: string;
  branchCity?: string;

  libraryId?: string;
  libraryName?: string;
  libraryCapacity?: number;
}

export interface ApproveTenantRegistrationRequest {
  finalAmount?: number;
  remarks?: string;
}

export interface RejectTenantRegistrationRequest {
  reason: string;
}

export interface SuperAdminContactInfo {
  email: string;
  phone: string;
  secondaryPhone?: string;
  whatsApp: string;
  whatsAppUrl: string;
  availability: string;
}

export interface TenantRegistrationStatusResponse {
  userId: string;
  fullName: string;
  email: string;
  onboardingStep: OnboardingSteps;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | string;
  adminRemarks?: string;
  finalApprovedAmount?: number;
  totalCalculatedAmount: number;
  registeredAtUtc: string;

  packageName?: string;
  packageTier?: string;
  packagePrice: number;

  addons: TenantRegistrationAddonItem[];

  institutionName?: string;
  branchName?: string;
  libraryName?: string;

  superAdminContact: SuperAdminContactInfo;
}
