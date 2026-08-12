import { Component, computed, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { LucideArrowRight, LucideCalendarCheck, LucideRotateCcw, LucideX } from '@lucide/angular';
import { ButtonComponent } from '@shared/components/button/button.component';
import { formatRenewDate, previewRenewal, RenewTarget } from '../../member-lifecycle.util';

@Component({
  selector: 'app-renew-plan-dialog',
  imports: [ButtonComponent, CurrencyPipe, LucideArrowRight, LucideCalendarCheck, LucideRotateCcw, LucideX],
  templateUrl: './renew-plan-dialog.component.html',
})
export class RenewPlanDialogComponent {
  readonly target = input<RenewTarget | null>(null);
  readonly busy = input(false);

  readonly confirm = output<RenewTarget>();
  readonly closed = output<void>();

  readonly preview = computed(() => previewRenewal(this.target()?.planDurationInDays ?? 30));
  readonly formatRenewDate = formatRenewDate;
  readonly Math = Math;

  onClose(): void {
    this.closed.emit();
  }

  onConfirm(): void {
    const t = this.target();
    if (t) this.confirm.emit(t);
  }
}
