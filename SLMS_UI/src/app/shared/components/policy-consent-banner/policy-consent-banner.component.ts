import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { PolicyConsentService } from '@core/services/policy-consent.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-policy-consent-banner',
  standalone: true,
  imports: [RouterLink, AppIconComponent],
  template: `
    @if (!consent.accepted()) {
      <div
        class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-lg z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-xl p-4 shadow-2xl ring-1 ring-black/5"
        role="dialog"
        aria-label="Privacy and policy consent"
      >
        <div class="flex items-start gap-3">
          <div class="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <app-icon name="shield-check" [size]="20" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-foreground tracking-tight">Privacy & Policy Notice</h4>
            <p class="text-xs text-muted-foreground mt-1 leading-relaxed">
              We use essential cookies and process data as described in our policies. By continuing, you agree to our
              terms and privacy practices.
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <a
                routerLink="/privacy-policy"
                class="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <app-icon name="file-text" [size]="12" />
                <span>Read Privacy Policy</span>
              </a>
              <a
                routerLink="/cookie-policy"
                class="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <app-icon name="cookie" [size]="12" />
                <span>Cookie Policy</span>
              </a>
              <a
                routerLink="/terms"
                class="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <app-icon name="book-open" [size]="12" />
                <span>Terms of Service</span>
              </a>
            </div>
          </div>
        </div>

        <div class="mt-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            (click)="acceptPolicies()"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all active:scale-95"
          >
            <app-icon name="check" [size]="14" />
            <span>Accept & Continue</span>
          </button>
        </div>
      </div>
    }
  `,
})
export class PolicyConsentBannerComponent {
  protected readonly consent = inject(PolicyConsentService);
  private readonly toast = inject(ToastService);

  acceptPolicies(): void {
    this.consent.accept();
    this.toast.success('Thank you! You have accepted our privacy and policy terms.');
  }
}
