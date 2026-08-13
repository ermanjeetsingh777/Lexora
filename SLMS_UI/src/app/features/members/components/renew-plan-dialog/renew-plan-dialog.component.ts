import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideArrowRight, LucideCalendarCheck, LucideRotateCcw, LucideX } from '@lucide/angular';
import { ButtonComponent } from '@shared/components/button/button.component';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import { formatRenewDate, previewRenewal, RenewTarget } from '../../member-lifecycle.util';

@Component({
  selector: 'app-renew-plan-dialog',
  imports: [ButtonComponent, CurrencyPipe, FormsModule, LucideArrowRight, LucideCalendarCheck, LucideRotateCcw, LucideX],
  templateUrl: './renew-plan-dialog.component.html',
})
export class RenewPlanDialogComponent {
  readonly target = input<RenewTarget | null>(null);
  readonly plans = input<PlanResponse[]>([]);
  readonly busy = input(false);

  readonly confirm = output<RenewTarget>();
  readonly closed = output<void>();

  readonly selectedPlanId = signal('');

  readonly isAssignMode = computed(() => !this.target()?.hasPlan);

  readonly selectedPlan = computed(() =>
    this.plans().find(p => p.id === this.selectedPlanId()) ?? null
  );

  readonly previewDuration = computed(() => {
    if (this.isAssignMode()) {
      return this.selectedPlan()?.durationInDays ?? 30;
    }
    return this.target()?.planDurationInDays ?? 30;
  });

  readonly preview = computed(() => previewRenewal(this.previewDuration()));
  readonly canConfirm = computed(() => !this.isAssignMode() || !!this.selectedPlanId());
  readonly formatRenewDate = formatRenewDate;
  readonly Math = Math;

  constructor() {
    effect(() => {
      const target = this.target();
      if (!target) {
        this.selectedPlanId.set('');
        return;
      }
      this.selectedPlanId.set(target.hasPlan ? (target.planId || '') : '');
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  onConfirm(): void {
    const t = this.target();
    if (!t || !this.canConfirm()) return;
    this.confirm.emit({
      ...t,
      selectedPlanId: this.isAssignMode() ? this.selectedPlanId() : undefined,
    });
  }
}
