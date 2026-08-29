import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAME, POLICY_CATALOG } from '@core/data/policy-catalog';
import { SeoService } from '@core/services/seo.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-policy-hub',
  imports: [RouterLink, AppIconComponent],
  templateUrl: './policy-hub.html',
  styleUrl: './policy.css',
})
export class PolicyHub implements OnInit {
  private readonly seo = inject(SeoService);

  protected readonly appName = APP_NAME;
  protected readonly policies = POLICY_CATALOG;

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Policies, Trust & Compliance Hub | Lexora',
      description:
        'Explore Lexora institutional compliance documentation, GDPR privacy commitments, cookie management, data processing agreements, and cloud security standards.',
      path: '/policies',
      keywords: [
        'lexora policies',
        'library privacy compliance',
        'data processing agreement library',
        'security standards library software',
        'cookie policy',
      ],
      type: 'website',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        'name': 'Lexora Policies & Compliance Hub',
        'url': 'https://uniappx.in/policies',
        'description':
          'Official compliance and governance documentation for Lexora smart library platform.',
        'hasPart': this.policies.map((p) => ({
          '@type': 'DigitalDocument',
          'name': p.title,
          'url': `https://uniappx.in${p.route}`,
          'description': p.description,
        })),
      },
    });
  }
}
