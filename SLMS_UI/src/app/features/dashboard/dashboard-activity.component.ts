import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideActivity, LucideSearch } from '@lucide/angular';
import { DashboardOverview } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DashboardFilterService } from './dashboard-filter.service';

@Component({
  selector: 'app-dashboard-activity',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SectionHeaderComponent, GlassCardComponent, LucideActivity, LucideSearch],
  templateUrl: './dashboard-activity.component.html',
})
export class DashboardActivityComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardOverview | null>(null);
  readonly search = signal('');

  constructor() {
    effect(() => { this.filters.query(); this.load(); });
  }

  filteredActivity(overview: DashboardOverview) {
    const q = this.search().trim().toLowerCase();
    if (!q) return overview.recentActivity;
    return overview.recentActivity.filter((a) =>
      `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q),
    );
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  private load(): void {
    this.loading.set(true);
    this.dashboard.getOverview(this.filters.query()).subscribe({
      next: (overview) => { this.data.set(overview); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(err?.error?.message ?? 'Could not load activity'); },
    });
  }
}
