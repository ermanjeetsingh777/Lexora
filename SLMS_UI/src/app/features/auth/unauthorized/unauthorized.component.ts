import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideShieldAlert } from '@lucide/angular';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink, LucideShieldAlert],
  template: `
    <div class="min-h-screen grid place-items-center bg-background blueprint-grid px-4">
      <div class="max-w-md rounded-xl border bg-card p-10 text-center shadow-elegant">
        <div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border bg-destructive/10 text-destructive">
          <svg lucideShieldAlert class="h-6 w-6"></svg>
        </div>
        <p class="label-mono">Error 403</p>
        <h1 class="text-2xl font-semibold tracking-tight mt-1">Access denied</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Your role doesn't have permission to access this resource. Contact your administrator.
        </p>
        <a
          routerLink="/dashboard"
          class="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  `,
})
export class UnauthorizedComponent {}
