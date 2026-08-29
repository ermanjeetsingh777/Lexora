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

export interface PurchaseAddonRequest {
  addonId: string;
  quantity: number;
  paymentMethod?: string;
  transactionId?: string;
}

export interface PackageSubscriptionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  institutionId?: string | null;
  institutionName?: string | null;
  packageId: string;
  packageName: string;
  packageCode: string;
  packageCategory?: string | null;
  packagePrice: number;
  amountPaid: number;
  adjustmentAmount: number;
  durationInDays: number;
  startDateUtc: string;
  endDateUtc: string;
  autoRenew: boolean;
  isCurrentPackage: boolean;
  isActive: boolean;
  paymentStatus: string;
  status: PackageSubscriptionStatus;
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
