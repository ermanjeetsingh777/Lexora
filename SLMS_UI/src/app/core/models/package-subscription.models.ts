export type PackageSubscriptionStatus = 'Active' | 'ExpiringSoon' | 'Expired';

export interface PackageFeature {
  id: string;
  featureName: string;
  featureValue: string;
}

export interface PackageCatalogItem {
  id: string;
  name: string;
  code?: string;
  category?: string;
  description?: string | null;
  price: number;
  durationInDays: number;
  isActive: boolean;
  isPopular?: boolean;
  ctaLabel?: string | null;
  maxInstitutions?: number;
  maxBranches?: number;
  maxLibraries?: number;
  maxUsers?: number;
  maxMembers?: number;
  features: PackageFeature[];
}

export interface AddonCatalogItem {
  id: string;
  name: string;
  code: string;
  resourceType: 'Institution' | 'Branch' | 'Library' | 'User' | 'Member' | string;
  unitQuantity: number;
  price: number;
  durationInDays: number;
  description?: string | null;
  isActive: boolean;
}

export interface UserAddonItem {
  id: string;
  userId?: string;
  userFullName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  institutionName?: string | null;
  addonId: string;
  addonName: string;
  addonCode: string;
  resourceType: string;
  quantity: number;
  unitQuantity?: number;
  totalExtraQuantity: number;
  amountPaid: number;
  finalApprovedAmount?: number | null;
  startDateUtc: string;
  endDateUtc: string;
  paymentStatus: string;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected' | string;
  adminRemarks?: string | null;
  approvedAtUtc?: string | null;
  rejectedAtUtc?: string | null;
  approvedBy?: string | null;
  isActive: boolean;
  createdAtUtc?: string;
}

export interface PurchaseAddonRequest {
  addonId: string;
  quantity: number;
  paymentMethod?: string;
  transactionId?: string;
  note?: string;
}

export interface ApproveAddonRequest {
  finalAmount?: number | null;
  remarks?: string | null;
}

export interface RejectAddonRequest {
  reason: string;
}

export interface PackageSubscriptionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  institutionId?: string | null;
  institutionName?: string | null;
  packageId: string;
  packageName: string;
  packageCode: string;
  packageCategory?: string | null;
  packagePrice: number;
  amountPaid: number;
  finalApprovedAmount?: number | null;
  adjustmentAmount: number;
  durationInDays: number;
  startDateUtc: string;
  endDateUtc: string;
  autoRenew: boolean;
  isCurrentPackage: boolean;
  isActive: boolean;
  paymentStatus: string;
  status: PackageSubscriptionStatus;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected' | string;
  adminRemarks?: string | null;
  approvedAtUtc?: string | null;
  rejectedAtUtc?: string | null;
  approvedBy?: string | null;
  requestType?: string | null;
  note?: string | null;
  daysRemaining: number;
  canRenew: boolean;
  canUpgrade: boolean;
  createdAtUtc: string;
  features: PackageFeature[];
}

export interface PackageSubscriptionHistoryItem extends PackageSubscriptionItem {
  action: string;
}

export interface PackageSubscriptionSummary {
  totalActive: number;
  expiringSoonCount: number;
  expiredCount: number;
  totalRevenue: number;
}

export interface PackageSubscriptionOverview {
  isSuperAdmin: boolean;
  summary: PackageSubscriptionSummary;
  currentSubscription?: PackageSubscriptionItem | null;
  pendingRequest?: PackageSubscriptionItem | null;
  activeSubscriptions: PackageSubscriptionItem[];
  expiringSoon: PackageSubscriptionItem[];
  expired: PackageSubscriptionItem[];
  history: PackageSubscriptionHistoryItem[];
  availablePackages: PackageCatalogItem[];
  availableAddons?: AddonCatalogItem[];
  activeAddons?: UserAddonItem[];
}

export interface RenewPackageSubscriptionRequest {
  subscriptionId?: string;
  packageId?: string;
  autoRenew?: boolean;
  amountPaid?: number;
  adjustmentAmount?: number;
  paymentStatus?: string;
  note?: string;
  transactionId?: string;
}

export interface UpdatePackageSubscriptionRequest {
  packageId?: string;
  endDateUtc?: string;
  amountPaid?: number;
  adjustmentAmount?: number;
  autoRenew?: boolean;
  paymentStatus?: string;
}

export interface SubscribePackageRequest {
  packageId: string;
  autoRenew: boolean;
}

export interface UpgradePackageRequest {
  subscriptionId?: string;
  newPackageId: string;
  autoRenew: boolean;
  note?: string;
  transactionId?: string;
}

export interface ApproveSubscriptionRequest {
  finalApprovedAmount?: number | null;
  adminRemarks?: string | null;
}

export interface RejectSubscriptionRequest {
  adminRemarks?: string | null;
}

export interface UserPackageSummary {
  id: string;
  userId: string;
  packageId: string;
  packageName: string;
  price: number;
  startDateUtc: string;
  endDateUtc: string;
  autoRenew: boolean;
  isCurrentPackage: boolean;
  paymentStatus: string;
  approvalStatus?: string;
  requestType?: string;
}

export interface PackageSubscriptionQuote {
  subscriptionId: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  adjustmentAmount: number;
  amountPaid: number;
  remainingDays: number;
  isExpired: boolean;
  currentPackageName: string;
}
