import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
// import { DashboardFiltersBarComponent } from './dashboard-filters-bar.component';

/** Tab strip + filters bar wrapping every dashboard tab. Ported from `_authenticated.dashboard.tsx`. */
@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="space-y-6">
      <div class="overflow-x-auto -mx-1 px-1">
        <nav class="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          @for (t of tabs; track t.to) {
            <a
              [routerLink]="t.to"
              routerLinkActive="bg-background shadow-sm text-foreground"
              [routerLinkActiveOptions]="{ exact: t.exact }"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground"
            >
              {{ t.label }}
            </a>
          }
        </nav>
      </div>

      <!-- <app-dashboard-filters-bar /> -->

      <router-outlet />
    </div>
  `,
})
export class DashboardLayoutComponent {
  readonly tabs = [
    { to: '/dashboard', label: 'Overview', exact: true },
    { to: '/dashboard/analytics', label: 'Analytics', exact: false },
    { to: '/dashboard/occupancy', label: 'Occupancy', exact: false },
    { to: '/dashboard/revenue', label: 'Revenue', exact: false },
    { to: '/dashboard/attendance', label: 'Attendance', exact: false },
    { to: '/dashboard/subscriptions', label: 'Subscriptions', exact: false },
    { to: '/dashboard/notifications', label: 'Notifications', exact: false },
    { to: '/dashboard/activity', label: 'Activity', exact: false },
  ];
}
