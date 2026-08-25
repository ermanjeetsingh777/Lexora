import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideLoader2, LucideX } from '@lucide/angular';
import { LandingFeature } from '@core/models/LandingFeature';
import { PackageCatalogItem } from '@core/models/package-subscription.models';
import { toLandingFeatures } from '@core/data/feature-catalog';
import { PackageService } from '@core/services/package.service';
import { StorageService } from '@core/services/storage.service';
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
} from './landing-pricing.util';

@Component({
  selector: 'app-landing-home-page',
  imports: [CommonModule, RouterLink, AppIconComponent, LucideCheck, LucideX, LucideLoader2],
  templateUrl: './landing-home-page.html',
  styleUrl: './landing-home-page.css',
})
export class LandingHomePage implements OnInit {
  protected readonly storageService = inject(StorageService);
  private readonly packageService = inject(PackageService);

  protected readonly packages = signal<PackageCatalogItem[]>([]);
  protected readonly packagesLoading = signal(true);
  protected readonly packagesError = signal<string | null>(null);

  protected readonly comparisonRows = computed(() => buildComparisonRows(this.packages()));
  protected readonly pricingGridClass = computed(() => pricingGridClass(this.packages().length));

  protected readonly formatPackagePrice = formatPackagePrice;
  protected readonly formatPackageDuration = formatPackageDuration;
  protected readonly packageCtaLabel = packageCtaLabel;
  protected readonly groupFeaturesByModule = groupFeaturesByModule;
  protected readonly isFeatureIncluded = isFeatureIncluded;
  protected readonly featureLabel = featureLabel;

  protected features = signal<LandingFeature[]>(toLandingFeatures());

  ngOnInit(): void {
    this.loadPackages();
  }

  protected loadPackages(): void {
    this.packagesLoading.set(true);
    this.packagesError.set(null);

    this.packageService.getActivePackages().subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.packagesLoading.set(false);
      },
      error: () => {
        this.packagesError.set('Could not load pricing plans. Please try again.');
        this.packagesLoading.set(false);
      },
    });
  }
}
