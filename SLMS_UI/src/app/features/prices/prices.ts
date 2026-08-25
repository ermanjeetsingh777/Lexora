import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideLoader2, LucideX } from '@lucide/angular';
import { PackageCatalogItem } from '@core/models/package-subscription.models';
import { PackageService } from '@core/services/package.service';
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
    this.loadPackages();
  }

  loadPackages(): void {
    this.loading.set(true);
    this.error.set(null);

    this.packageService.getActivePackages().subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load pricing plans. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
