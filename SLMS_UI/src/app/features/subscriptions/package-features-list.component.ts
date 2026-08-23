import { Component, input } from '@angular/core';
import { LucideCheck, LucideX } from '@lucide/angular';
import { PackageFeature } from '@core/models/package-subscription.models';

@Component({
  selector: 'app-package-features-list',
  standalone: true,
  imports: [LucideCheck, LucideX],
  template: `
    @if (features().length) {
      <ul class="space-y-1.5" [class.text-sm]="compact()">
        @for (feature of features(); track feature.id) {
          <li class="flex items-start gap-2" [class.text-muted-foreground]="!isIncluded(feature)">
            @if (isIncluded(feature)) {
              <svg lucideCheck class="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5"></svg>
            } @else {
              <svg lucideX class="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 mt-0.5"></svg>
            }
            <span>{{ featureLabel(feature) }}</span>
          </li>
        }
      </ul>
    } @else {
      <p class="text-sm text-muted-foreground">No features listed for this plan.</p>
    }
  `,
})
export class PackageFeaturesListComponent {
  readonly features = input.required<PackageFeature[]>();
  readonly compact = input(false);

  isIncluded(feature: PackageFeature): boolean {
    return feature.featureValue !== '1';
  }

  featureLabel(feature: PackageFeature): string {
    const value = feature.featureValue?.trim();
    if (value && value !== '0' && value !== '1') {
      return `${feature.featureName}: ${value}`;
    }
    return feature.featureName;
  }
}
