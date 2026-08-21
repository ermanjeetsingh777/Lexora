import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UpdateBranchRequest } from '@core/models/UpdateBranchRequest';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { BranchService } from '../branch.service';

@Component({
  selector: 'app-branch-edit',
  imports: [PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './branch-edit.html',
  styleUrl: './branch-edit.css',
})
export class BranchEdit implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly branchService = inject(BranchService);

  readonly branchId = this.route.snapshot.paramMap.get('branchId') ?? '';
  readonly presetInstitutionId = this.route.snapshot.paramMap.get('institutionId');
  readonly fromInstitutionDetail = !!this.presetInstitutionId;

  loading = signal(true);
  saving = signal(false);
  loadError = signal<string | null>(null);
  institutionName = signal('');
  institutionId = signal('');

  branchForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    institutionName: [{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    city: ['', Validators.required],
    address: ['', [Validators.required, Validators.minLength(5)]],
    capacity: [0, [Validators.min(1), Validators.max(100000)]],
    opensAt: ['09:00', Validators.required],
    closesAt: ['18:00', Validators.required],
    isActive: [true],
  });

  get backLink(): string | string[] {
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      return ['/institutions', this.presetInstitutionId, 'branches', this.branchId];
    }
    return ['/branches', this.branchId];
  }

  get backQueryParams(): { tab: string } | undefined {
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      return undefined;
    }
    return undefined;
  }

  ngOnInit(): void {
    if (!this.branchId) {
      this.loadError.set('Branch not found.');
      this.loading.set(false);
      return;
    }

    this.branchService
      .getDetailView(this.branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branch) => {
          this.institutionId.set(branch.institutionId);
          this.institutionName.set(branch.institutionName);
          this.branchForm.patchValue({
            name: branch.name,
            institutionName: branch.institutionName,
            email: branch.email ?? '',
            phone: branch.phone ?? '',
            city: branch.city ?? '',
            address: branch.address ?? '',
            capacity: branch.capacity || null,
            opensAt: branch.hoursStart ?? '09:00',
            closesAt: branch.hoursEnd ?? '18:00',
            isActive: branch.isActive,
          });
          this.loading.set(false);
        },
        error: (error) => {
          this.loadError.set(error?.error?.message ?? 'Unable to load branch details.');
          this.loading.set(false);
        },
      });
  }

  cancel(): void {
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      this.router.navigate(['/institutions', this.presetInstitutionId, 'branches', this.branchId]);
      return;
    }
    this.router.navigate(['/branches', this.branchId]);
  }

  saveBranch(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    const institutionId = this.institutionId();
    if (!institutionId) {
      this.toast.error('Institution is missing for this branch.');
      return;
    }

    this.saving.set(true);
    const formValues = this.branchForm.getRawValue();
    const payload: UpdateBranchRequest = {
      name: formValues.name ?? '',
      email: formValues.email ?? '',
      phone: formValues.phone ?? '',
      city: formValues.city ?? '',
      address: formValues.address ?? '',
      capacity: formValues.capacity ?? 0,
      operatingHoursStart: formValues.opensAt ?? '',
      operatingHoursEnd: formValues.closesAt ?? '',
      isActive: formValues.isActive ?? true,
    };

    this.branchService
      .updateBranch(institutionId, this.branchId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Branch updated successfully.');
          this.cancel();
          this.saving.set(false);
        },
        error: (error) => {
          this.toast.error(error?.error?.message ?? 'Unable to update branch. Please try again.');
          this.saving.set(false);
        },
      });
  }
}
