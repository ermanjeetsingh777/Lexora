import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { APP_NAME, getOtherPolicies, getPolicyBySlug, PolicyDocument } from '@core/data/policy-catalog';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-policy',
  imports: [RouterLink, AppIconComponent],
  templateUrl: './policy.html',
  styleUrl: './policy.css',
})
export class Policy {
  private readonly route = inject(ActivatedRoute);

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

  protected trackPolicy(_index: number, policy: PolicyDocument): string {
    return policy.id;
  }
}
