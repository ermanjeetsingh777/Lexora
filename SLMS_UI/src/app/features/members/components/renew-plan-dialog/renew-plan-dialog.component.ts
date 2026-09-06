import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideArrowRight, LucideCalendarCheck, LucideRotateCcw, LucideX } from '@lucide/angular';
import { ButtonComponent } from '@shared/components/button/button.component';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import {
  addDaysIso,
  formatRenewDate,
  previewRenewal,
  RenewTarget,
  todayIsoLocal,
} from '../../member-lifecycle.util';

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
  readonly startDate = signal(todayIsoLocal());
  readonly endDate = signal(todayIsoLocal());
  /** When true, changing start/plan recalculates end from duration. */
  private endAuto = true;

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

  readonly preview = computed(() =>
    previewRenewal(this.previewDuration(), this.startDate())
  );

  readonly canConfirm = computed(() => {
    if (!this.startDate() || !this.endDate()) return false;
    if (this.endDate() <= this.startDate()) return false;
    return !this.isAssignMode() || !!this.selectedPlanId();
  });

  readonly formatRenewDate = formatRenewDate;
  readonly Math = Math;

  constructor() {
    effect(() => {
      const target = this.target();
      if (!target) {
        this.selectedPlanId.set('');
        this.endAuto = true;
        return;
      }
      this.selectedPlanId.set(target.hasPlan ? (target.planId || '') : '');
      this.endAuto = true;
      const start = target.startDate || todayIsoLocal();
      this.startDate.set(start);
      const duration = target.hasPlan
        ? (target.planDurationInDays || 30)
        : 30;
      this.endDate.set(target.endDate || addDaysIso(start, duration));
    });

    effect(() => {
      // Recalculate end when plan selection changes in assign mode
      const plan = this.selectedPlan();
      if (!this.isAssignMode() || !this.endAuto) return;
      const days = plan?.durationInDays ?? 30;
      this.endDate.set(addDaysIso(this.startDate(), days));
    });
  }

  onStartDateChange(value: string): void {
    this.startDate.set(value);
    if (this.endAuto) {
      this.endDate.set(addDaysIso(value, this.previewDuration()));
    }
  }

  onEndDateChange(value: string): void {
    this.endAuto = false;
    this.endDate.set(value);
  }

  onPlanSelect(planId: string): void {
    this.selectedPlanId.set(planId);
    this.endAuto = true;
    const plan = this.plans().find(p => p.id === planId);
    const days = plan?.durationInDays ?? this.previewDuration();
    this.endDate.set(addDaysIso(this.startDate(), days));
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
      startDate: this.startDate(),
      endDate: this.endDate(),
    });
  }
}
