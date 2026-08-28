import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideLoader2, LucideX } from '@lucide/angular';
import { LandingFeature } from '@core/models/LandingFeature';
import { LexoraTeamMember } from '@core/models/lexora-team-member.model';
import { PackageCatalogItem } from '@core/models/package-subscription.models';
import { toLandingFeatures } from '@core/data/feature-catalog';
import { PackageService } from '@core/services/package.service';
import { StorageService } from '@core/services/storage.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { environment } from '../../../environments/environment';
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
  protected readonly lexoraTeam: LexoraTeamMember[] = environment.lexoraTeam;

  protected teamInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected readonly landingAssets = {
    hero3d: 'assets/landing/landing-hero-3d.png',
    floatOccupancy: 'assets/landing/landing-float-occupancy.png',
    floatAttendance: 'assets/landing/landing-float-attendance.png',
    floatRevenue: 'assets/landing/landing-float-revenue.png',
    workflowNetwork: 'assets/features/branch-management.png',
  };

  protected heroRotateX = signal(0);
  protected heroRotateY = signal(0);

  protected heroSceneTransform = computed(
    () => `rotateX(${this.heroRotateX()}deg) rotateY(${this.heroRotateY()}deg)`,
  );

  onHeroParallax(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    this.heroRotateY.set(x * 14);
    this.heroRotateX.set(-y * 10);
  }

  resetHeroParallax(): void {
    this.heroRotateX.set(0);
    this.heroRotateY.set(0);
  }

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
