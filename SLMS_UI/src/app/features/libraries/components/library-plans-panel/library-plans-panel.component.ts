import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  LucideLogOut,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideRotateCcw,
} from '@lucide/angular';
import { PlanResponse } from '@core/models/institution-dropdown.model';
import { CreatePlanRequest, UpdatePlanRequest } from '@core/models/plan.models';
import { PlanService } from '@core/services/plan.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { isDefaultPlanName } from './library-plan.util';
import { LibraryPlanFormSubmit } from './library-plan-form-dialog.component';

@Component({
  selector: 'app-library-plans-panel',
  standalone: true,
  imports: [
    CurrencyPipe,
    ButtonComponent,
    SectionHeaderComponent,
    StatusBadgeComponent,
    LucidePlus,
    LucidePencil,
    LucideLogOut,
    LucideRotateCcw,
    LucideRefreshCw,
  ],
  templateUrl: './library-plans-panel.component.html',
  styleUrl: './library-plans-panel.component.css',
})
export class LibraryPlansPanelComponent {
  private readonly planService = inject(PlanService);
  private readonly toast = inject(ToastService);

  readonly institutionId = input.required<string>();
  readonly branchId = input.required<string>();
  readonly libraryId = input.required<string>();
  readonly title = input('Membership plans');
  readonly description = input('Manage subscription plans offered by this library');

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly togglingPlanId = signal<string | null>(null);
  readonly plans = signal<PlanResponse[]>([]);
  readonly dialogOpen = signal(false);
  readonly editingPlan = signal<PlanResponse | null>(null);

  readonly activePlans = computed(() => this.plans().filter((plan) => plan.isActive));
  readonly inactivePlans = computed(() => this.plans().filter((plan) => !plan.isActive));

  constructor() {
    effect(() => {
      this.institutionId();
      this.branchId();
      this.libraryId();
      this.loadPlans();
    });
  }

  isDefaultPlan(plan: PlanResponse): boolean {
    return isDefaultPlanName(plan.name);
  }

  openCreate(): void {
    this.editingPlan.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(plan: PlanResponse): void {
    this.editingPlan.set(plan);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editingPlan.set(null);
  }

  onFormSubmit(event: LibraryPlanFormSubmit): void {
    this.saving.set(true);
    const institutionId = this.institutionId();
    const branchId = this.branchId();
    const libraryId = this.libraryId();

    const request$ =
      event.mode === 'create'
        ? this.planService.create(
            institutionId,
            branchId,
            libraryId,
            event.payload as CreatePlanRequest,
          )
        : this.planService.update(
            institutionId,
            branchId,
            libraryId,
            (event.payload as UpdatePlanRequest).id,
            event.payload as UpdatePlanRequest,
          );

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.toast.success(event.mode === 'create' ? 'Plan created.' : 'Plan updated.');
        this.loadPlans();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to save plan.');
      },
    });
  }

  exitPlan(plan: PlanResponse): void {
    if (!plan.isActive) return;
    this.togglingPlanId.set(plan.id);
    this.planService
      .deactivate(this.institutionId(), this.branchId(), this.libraryId(), plan.id)
      .subscribe({
        next: () => {
          this.togglingPlanId.set(null);
          this.toast.success(`"${plan.name}" plan exited.`);
          this.loadPlans();
        },
        error: (err) => {
          this.togglingPlanId.set(null);
          this.toast.error(err?.error?.message ?? 'Failed to exit plan.');
        },
      });
  }

  reactivatePlan(plan: PlanResponse): void {
    if (plan.isActive) return;
    this.togglingPlanId.set(plan.id);
    this.planService
      .activate(this.institutionId(), this.branchId(), this.libraryId(), plan.id)
      .subscribe({
        next: () => {
          this.togglingPlanId.set(null);
          this.toast.success(`"${plan.name}" plan reactivated.`);
          this.loadPlans();
        },
        error: (err) => {
          this.togglingPlanId.set(null);
          this.toast.error(err?.error?.message ?? 'Failed to reactivate plan.');
        },
      });
  }

  loadPlans(): void {
    this.loading.set(true);
    this.planService.list(this.institutionId(), this.branchId(), this.libraryId()).subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to load plans.');
      },
    });
  }
}
