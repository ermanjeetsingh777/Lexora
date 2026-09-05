import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideLoader2, LucideX } from '@lucide/angular';
import { AddonCatalogItem, PackageCatalogItem } from '@core/models/package-subscription.models';
import { PackageService } from '@core/services/package.service';
import { AddonService } from '@core/services/addon.service';
import { LEXORA_PRICING_FAQS } from '@core/data/seo-aeo.content';
import { SeoService } from '@core/services/seo.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { SeoFaqComponent } from '@shared/components/seo-faq/seo-faq.component';
import {
  buildComparisonRows,
  featureLabel,
  formatPackageDuration,
  formatPackagePrice,
  groupFeaturesByModule,
  isFeatureIncluded,
  packageCtaLabel,
  pricingGridClass,
} from '../landing/landing-pricing.util';

@Component({
  selector: 'app-prices',
  imports: [AppIconComponent, RouterLink, LucideCheck, LucideX, LucideLoader2, SeoFaqComponent],
  templateUrl: './prices.html',
  styleUrl: './prices.css',
})
export class Prices implements OnInit {
  private readonly packageService = inject(PackageService);
  private readonly addonService = inject(AddonService);
  private readonly seo = inject(SeoService);

  readonly packages = signal<PackageCatalogItem[]>([]);
  readonly addons = signal<AddonCatalogItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pricingFaqs = LEXORA_PRICING_FAQS;
  readonly pricingAnswerSummary =
    'Lexora pricing is transparent SaaS subscriptions for single libraries and multi-branch institutions. Compare Basic, Value, and Premium plans with included modules on uniappx.in/prices; entry options emphasize low setup friction.';

  readonly comparisonRows = computed(() => buildComparisonRows(this.packages()));
  readonly gridClass = computed(() => pricingGridClass(this.packages().length));

  readonly formatPackagePrice = formatPackagePrice;
  readonly formatPackageDuration = formatPackageDuration;
  readonly packageCtaLabel = packageCtaLabel;
  readonly groupFeaturesByModule = groupFeaturesByModule;
  readonly isFeatureIncluded = isFeatureIncluded;
  readonly featureLabel = featureLabel;

  ngOnInit(): void {
    this.initSeo();
    this.loadPackages();
  }

  private initSeo(): void {
    this.seo.updateSeo({
      title: 'Pricing Plans & Subscriptions | Lexora',
      description:
        'Transparent, flexible pricing for single libraries and multi-branch institutions. Explore Basic, Value, and Premium plans with instant onboarding and zero setup friction.',
      answerSummary: this.pricingAnswerSummary,
      faqs: LEXORA_PRICING_FAQS,
      path: '/prices',
      keywords: [
        'library software pricing',
        'library management system cost',
        'smart library subscription',
        'saas library pricing plans',
        'lexora pricing',
        'affordable library software',
      ],
      image: 'assets/landing/landing-float-revenue.png',
      imageAlt: 'Lexora Pricing Plans and Subscription Packages',
      type: 'product',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Lexora Smart Library Subscription',
        description:
          'Cloud-hosted library management platform subscription with seat layouts, automated QR attendance, and multi-tenant management.',
        brand: {
          '@type': 'Brand',
          name: 'Lexora',
        },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'INR',
          lowPrice: '0',
          offerCount: '3',
          priceValidUntil: '2026-12-31',
        },
      },
    });
  }

  loadPackages(): void {
    this.loading.set(true);
    this.error.set(null);

    this.packageService.getActivePackages().subscribe({
      next: (items) => {
        this.packages.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load packages. Please try again.');
        this.loading.set(false);
      },
    });

    this.addonService.getActiveAddons().subscribe({
      next: (addons) => {
        this.addons.set(addons);
      },
      error: () => {},
    });
  }
}
