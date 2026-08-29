import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  countFeatureCatalogItems,
  countFeatureCatalogModules,
  FEATURE_CATALOG,
  FEATURE_HERO,
  featureModuleImage,
} from '@core/data/feature-catalog';
import { FeatureSection } from '@core/models/FeatureModel';
import { SeoService } from '@core/services/seo.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-feature',
  imports: [AppIconComponent],
  templateUrl: './feature.html',
  styleUrl: './feature.css',
})
export class Feature implements OnInit {
  private readonly seo = inject(SeoService);

  protected readonly featureSections = signal(FEATURE_CATALOG);
  protected readonly hero = FEATURE_HERO;
  protected readonly moduleCount = computed(() => countFeatureCatalogModules(this.featureSections()));
  protected readonly featureCount = computed(() => countFeatureCatalogItems(this.featureSections()));

  ngOnInit(): void {
    this.initSeo();
  }

  private initSeo(): void {
    const modules = this.featureSections();
    this.seo.updateSeo({
      title: 'Platform Features & Core Modules | Lexora',
      description: `Explore Lexora's ${this.moduleCount()} core modules with ${this.featureCount()}+ enterprise capabilities — multi-branch hierarchy, visual seat shifts, QR attendance kiosks, digital catalog circulation, and member self-service.`,
      path: '/features',
      keywords: [
        'library software features',
        'library seat layout planner',
        'library attendance kiosk',
        'book circulation system',
        'library fine management',
        'multi branch library management',
        'digital library portal',
        'lexora features',
      ],
      image: 'assets/features/platform-modules-hero.png',
      imageAlt: 'Lexora Platform Features and Enterprise Capabilities',
      type: 'website',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': 'Lexora Platform Features & Modules',
        'url': 'https://uniappx.in/features',
        'description':
          'Comprehensive breakdown of Lexora smart library modules including seat layouts, QR scanner, book cataloging, subscriptions, and security.',
        'mainEntity': {
          '@type': 'ItemList',
          'itemListElement': modules.map((mod, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': mod.title,
            'description': mod.features.map((f) => f.title).join(', '),
          })),
        },
      },
    });
  }

  protected moduleImage(section: FeatureSection): string {
    return section.image ?? featureModuleImage(section.id);
  }
}
