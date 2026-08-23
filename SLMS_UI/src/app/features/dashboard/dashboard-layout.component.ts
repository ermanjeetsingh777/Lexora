import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DashboardHeaderService } from './dashboard-header.service';

interface DashboardTab {
  to: string;
  label: string;
  exact: boolean;
  eyebrow: string;
  title: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PageHeaderComponent],
  template: `
    <div class="space-y-4">
      <app-page-header
        [eyebrow]="pageHeader().eyebrow"
        [title]="pageHeader().title"
        [description]="pageHeader().description">
        @if (pageHeader().showScopeActions) {
          <div actions class="flex flex-wrap items-center gap-2 text-xs">
            @if (pageHeader().isSuperAdmin) {
              <span class="inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-2 py-1 font-medium text-primary">
                SuperAdmin · all libraries & members
              </span>
            } @else {
              <span class="inline-flex items-center rounded-md border px-2 py-1 font-medium">
                Your libraries only
              </span>
            }
            @if (pageHeader().totalMembers != null && pageHeader().totalLibraries != null) {
              <span class="text-muted-foreground">
                {{ pageHeader().totalMembers }} members · {{ pageHeader().totalLibraries }} libraries
              </span>
            }
          </div>
        }
      </app-page-header>

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

      <router-outlet />
    </div>
  `,
})
export class DashboardLayoutComponent {
  private readonly router = inject(Router);
  readonly header = inject(DashboardHeaderService);

  readonly tabs: DashboardTab[] = [
    { to: '/dashboard', label: 'Overview', exact: true, eyebrow: 'Workspace · Live', title: 'Operational overview' },
    // { to: '/dashboard/analytics', label: 'Analytics', exact: false, eyebrow: 'Insights', title: 'Library analytics' },
    // { to: '/dashboard/occupancy', label: 'Occupancy', exact: false, eyebrow: 'Occupancy', title: 'Seat utilization' },
    // { to: '/dashboard/revenue', label: 'Revenue', exact: false, eyebrow: 'Finance', title: 'Revenue' },
    // { to: '/dashboard/attendance', label: 'Attendance', exact: false, eyebrow: 'Attendance', title: 'Attendance overview' },
    // { to: '/dashboard/subscriptions', label: 'Subscriptions', exact: false, eyebrow: 'Subscriptions', title: 'Membership revenue trajectory' },
    // { to: '/dashboard/notifications', label: 'Notifications', exact: false, eyebrow: 'Inbox', title: 'Notifications' },
    { to: '/dashboard/activity', label: 'Activity', exact: false, eyebrow: 'Activity', title: 'Live activity feed' },
  ];

  private readonly navigation = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.resolveActiveTab()),
    ),
    { initialValue: this.resolveActiveTab() },
  );

  readonly pageHeader = computed(() => {
    const tab = this.navigation();
    const patch = this.header.state();
    return {
      eyebrow: tab?.eyebrow ?? 'Dashboard',
      title: patch.title ?? tab?.title ?? 'Dashboard',
      description: patch.description,
      isSuperAdmin: patch.isSuperAdmin,
      totalMembers: patch.totalMembers,
      totalLibraries: patch.totalLibraries,
      showScopeActions: patch.totalMembers != null || patch.isSuperAdmin != null,
    };
  });

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.header.reset();
    });
  }

  private resolveActiveTab(): DashboardTab | undefined {
    const url = this.router.url.split('?')[0];
    return this.tabs.find((tab) => (tab.exact ? url === tab.to : url.startsWith(tab.to)));
  }
}
