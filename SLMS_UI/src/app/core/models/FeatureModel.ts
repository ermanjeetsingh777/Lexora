export interface FeatureItem {
  title: string;
  description: string;
  icon: string;
}

export interface FeatureSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  isPremium?: boolean;
  features: FeatureItem[];
}