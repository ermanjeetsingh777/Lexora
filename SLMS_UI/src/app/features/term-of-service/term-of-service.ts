import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAME } from '@core/data/policy-catalog';
import { RELATED_POLICY_LINKS, TERMS_OF_SERVICE } from '@core/data/terms-catalog';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-term-of-service',
  imports: [AppIconComponent, RouterLink],
  templateUrl: './term-of-service.html',
  styleUrl: './term-of-service.css',
})
export class TermOfService {
  protected readonly appName = APP_NAME;
  protected readonly terms = TERMS_OF_SERVICE;
  protected readonly relatedPolicies = RELATED_POLICY_LINKS;
}
