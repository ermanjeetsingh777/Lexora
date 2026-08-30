import { PackageCatalogItem, PackageFeature } from '@core/models/package-subscription.models';

export interface PricingFeatureGroup {
  module: string;
  features: PackageFeature[];
}

export interface PricingComparisonRow {
  module: string;
  featureName: string;
  values: Record<string, boolean>;
}

const MODULE_ORDER = [
  'Members & billing',
  'Branches & libraries',
  'Books & circulation',
  'Notifications',
  'Analytics & reports',
  'Support & onboarding',
  'Platform',
] as const;

export function isFeatureIncluded(feature: PackageFeature): boolean {
  return feature.featureValue !== '1';
}

export function featureLabel(feature: PackageFeature): string {
  const value = feature.featureValue?.trim();
  if (value && value !== '0' && value !== '1') {
    return `${feature.featureName}: ${value}`;
  }
  return feature.featureName;
}

export function featureModule(featureName: string): string {
  const name = featureName.toLowerCase();
  if (name.includes('institution') || name.includes('branch') || name.includes('library') || name.includes('libraries')) {
    return 'Branches & libraries';
  }
  if (name.includes('member') || name.includes('fees') || name.includes('late') || name.includes('seat') || name.includes('shift')) {
    return 'Members & billing';
  }
  if (name.includes('book') || name.includes('reservation')) {
    return 'Books & circulation';
  }
  if (name.includes('mail') || name.includes('notification') || name.includes('whatsapp')) {
    return 'Notifications';
  }
  if (name.includes('analytics') || name.includes('report') || name.includes('dashboard')) {
    return 'Analytics & reports';
  }
  if (name.includes('support') || name.includes('trial') || name.includes('add-on') || name.includes('addon')) {
    return 'Support & onboarding';
  }
  return 'Platform';
}

export function groupFeaturesByModule(features: PackageFeature[]): PricingFeatureGroup[] {
  const grouped = new Map<string, PackageFeature[]>();

  for (const feature of features) {
    const module = featureModule(feature.featureName);
    const list = grouped.get(module) ?? [];
    list.push(feature);
    grouped.set(module, list);
  }

  return MODULE_ORDER.filter((module) => grouped.has(module)).map((module) => ({
    module,
    features: grouped.get(module) ?? [],
  }));
}

export function formatPackagePrice(price: number): string {
  if (price <= 0) {
    return 'Free';
  }
  return `₹${price.toLocaleString('en-IN')}`;
}

export function formatPackageDuration(days: number): string {
  if (days === 14) {
    return '14-day trial';
  }
  if (days === 365) {
    return 'billed yearly';
  }
  if (days === 30) {
    return 'billed monthly';
  }
  return `${days} days`;
}

export function packageCtaLabel(pkg: PackageCatalogItem): string {
  if (pkg.ctaLabel?.trim()) {
    return pkg.ctaLabel.trim();
  }
  return pkg.price <= 0 ? 'Start free trial' : 'Get started';
}

export function buildComparisonRows(packages: PackageCatalogItem[]): PricingComparisonRow[] {
  const featureNames = new Set<string>();
  for (const pkg of packages) {
    for (const feature of pkg.features) {
      featureNames.add(feature.featureName);
    }
  }

  return Array.from(featureNames)
    .sort((a, b) => {
      const moduleDiff =
        MODULE_ORDER.indexOf(featureModule(a) as (typeof MODULE_ORDER)[number]) -
        MODULE_ORDER.indexOf(featureModule(b) as (typeof MODULE_ORDER)[number]);
      if (moduleDiff !== 0) {
        return moduleDiff;
      }
      return a.localeCompare(b);
    })
    .map((featureName) => ({
      module: featureModule(featureName),
      featureName,
      values: Object.fromEntries(
        packages.map((pkg) => {
          const feature = pkg.features.find((item) => item.featureName === featureName);
          return [pkg.id, feature ? isFeatureIncluded(feature) : false];
        }),
      ),
    }));
}

export function pricingGridClass(count: number): string {
  if (count <= 1) {
    return 'md:grid-cols-1 max-w-md mx-auto';
  }
  if (count === 2) {
    return 'md:grid-cols-2';
  }
  if (count === 3) {
    return 'md:grid-cols-3';
  }
  return 'md:grid-cols-2 xl:grid-cols-4';
}
