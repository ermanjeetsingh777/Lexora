import { Component, computed, input } from '@angular/core';

export type KpiCardTone = 'default' | 'success' | 'warning' | 'destructive' | 'premium';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
  template: `
    <div class="absolute inset-0 blueprint-grid-sm opacity-30 pointer-events-none"></div>
    <div class="relative flex items-start justify-between gap-3">
      <div class="space-y-2">
        <p class="label-mono" [class]="labelClass()">{{ label() }}</p>
        <p class="text-2xl font-semibold tracking-tight tabular-nums" [class]="valueClass()">{{ value() }}</p>
        @if (delta() !== undefined || hint()) {
          <div class="flex items-center gap-2 text-xs">
            @if (delta() !== undefined) {
              <span class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono" [class]="deltaClasses()">
                {{ positive() ? '▲' : '▼' }} {{ Math.abs(delta()!).toFixed(1) }}%
              </span>
            }
            @if (hint()) {
              <span class="text-muted-foreground">{{ hint() }}</span>
            }
          </div>
        }
      </div>
      <div class="rounded-lg border p-2" [class]="iconWellClass()">
        <ng-content select="[icon]" />
      </div>
    </div>
  `,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly delta = input<number>();
  readonly hint = input<string>();
  /** Visual tone for status-style KPI cards (members list, etc.). */
  readonly tone = input<KpiCardTone>('default');

  protected readonly Math = Math;

  readonly positive = computed(() => (this.delta() ?? 0) >= 0);
  readonly deltaClasses = computed(() =>
    this.positive() ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
  );

  readonly hostClass = computed(() => {
    const base =
      'relative overflow-hidden rounded-xl border p-5 shadow-elegant hover-lift block animate-fade-up';
    switch (this.tone()) {
      case 'success':
        return `${base} border-success/35 bg-success/10`;
      case 'warning':
        return `${base} border-warning/40 bg-warning/10`;
      case 'destructive':
        return `${base} border-destructive/35 bg-destructive/10`;
      case 'premium':
        return `${base} border-amber-400/45 bg-amber-50 dark:bg-amber-950/30`;
      default:
        return `${base} bg-card`;
    }
  });

  readonly labelClass = computed(() => {
    switch (this.tone()) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning-foreground';
      case 'destructive':
        return 'text-destructive';
      case 'premium':
        return 'text-amber-800 dark:text-amber-200';
      default:
        return '';
    }
  });

  readonly valueClass = computed(() => {
    switch (this.tone()) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning-foreground';
      case 'destructive':
        return 'text-destructive';
      case 'premium':
        return 'text-amber-900 dark:text-amber-100';
      default:
        return '';
    }
  });

  readonly iconWellClass = computed(() => {
    switch (this.tone()) {
      case 'success':
        return 'border-success/30 bg-success/15 text-success';
      case 'warning':
        return 'border-warning/40 bg-warning/15 text-warning-foreground';
      case 'destructive':
        return 'border-destructive/30 bg-destructive/15 text-destructive';
      case 'premium':
        return 'border-amber-400/40 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
      default:
        return 'bg-muted/40 text-primary';
    }
  });
}
