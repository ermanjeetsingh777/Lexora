import { Component, computed, input } from '@angular/core';
import { buttonVariants, type ButtonSize, type ButtonVariant } from './button.variants';

/**
 * Standalone button matching the shadcn/ui `Button` variants (default, destructive,
 * outline, secondary, ghost, link) and sizes (default, sm, lg, icon).
 * `host: { style: 'display:contents' }` keeps the wrapper transparent to layout,
 * so `<app-button>` behaves visually like a plain `<button>`.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  host: { style: 'display:contents' },
  template: `
    <button [type]="type()" [disabled]="disabled()" [class]="classes()">
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('default');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly class = input('');

  readonly classes = computed(() =>
    buttonVariants({ variant: this.variant(), size: this.size(), className: this.class() }),
  );
}
