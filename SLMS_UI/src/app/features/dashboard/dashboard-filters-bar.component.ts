import { Component, inject } from '@angular/core';
import { LucideCalendarRange, LucideLayoutGrid, LucideRotateCcw, LucideRows3 } from '@lucide/angular';
import {
  DASHBOARD_RANGE_OPTIONS,
  DashboardDensity,
  DashboardFilterService,
  DashboardRange,
} from './dashboard-filter.service';

@Component({
  selector: 'app-dashboard-filters-bar',
  standalone: true,
  imports: [LucideCalendarRange, LucideLayoutGrid, LucideRows3, LucideRotateCcw],
  template: `
    <div class="flex flex-wrap items-center gap-2 justify-between rounded-lg border bg-muted/30 px-2.5 py-1.5">
      <div class="flex items-center gap-2">
        <span class="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
          <svg lucideCalendarRange class="h-3.5 w-3.5"></svg> Range
        </span>
        <div class="inline-flex rounded-md border bg-background p-0.5">
          @for (r of ranges; track r) {
            <button
              type="button"
              (click)="filters.setRange(r)"
              [class]="rangeClass(r)"
            >
              {{ r }}d
            </button>
          }
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-md border bg-background p-0.5" role="group" aria-label="View density">
          @for (d of densities; track d.key) {
            <button
              type="button"
              (click)="filters.setDensity(d.key)"
              [title]="d.label"
              [class]="densityClass(d.key)"
            >
              @if (d.key === 'detailed') {
                <svg lucideLayoutGrid class="h-3.5 w-3.5"></svg>
              } @else {
                <svg lucideRows3 class="h-3.5 w-3.5"></svg>
              }
              <span class="hidden md:inline">{{ d.label }}</span>
            </button>
          }
        </div>
        <button
          type="button"
          (click)="filters.reset()"
          class="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <svg lucideRotateCcw class="h-3.5 w-3.5 mr-1"></svg> Reset
        </button>
      </div>
    </div>
  `,
})
export class DashboardFiltersBarComponent {
  readonly filters = inject(DashboardFilterService);
  readonly ranges = DASHBOARD_RANGE_OPTIONS;
  readonly densities: { key: DashboardDensity; label: string }[] = [
    { key: 'detailed', label: 'Detailed' },
    { key: 'compact', label: 'Compact' },
  ];

  rangeClass(r: DashboardRange): string {
    const active = this.filters.range() === r;
    return `px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
    }`;
  }

  densityClass(key: DashboardDensity): string {
    const active = this.filters.density() === key;
    return `inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm transition-colors ${
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
    }`;
  }
}
