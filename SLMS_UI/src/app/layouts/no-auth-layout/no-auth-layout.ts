import { Component } from '@angular/core';
import { NonAuthHeader } from "./non-auth-header/non-auth-header";
import { NonAuthFooter } from "./non-auth-footer/non-auth-footer";
import { RouterOutlet } from "@angular/router";
import { PolicyConsentBannerComponent } from '@shared/components/policy-consent-banner/policy-consent-banner.component';

@Component({
  selector: 'app-no-auth-layout',
  imports: [NonAuthHeader, NonAuthFooter, RouterOutlet, PolicyConsentBannerComponent],
  templateUrl: './no-auth-layout.html',
  styleUrl: './no-auth-layout.css',
})
export class NoAuthLayout {}
