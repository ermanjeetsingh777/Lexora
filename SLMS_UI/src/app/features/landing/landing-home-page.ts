import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideLoader2, LucideX } from '@lucide/angular';
import { LandingFeature } from '@core/models/LandingFeature';
import { PackageCatalogItem } from '@core/models/package-subscription.models';
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

  protected features = signal<LandingFeature[]>([
    {
      icon: 'user-round',
      title: 'Smart Seat Allocation',
      description:
        'Optimize occupancy with intelligent rules and real-time availability.',
      iconBgClass: 'bg-[var(--primary)]/10',
      iconTextClass: 'text-[var(--primary)]',
    },
    {
      icon: 'calendar-check',
      title: 'Real-Time Attendance',
      description:
        'Track check-in/out instantly across every branch.',
      iconBgClass: 'bg-indigo-500/10',
      iconTextClass: 'text-indigo-500',
    },
    {
      icon: 'building-2',
      title: 'Multi-Branch Management',
      description:
        'Manage institutions, branches, and libraries with tenant isolation.',
      iconBgClass: 'bg-emerald-500/10',
      iconTextClass: 'text-emerald-500',
    },
    {
      icon: 'credit-card',
      title: 'Subscription Billing',
      description:
        'Plans, invoices, and billing cycles—automated and accurate.',
      iconBgClass: 'bg-cyan-500/10',
      iconTextClass: 'text-cyan-500',
    },
    {
      icon: 'qr-code',
      title: 'QR Check-in',
      description:
        'Fast scanning for staff and students, with audit trails.',
      iconBgClass: 'bg-violet-500/10',
      iconTextClass: 'text-violet-500',
    },
    {
      icon: 'bar-chart-3',
      title: 'Revenue Analytics',
      description:
        'Understand performance with gradient dashboards and KPIs.',
      iconBgClass: 'bg-amber-500/10',
      iconTextClass: 'text-amber-500',
    },
    {
      icon: 'shield',
      title: 'Role-Based Access',
      description:
        'Secure collaboration with RBAC and scoped permissions.',
      iconBgClass: 'bg-rose-500/10',
      iconTextClass: 'text-rose-500',
    },
    {
      icon: 'bell',
      title: 'Notification System',
      description:
        'Alerts for attendance anomalies, billing events, and updates.',
      iconBgClass: 'bg-sky-500/10',
      iconTextClass: 'text-sky-500',
    },
    {
      icon: 'box',
      title: 'Inventory Management',
      description:
        'Track resources and maintain availability across libraries.',
      iconBgClass: 'bg-lime-500/10',
      iconTextClass: 'text-lime-500',
    },
    {
      icon: 'file-clock',
      title: 'Audit Logs',
      description:
        'Immutable activity trails for compliance and investigations.',
      iconBgClass: 'bg-fuchsia-500/10',
      iconTextClass: 'text-fuchsia-500',
    },
    {
      icon: 'book-open',
      title: 'Book Management',
      description:
        'Track books, availability, and renew across all branches.',
      iconBgClass: 'bg-cyan-500/10',
      iconTextClass: 'text-cyan-500',
    },
    {
      icon: 'book-open',
      title: 'Fee Receipt Generation',
      description:
        'Generate professional fee receipts instantly and deliver them seamlessly via WhatsApp or email notifications.',
      iconBgClass: 'bg-orange-500/10',
      iconTextClass: 'text-orange-500',
    },
  ]);

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
