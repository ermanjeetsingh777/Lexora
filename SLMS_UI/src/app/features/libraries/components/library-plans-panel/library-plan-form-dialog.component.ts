import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import { CreatePlanRequest, UpdatePlanRequest } from '@core/models/plan.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { isDefaultPlanName, validatePlanForm } from './library-plan.util';

export interface LibraryPlanFormSubmit {
  mode: 'create' | 'edit';
  payload: CreatePlanRequest | UpdatePlanRequest;
}

@Component({
  selector: 'app-library-plan-form-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './library-plan-form-dialog.component.html',
})
export class LibraryPlanFormDialogComponent {
  readonly open = input(false);
  readonly plan = input<PlanResponse | null>(null);
  readonly plans = input<PlanResponse[]>([]);
  readonly busy = input(false);

  readonly submitted = output<LibraryPlanFormSubmit>();
  readonly closed = output<void>();

  readonly name = signal('');
  readonly description = signal('');
  readonly price = signal(0);
  readonly durationInDays = signal(30);
  readonly maxSeats = signal<number | null>(null);
  readonly isActive = signal(true);
  readonly formError = signal<string | null>(null);

  readonly isEdit = computed(() => !!this.plan());
  readonly nameLocked = computed(() => {
    const plan = this.plan();
    return !!plan && isDefaultPlanName(plan.name);
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const plan = this.plan();
      this.formError.set(null);
      if (plan) {
        this.name.set(plan.name);
        this.description.set(plan.description ?? '');
        this.price.set(plan.price);
        this.durationInDays.set(plan.durationInDays);
        this.maxSeats.set(plan.maxSeats ?? null);
        this.isActive.set(plan.isActive);
        return;
      }
      this.name.set('');
      this.description.set('');
      this.price.set(0);
      this.durationInDays.set(30);
      this.maxSeats.set(null);
      this.isActive.set(true);
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    const plan = this.plan();
    const error = validatePlanForm({
      name: this.name(),
      price: this.price(),
      durationInDays: this.durationInDays(),
      maxSeats: this.maxSeats(),
      plans: this.plans(),
      excludePlanId: plan?.id,
    });
    if (error) {
      this.formError.set(error);
      return;
    }

    const payloadBase = {
      name: this.nameLocked() && plan ? plan.name : this.name().trim(),
      description: this.description().trim() || null,
      price: this.price(),
      durationInDays: this.durationInDays(),
      maxSeats: this.maxSeats(),
      isActive: this.isActive(),
    };

    if (plan) {
      this.submitted.emit({
        mode: 'edit',
        payload: { id: plan.id, ...payloadBase },
      });
      return;
    }

    this.submitted.emit({
      mode: 'create',
      payload: payloadBase,
    });
  }
}
