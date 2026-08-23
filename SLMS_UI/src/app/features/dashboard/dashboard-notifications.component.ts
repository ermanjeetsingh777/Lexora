import { Component, effect, inject, signal } from '@angular/core';
import { LucideBell } from '@lucide/angular';
import { DashboardOverview } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { DashboardFilterService } from './dashboard-filter.service';

@Component({
  selector: 'app-dashboard-notifications',
  standalone: true,
  imports: [PageHeaderComponent, SectionHeaderComponent, GlassCardComponent, StatusBadgeComponent, LucideBell],
  templateUrl: './dashboard-notifications.component.html',
})
export class DashboardNotificationsComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardOverview | null>(null);

  constructor() {
    effect(() => { this.filters.query(); this.load(); });
  }

  private load(): void {
    this.loading.set(true);
    this.dashboard.getOverview(this.filters.query()).subscribe({
      next: (overview) => { this.data.set(overview); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(err?.error?.message ?? 'Could not load notifications'); },
    });
  }
}
