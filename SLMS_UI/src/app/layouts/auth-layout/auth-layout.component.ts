import { Component, input } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { environment } from '@env/environment';
import { AppLogoComponent } from '@shared/components/app-logo/app-logo.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, AppLogoComponent],
  template: `
    <div class="grid min-h-screen lg:grid-cols-2">
      <div class="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground p-10">
        <div class="absolute inset-0 blueprint-grid opacity-25"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/20 to-black/40"></div>

        <div class="relative">
          <a routerLink="/" class="inline-flex items-center gap-3">
            <app-logo [size]="40" [theme]="'dark'" [showSubtitle]="true" />
          </a>
        </div>

        

        <div class="animate-fade-up relative space-y-6">
          <p class="text-sm text-primary-foreground/75">Institutional Precision</p>
          <h2 class="text-4xl font-semibold leading-tight tracking-tight">
            Run every branch, every library, every seat — with one calm console.
          </h2>
          <p class="text-sm text-primary-foreground/75 max-w-md">
            Real-time occupancy, attendance, billing and member operations — engineered for institutions that need certainty.
          </p>
          <div class="grid grid-cols-3 gap-3 max-w-md">
            @for (s of stats; track s.k) {
              <div class="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-3">
                <div class="text-primary-foreground/60">{{ s.k }}</div>
                <div class="text-lg font-semibold tabular-nums mt-1">{{ s.v }}</div>
              </div>
            }
          </div>
        </div>

        <p class="relative text-primary-foreground/60">© 2026 {{ appName }} · {{ appVersion }} ({{ appEdition }})</p>
      </div>

      <div class="flex items-center justify-center p-6 md:p-10">
        <div class="animate-fade-up w-full max-w-md space-y-6">
        <!-- Mobile Logo -->
          <div class="flex lg:hidden items-center justify-center gap-3">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
              <i class="pi pi-book text-xl"></i>
            </div>

            <div>
              <h2 class="text-xl font-bold">{{ appName }}</h2>
            </div>
          </div>
          <div class="space-y-2">
            <p class="label-mono">{{eyebrow()}}</p>
            <h1 class="text-2xl font-semibold tracking-tight">{{ title() }}</h1>
            @if (subtitle()) {
              <p class="text-sm text-muted-foreground">{{ subtitle() }}</p>
            }
          </div>

          <div class="rounded-xl border bg-card p-6 shadow-elegant">
            <ng-content />
          </div>

          @if (hasFooter()) {
            <div class="text-center text-sm text-muted-foreground">
              <ng-content select="[footer]" />
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly appName = environment.appName;
  readonly appVersion = environment.appVersion;
  readonly appEdition = environment.appEdition;
  readonly eyebrow = input('Authentication');
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  /** Set to true when projecting a `[footer]` block. */
  readonly hasFooter = input(false);

  readonly stats = [
    { k: 'Members', v: '12,480' },
    { k: 'Seats', v: '3,210' },
    { k: 'Uptime', v: '99.99%' },
  ];
}
