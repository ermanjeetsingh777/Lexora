import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideBuilding,
  LucideCheck,
  LucideCheckCircle,
  LucideHeart,
  LucideLoader2,
  LucideMail,
  LucideMessageSquare,
  LucidePlus,
  LucideQuote,
  LucideSend,
  LucideSparkles,
  LucideStar,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { LandingFeature } from '@core/models/LandingFeature';
import { LexoraTeamMember } from '@core/models/lexora-team-member.model';
import { PackageCatalogItem } from '@core/models/package-subscription.models';
import { PublicCustomerReviewItem } from '@core/models/customer-review.model';
import { toLandingFeatures } from '@core/data/feature-catalog';
import { PackageService } from '@core/services/package.service';
import { CustomerReviewService } from '@core/services/customer-review.service';
import { ToastService } from '@core/services/toast.service';
import { SeoService } from '@core/services/seo.service';
import { StorageService } from '@core/services/storage.service';
import { QrScannerModalService } from '@core/services/qr-scanner-modal.service';
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
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AppIconComponent,
    LucideCheck,
    LucideCheckCircle,
    LucideHeart,
    LucideLoader2,
    LucideMail,
    LucideMessageSquare,
    LucidePlus,
    LucideQuote,
    LucideSend,
    LucideSparkles,
    LucideStar,
    LucideUser,
    LucideBuilding,
    LucideX,
  ],
  templateUrl: './landing-home-page.html',
  styleUrl: './landing-home-page.css',
})
export class LandingHomePage implements OnInit {
  protected readonly storageService = inject(StorageService);
  private readonly packageService = inject(PackageService);
  private readonly customerReviewService = inject(CustomerReviewService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly qrScanner = inject(QrScannerModalService);

  protected readonly packages = signal<PackageCatalogItem[]>([]);
  protected readonly packagesLoading = signal(true);
  protected readonly packagesError = signal<string | null>(null);

  // Customer Reviews State
  protected readonly reviews = signal<PublicCustomerReviewItem[]>([]);
  protected readonly reviewsLoading = signal(true);
  protected readonly reviewModalOpen = signal(false);
  protected readonly submittingReview = signal(false);
  protected readonly reviewSubmittedSuccess = signal(false);

  // Review Form Fields
  protected readonly formFullName = signal('');
  protected readonly formEmail = signal('');
  protected readonly formOrganization = signal('');
  protected readonly formRole = signal('');
  protected readonly formRating = signal(5);
  protected readonly hoverRating = signal(0);
  protected readonly formTitle = signal('');
  protected readonly formComment = signal('');
  protected readonly formSuggestion = signal('');

  protected readonly averageRating = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return 4.9;
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / list.length) * 10) / 10;
  });

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

  openCameraScanner(): void {
    this.qrScanner.open();
  }

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
    this.initSeo();
    this.loadPackages();
    this.loadReviews();
  }

  private initSeo(): void {
    this.seo.updateSeo({
      title: 'Lexora - Smart Library & Seat Management Platform',
      description:
        'Run multi-branch libraries, real-time seat layouts, automated QR attendance, book catalog circulation, and member subscriptions with institutional precision.',
      path: '/',
      keywords: [
        'smart library management system',
        'library seat management',
        'real-time library occupancy',
        'library attendance qr code',
        'multi branch library software',
        'library management software india',
        'student reading room management',
        'lexora smart library',
      ],
      image: 'assets/landing/landing-hero-3d.png',
      imageAlt: 'Lexora Smart Library and Multi-Branch Management Platform',
      type: 'website',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://uniappx.in/#organization',
            'name': 'Lexora',
            'url': 'https://uniappx.in',
            'logo': 'https://uniappx.in/icons/icon-512x512.png',
            'description': 'Multi-tenant Smart Library & Seat Management Platform',
            'email': 'support@lexora.app',
          },
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://uniappx.in/#software',
            'name': 'Lexora Smart Library Platform',
            'applicationCategory': 'BusinessApplication',
            'operatingSystem': 'Web, Android, iOS, Windows, macOS',
            'url': 'https://uniappx.in',
            'description':
              'All-in-one smart library management SaaS with seat layouts, QR attendance, book circulation, and automated billing.',
            'offers': {
              '@type': 'AggregateOffer',
              'priceCurrency': 'INR',
              'lowPrice': '0',
              'offerCount': '3',
            },
            'featureList': [
              'Interactive Seat Matrix & Shift Allocation',
              'Instant QR Check-in / Check-out Attendance',
              'Multi-Branch & Multi-Institution Tenant Isolation',
              'Book Cataloging & Physical Circulation Management',
              'Self-Service Member Portal & Digital Receipts',
              'Real-Time Occupancy Analytics & Revenue Reports',
            ],
          },
          {
            '@type': 'WebSite',
            '@id': 'https://uniappx.in/#website',
            'url': 'https://uniappx.in',
            'name': 'Lexora',
            'publisher': { '@id': 'https://uniappx.in/#organization' },
          },
        ],
      },
    });
  }

  loadPackages(): void {
    this.packagesLoading.set(true);
    this.packagesError.set(null);

    this.packageService.getActivePackages().subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.packagesLoading.set(false);
      },
      error: () => {
        this.packagesError.set('Unable to load packages right now. Please try again later.');
        this.packagesLoading.set(false);
      },
    });
  }

  loadReviews(): void {
    this.reviewsLoading.set(true);
    this.customerReviewService.getPublicApprovedReviews().subscribe({
      next: (data) => {
        this.reviews.set(data);
        this.reviewsLoading.set(false);
      },
      error: () => {
        this.reviewsLoading.set(false);
      },
    });
  }

  openReviewModal(): void {
    this.formFullName.set('');
    this.formEmail.set('');
    this.formOrganization.set('');
    this.formRole.set('');
    this.formRating.set(5);
    this.hoverRating.set(0);
    this.formTitle.set('');
    this.formComment.set('');
    this.formSuggestion.set('');
    this.reviewSubmittedSuccess.set(false);
    this.reviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    this.reviewModalOpen.set(false);
  }

  setRating(val: number): void {
    this.formRating.set(val);
  }

  setHoverRating(val: number): void {
    this.hoverRating.set(val);
  }

  submitCustomerReview(): void {
    const fullName = this.formFullName().trim();
    const email = this.formEmail().trim();
    const comment = this.formComment().trim();

    if (!fullName || fullName.length < 2) {
      this.toast.error('Please enter your full name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      this.toast.error('Please enter a valid email address.');
      return;
    }

    if (!comment || comment.length < 5) {
      this.toast.error('Please write your review feedback (at least 5 characters).');
      return;
    }

    this.submittingReview.set(true);
    this.customerReviewService
      .submitReview({
        fullName,
        email,
        organizationName: this.formOrganization().trim() || undefined,
        role: this.formRole().trim() || undefined,
        rating: this.formRating(),
        title: this.formTitle().trim() || undefined,
        comment,
        suggestion: this.formSuggestion().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submittingReview.set(false);
          this.reviewSubmittedSuccess.set(true);
          this.toast.success('Thank you! Your review has been submitted for review.');
        },
        error: (err) => {
          this.submittingReview.set(false);
          this.toast.error(err?.error?.message || 'Failed to submit review. Please try again.');
        },
      });
  }

  getStarArray(rating: number): number[] {
    const clamped = Math.max(1, Math.min(5, Math.round(rating)));
    return Array.from({ length: clamped }, (_, i) => i + 1);
  }
}
