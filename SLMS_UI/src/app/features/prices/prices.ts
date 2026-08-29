import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideLoader2, LucideX } from '@lucide/angular';
import { PackageCatalogItem } from '@core/models/package-subscription.models';
import { PackageService } from '@core/services/package.service';
import { SeoService } from '@core/services/seo.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
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
  imports: [AppIconComponent, RouterLink, LucideCheck, LucideX, LucideLoader2],
  templateUrl: './prices.html',
  styleUrl: './prices.css',
})
export class Prices implements OnInit {
  private readonly packageService = inject(PackageService);
  private readonly seo = inject(SeoService);

  readonly packages = signal<PackageCatalogItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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
        'name': 'Lexora Smart Library Subscription',
        'description':
          'Cloud-hosted library management platform subscription with seat layouts, automated QR attendance, and multi-tenant management.',
        'brand': {
          '@type': 'Brand',
          'name': 'Lexora',
        },
        'offers': {
          '@type': 'AggregateOffer',
          'priceCurrency': 'INR',
          'lowPrice': '0',
          'offerCount': '3',
          'priceValidUntil': '2026-12-31',
        },
      },
    });
  }

  loadPackages(): void {
    this.loading.set(true);
    this.error.set(null);

    this.packageService.getActivePackages().subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.loading.set(false);

        if (packages.length > 0) {
          this.seo.setStructuredData({
            '@context': 'https://schema.org',
            '@type': 'Product',
            'name': 'Lexora Smart Library Subscription',
            'description':
              'Cloud-hosted library management platform subscription with seat layouts, automated QR attendance, and multi-tenant management.',
            'brand': {
              '@type': 'Brand',
              'name': 'Lexora',
            },
            'offers': {
              '@type': 'AggregateOffer',
              'priceCurrency': 'INR',
              'lowPrice': String(Math.min(...packages.map((p) => p.price ?? 0))),
              'highPrice': String(Math.max(...packages.map((p) => p.price ?? 0))),
              'offerCount': String(packages.length),
              'offers': packages.map((pkg) => ({
                '@type': 'Offer',
                'name': pkg.name,
                'description': pkg.description || `${pkg.name} plan for libraries`,
                'price': String(pkg.price ?? 0),
                'priceCurrency': 'INR',
                'availability': 'https://schema.org/InStock',
              })),
            },
          });
        }
      },
      error: () => {
        this.error.set('Could not load pricing plans. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
