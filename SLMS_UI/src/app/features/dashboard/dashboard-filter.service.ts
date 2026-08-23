import { computed, Injectable, signal } from '@angular/core';
import { DashboardPeriod, DashboardQuery } from '@core/models/dashboard.models';

const STORAGE_KEY = 'slms.dashboard.filters';

@Injectable({ providedIn: 'root' })
export class DashboardFilterService {
  readonly period = signal<DashboardPeriod>('weekly');

  readonly query = computed<DashboardQuery>(() => ({ period: this.period() }));

  constructor() {
    this.restore();
  }

  setPeriod(value: DashboardPeriod): void {
    this.period.set(value);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ period: this.period() }));
    } catch {
      /* ignore */
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { period?: DashboardPeriod; range?: number };
      const validPeriods: DashboardPeriod[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'all'];
      if (parsed.period && validPeriods.includes(parsed.period)) {
        this.period.set(parsed.period);
      }
    } catch {
      /* ignore */
    }
  }
}
