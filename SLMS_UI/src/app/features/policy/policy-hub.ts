import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAME, POLICY_CATALOG } from '@core/data/policy-catalog';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-policy-hub',
  imports: [RouterLink, AppIconComponent],
  templateUrl: './policy-hub.html',
  styleUrl: './policy.css',
})
export class PolicyHub {
  protected readonly appName = APP_NAME;
  protected readonly policies = POLICY_CATALOG;
}
