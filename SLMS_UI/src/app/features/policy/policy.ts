import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { APP_NAME, getOtherPolicies, getPolicyBySlug, PolicyDocument } from '@core/data/policy-catalog';
import { SeoService } from '@core/services/seo.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-policy',
  imports: [RouterLink, AppIconComponent],
  templateUrl: './policy.html',
  styleUrl: './policy.css',
})
export class Policy {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  protected readonly appName = APP_NAME;
  protected readonly policyDoc = toSignal(
    this.route.data.pipe(
      map((data) => {
        const slug = (data['policySlug'] as string | undefined) ?? 'privacy';
        return getPolicyBySlug(slug) ?? getPolicyBySlug('privacy')!;
      }),
    ),
    { initialValue: getPolicyBySlug('privacy')! },
  );
  protected readonly relatedPolicies = toSignal(
    this.route.data.pipe(
      map((data) => {
        const slug = (data['policySlug'] as string | undefined) ?? 'privacy';
        return getOtherPolicies(slug);
      }),
    ),
    { initialValue: getOtherPolicies('privacy') },
  );

  constructor() {
    effect(() => {
      const doc = this.policyDoc();
      if (!doc) return;

      this.seo.updateSeo({
        title: `${doc.title} | ${this.appName}`,
        description: doc.description,
        path: doc.route,
        keywords: [
          ...doc.tags,
          'lexora policy',
          'library data privacy',
          'smart library compliance',
          'gdpr tenant isolation',
        ],
        type: 'article',
        modifiedTime: doc.updatedAt,
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'DigitalDocument',
          'name': `${doc.title} - ${this.appName}`,
          'url': `https://uniappx.in${doc.route}`,
          'description': doc.description,
          'publisher': {
            '@type': 'Organization',
            'name': this.appName,
            'url': 'https://uniappx.in',
          },
          'dateModified': doc.updatedAt,
        },
      });
    });
  }

  protected trackPolicy(_index: number, policy: PolicyDocument): string {
    return policy.id;
  }
}
