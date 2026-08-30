import { Component, inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="pointer-events-none fixed top-4 right-4 z-[100] flex w-80 flex-col gap-2" role="region" aria-label="Notifications">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="animate-fade-up pointer-events-auto rounded-lg border bg-card px-4 py-3 text-sm shadow-elegant"
          [class.border-success]="t.type === 'success'"
          [class.border-destructive]="t.type === 'error'"
          [class.bg-green-100]="t.type === 'success'"
          [class.border-green-500]="t.type === 'success'"

          [class.bg-red-100]="t.type === 'error'"
          [class.border-red-500]="t.type === 'error'"

          [class.bg-amber-100]="t.type === 'warning'"
          [class.border-amber-500]="t.type === 'warning'"

          [class.bg-blue-100]="t.type === 'info'"
          [class.border-blue-500]="t.type === 'info'"
          role="status"
        >
          <span
            class="mr-2 inline-block h-1.5 w-1.5 rounded-full"
            [class.bg-green-600]="t.type === 'success'"
            [class.bg-red-600]="t.type === 'error'"
            [class.bg-amber-600]="t.type === 'warning'"
            [class.bg-blue-600]="t.type === 'info'"
          ></span>
          {{ t.message }}
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly toast = inject(ToastService);
}
