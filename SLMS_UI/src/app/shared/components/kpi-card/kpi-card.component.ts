import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  host: { class: 'relative overflow-hidden rounded-xl border bg-card p-5 shadow-elegant hover-lift block animate-fade-up' },
  template: `
    <div class="absolute inset-0 blueprint-grid-sm opacity-30 pointer-events-none"></div>
    <div class="relative flex items-start justify-between gap-3">
      <div class="space-y-2">
        <p class="label-mono">{{ label() }}</p>
        <p class="text-2xl font-semibold tracking-tight tabular-nums">{{ value() }}</p>
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
      <div class="rounded-lg border bg-muted/40 p-2 text-primary">
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

  protected readonly Math = Math;

  readonly positive = computed(() => (this.delta() ?? 0) >= 0);
  readonly deltaClasses = computed(() =>
    this.positive() ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
  );
}
