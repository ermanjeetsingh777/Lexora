import { Component, computed, input } from '@angular/core';
import { buttonVariants, type ButtonSize, type ButtonVariant } from './button.variants';

/**
 * Standalone button matching the shadcn/ui `Button` variants (default, destructive,
 * outline, secondary, ghost, link) and sizes (default, sm, lg, icon).
 * `host: { class: 'inline-flex' }` keeps the wrapper aligned with button layout
 * so click handlers on `<app-button>` receive events reliably.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  host: { class: 'inline-flex' },
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
