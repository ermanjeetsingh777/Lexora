import { Component, inject } from '@angular/core';
import { LucideCalendarRange } from '@lucide/angular';
import { DASHBOARD_PERIOD_OPTIONS } from '@core/models/dashboard.models';
import { DashboardFilterService } from './dashboard-filter.service';

@Component({
  selector: 'app-dashboard-filters-bar',
  standalone: true,
  imports: [LucideCalendarRange],
  template: `
    <div class="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5">
      <span class="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
        <svg lucideCalendarRange class="h-3.5 w-3.5"></svg> Period
      </span>
      <div class="inline-flex flex-wrap rounded-md border bg-background p-0.5 gap-0.5">
        @for (p of periods; track p.key) {
          <button type="button" (click)="filters.setPeriod(p.key)" [class]="periodClass(p.key)">
            {{ p.label }}
          </button>
        }
      </div>
    </div>
  `,
})
export class DashboardFiltersBarComponent {
  readonly filters = inject(DashboardFilterService);
  readonly periods = DASHBOARD_PERIOD_OPTIONS;

  periodClass(key: string): string {
    const active = this.filters.period() === key;
    return `px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
    }`;
  }
}
