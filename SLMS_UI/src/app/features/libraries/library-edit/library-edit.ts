import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BranchLibraryCapacitySummary } from '@core/models/branch-library-capacity.models';
import { UpdateLibraryPayload } from '@core/models/library-detail.models';
import { ToastService } from '@core/services/toast.service';
import { LucideChevronDown } from '@lucide/angular';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { catchError, of } from 'rxjs';
import { LibraryService } from '../library.service';

@Component({
  selector: 'app-library-edit',
  imports: [PageHeaderComponent, ReactiveFormsModule, LucideChevronDown],
  templateUrl: './library-edit.html',
  styleUrl: './library-edit.css',
})
export class LibraryEdit implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly libraryService = inject(LibraryService);

  readonly libraryId = this.route.snapshot.paramMap.get('libraryId') ?? '';

  loading = signal(true);
  saving = signal(false);
  loadError = signal<string | null>(null);
  capacitySummaryLoading = signal(false);
  capacitySummaryExpanded = signal(false);
  capacitySummary = signal<BranchLibraryCapacitySummary | null>(null);
  originalCapacity = signal(0);

  institutionId = signal('');
  branchId = signal('');
  institutionName = signal('');
  branchName = signal('');

  libraryForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    institutionName: [{ value: '', disabled: true }],
    branchName: [{ value: '', disabled: true }],
    description: [''],
    email: [{ value: '', disabled: true }, [Validators.email]],
    phone: ['', [Validators.pattern(/^$|^[0-9]{10}$/)]],
    address: [''],
    floor: [0, [Validators.min(0), Validators.max(50)]],
    capacity: [0, [Validators.required, Validators.min(1), Validators.max(100000)]],
    isActive: [true],
  });

  get backLink(): string[] {
    return ['/libraries', this.libraryId];
  }

  ngOnInit(): void {
    if (!this.libraryId) {
      this.loadError.set('Library not found.');
      this.loading.set(false);
      return;
    }

    this.libraryService
      .getDetailView(this.libraryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (library) => {
          this.institutionId.set(library.institutionId);
          this.branchId.set(library.branchId);
          this.institutionName.set(library.institutionName);
          this.branchName.set(library.branchName);
          this.originalCapacity.set(library.capacity);

          this.libraryForm.patchValue({
            name: library.name,
            institutionName: library.institutionName,
            branchName: library.branchName,
            description: library.description ?? '',
            phone: library.phone ?? '',
            address: library.address ?? '',
            floor: library.floor ?? 0,
            capacity: library.capacity || null,
            isActive: library.isActive,
          });
          this.libraryForm.controls.email.setValue(library.email ?? '');

          this.applyCapacityValidator();
          this.loadCapacitySummary(library.institutionId, library.branchId);
          this.loading.set(false);
        },
        error: (error) => {
          this.loadError.set(error?.error?.message ?? 'Unable to load library details.');
          this.loading.set(false);
        },
      });
  }

  capacityMaxLimit(): number {
    const summary = this.capacitySummary();
    if (summary?.hasBranchCapacityLimit) {
      return summary.remainingCapacity + this.originalCapacity();
    }
    return 100000;
  }

  toggleCapacitySummary(): void {
    this.capacitySummaryExpanded.update((expanded) => !expanded);
  }

  cancel(): void {
    this.router.navigate(['/libraries', this.libraryId]);
  }

  saveLibrary(): void {
    if (this.libraryForm.invalid) {
      this.libraryForm.markAllAsTouched();
      return;
    }

    const institutionId = this.institutionId();
    const branchId = this.branchId();
    if (!institutionId || !branchId) {
      this.toast.error('Institution or branch is missing for this library.');
      return;
    }

    this.saving.set(true);
    const formValues = this.libraryForm.getRawValue();
    const payload: UpdateLibraryPayload = {
      name: formValues.name?.trim() ?? '',
      description: formValues.description?.trim() ?? '',
      address: formValues.address?.trim() ?? '',
      phone: formValues.phone?.trim() ?? '',
      floor: formValues.floor ?? 0,
      capacity: formValues.capacity ?? 0,
      isActive: formValues.isActive ?? true,
    };

    this.libraryService
      .updateLibrary(institutionId, branchId, this.libraryId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Library updated successfully.');
          this.cancel();
          this.saving.set(false);
        },
        error: (error) => {
          this.toast.error(error?.error?.message ?? 'Unable to update library. Please try again.');
          this.saving.set(false);
        },
      });
  }

  private loadCapacitySummary(institutionId: string, branchId: string): void {
    this.capacitySummaryLoading.set(true);
    this.libraryService
      .getBranchCapacitySummary(institutionId, branchId)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((summary) => {
        this.capacitySummary.set(summary);
        this.capacitySummaryLoading.set(false);
        this.applyCapacityValidator();
      });
  }

  private applyCapacityValidator(): void {
    const control = this.libraryForm.controls.capacity;
    const max = this.capacityMaxLimit();
    control.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(max),
    ]);
    control.updateValueAndValidity({ emitEvent: false });
  }
}
