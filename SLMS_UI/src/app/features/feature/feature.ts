import { Component, computed, signal } from '@angular/core';
import {
  countFeatureCatalogItems,
  countFeatureCatalogModules,
  FEATURE_CATALOG,
  FEATURE_HERO,
  featureModuleImage,
} from '@core/data/feature-catalog';
import { FeatureSection } from '@core/models/FeatureModel';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-feature',
  imports: [AppIconComponent],
  templateUrl: './feature.html',
  styleUrl: './feature.css',
})
export class Feature {
  protected readonly featureSections = signal(FEATURE_CATALOG);
  protected readonly hero = FEATURE_HERO;
  protected readonly moduleCount = computed(() => countFeatureCatalogModules(this.featureSections()));
  protected readonly featureCount = computed(() => countFeatureCatalogItems(this.featureSections()));

  protected moduleImage(section: FeatureSection): string {
    return section.image ?? featureModuleImage(section.id);
  }
}
