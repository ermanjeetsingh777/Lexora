export interface PricingFeature {
  title: string;
  included: boolean;
}

export interface PricingTier {
  key: string;
  name: 'Trial' | 'Starter' | 'Basic' | 'Professional' | 'Value' | 'Enterprise' | 'Premium';
  priceLabel: string;
  description: string;
  features: PricingFeature[];
  primary?: boolean;
  mostPopular?: boolean;
}