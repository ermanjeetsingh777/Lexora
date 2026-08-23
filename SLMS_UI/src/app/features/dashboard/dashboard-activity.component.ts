import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX } from '@lucide/angular';
import { DashboardActivity, DashboardActivityItem } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { GlassCardComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DashboardHeaderService } from './dashboard-header.service';
import { DashboardActivityFeedComponent } from './dashboard-activity-feed.component';

@Component({
  selector: 'app-dashboard-activity',
  standalone: true,
  imports: [FormsModule, SectionHeaderComponent, GlassCardComponent, LucideSearch, LucideX, DashboardActivityFeedComponent],
  templateUrl: './dashboard-activity.component.html',
  styleUrl: './dashboard-activity.component.css',
})
export class DashboardActivityComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly header = inject(DashboardHeaderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardActivity | null>(null);
  readonly search = signal('');
  readonly activityDays = signal(90);

  readonly dayOptions = [
    { days: 7, label: '7 days' },
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' },
    { days: 180, label: '6 months' },
  ];

  readonly filteredItems = computed(() => {
    const payload = this.data();
    if (!payload) return [] as DashboardActivityItem[];
    const q = this.search().trim().toLowerCase();
    if (!q) return payload.items;
    return payload.items.filter((a) =>
      `${a.actor} ${a.action} ${a.target} ${a.detail ?? ''} ${a.activityType}`.toLowerCase().includes(q),
    );
  });

  constructor() {
    effect(() => {
      this.activityDays();
      this.load();
    });
  }

  setActivityDays(days: number): void {
    this.activityDays.set(days);
  }

  dayClass(days: number): string {
    const active = this.activityDays() === days;
    return `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'border text-muted-foreground hover:text-foreground'
    }`;
  }

  private load(): void {
    this.loading.set(true);
    this.dashboard.getActivity({
      activityDays: this.activityDays(),
      limit: 120,
    }).subscribe({
      next: (activity) => {
        this.data.set(activity);
        this.header.update({
          description: `${activity.scopeLabel} · last ${activity.activityDays} days · ${activity.totalCount} events`,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Could not load activity');
      },
    });
  }
}
