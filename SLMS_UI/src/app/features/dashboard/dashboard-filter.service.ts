import { computed, Injectable, signal } from '@angular/core';
import { DashboardQuery } from '@core/models/dashboard.models';

export type DashboardRange = 7 | 14 | 30 | 90;
export type DashboardDensity = 'detailed' | 'compact';

export const DASHBOARD_RANGE_OPTIONS: DashboardRange[] = [7, 14, 30, 90];

const STORAGE_KEY = 'slms.dashboard.filters';

@Injectable({ providedIn: 'root' })
export class DashboardFilterService {
  readonly range = signal<DashboardRange>(30);
  readonly density = signal<DashboardDensity>('detailed');

  readonly query = computed<DashboardQuery>(() => ({ days: this.range() }));

  constructor() {
    this.restore();
  }

  setRange(value: DashboardRange): void {
    this.range.set(value);
    this.persist();
  }

  setDensity(value: DashboardDensity): void {
    this.density.set(value);
    this.persist();
  }

  reset(): void {
    this.range.set(30);
    this.density.set('detailed');
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ range: this.range(), density: this.density() }),
      );
    } catch {
      /* ignore storage errors */
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { range?: DashboardRange; density?: DashboardDensity };
      if (parsed.range && DASHBOARD_RANGE_OPTIONS.includes(parsed.range)) {
        this.range.set(parsed.range);
      }
      if (parsed.density === 'detailed' || parsed.density === 'compact') {
        this.density.set(parsed.density);
      }
    } catch {
      /* ignore storage errors */
    }
  }
}
