import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAME } from '@core/data/policy-catalog';
import { RELATED_POLICY_LINKS, TERMS_OF_SERVICE } from '@core/data/terms-catalog';
import { SeoService } from '@core/services/seo.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-term-of-service',
  imports: [AppIconComponent, RouterLink],
  templateUrl: './term-of-service.html',
  styleUrl: './term-of-service.css',
})
export class TermOfService implements OnInit {
  private readonly seo = inject(SeoService);

  protected readonly appName = APP_NAME;
  protected readonly terms = TERMS_OF_SERVICE;
  protected readonly relatedPolicies = RELATED_POLICY_LINKS;

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Terms of Service | Lexora',
      description:
        'Read the Lexora Terms of Service — institutional agreements, subscription governance, member data responsibilities, service availability, and account security terms.',
      path: '/terms',
      keywords: [
        'lexora terms of service',
        'library software agreement',
        'saas library terms',
        'institutional terms',
      ],
      type: 'article',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'DigitalDocument',
        'name': 'Lexora Terms of Service',
        'url': 'https://uniappx.in/terms',
        'description':
          'Official Terms of Service governing access to and use of the Lexora smart library management platform.',
        'publisher': {
          '@type': 'Organization',
          'name': this.appName,
          'url': 'https://uniappx.in',
        },
      },
    });
  }
}
