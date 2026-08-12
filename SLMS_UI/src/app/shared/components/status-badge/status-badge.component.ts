import { Component, computed, input } from '@angular/core';

type Variant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/15 text-warning-foreground border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-info/10 text-info border-info/20',
  muted: 'bg-muted text-muted-foreground border-border',
};

const AUTO_VARIANT: Record<string, Variant> = {
  active: 'success', paid: 'success', success: 'success', resolved: 'success', present: 'success', available: 'success',
  pending: 'warning', late: 'warning', warning: 'warning', reserved: 'warning', lowstock: 'warning', 'low stock': 'warning',
  failed: 'destructive', suspended: 'destructive', locked: 'destructive', destructive: 'destructive', outofstock: 'destructive', 'out of stock': 'destructive', maintenance: 'destructive', absent: 'destructive',
  info: 'info', occupied: 'info', open: 'info',
  inactive: 'muted', refunded: 'muted', expired: 'destructive',  expirestoday : 'destructive', canceled: 'muted', closed: 'muted', muted: 'muted', unavailable: 'muted', empty: 'muted', disabled: 'muted',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  host: { class: 'inline-flex' },
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium" [class]="classes()">
      <!-- <span class="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span> -->
      {{ status() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly variant = input<Variant>();

  readonly classes = computed(() => {
    const v = this.variant() ?? AUTO_VARIANT[this.status().toLowerCase()] ?? 'default';
    return VARIANT_CLASSES[v];
  });
}
