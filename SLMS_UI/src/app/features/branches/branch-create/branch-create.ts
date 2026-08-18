import { Component, DestroyRef, inject, input, OnInit, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormsModule, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateBranchRequest } from '@core/models/CreateBranchRequest';
import { ToastService } from '@core/services/toast.service';
import { InstitutionStatus, OnboardingSteps } from '@core/enums/OnbardingSteps';
import { CommonService } from '@core/services/common.service';
import { StorageService } from '@core/services/storage.service';
import { ActivatedRoute, Router } from '@angular/router';
import { InstitutionDropdownResponse } from '@core/models/institution-dropdown.model';
import { BranchService } from '../branch.service';
import { catchError, map, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-branch-create',
  imports: [PageHeaderComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './branch-create.html',
  styleUrl: './branch-create.css',
  providers: [InstitutionsService]
})
export class BranchCreate implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly institutionsService = inject(InstitutionsService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly commonService = inject(CommonService);
  private readonly storageService = inject(StorageService);
  private readonly branchService = inject(BranchService);

  showPageHeader = input(true, {
    transform: (value: boolean | undefined) => value ?? true
  });

  isOnboarding = input(false, {
    transform: (value: boolean | undefined) => value ?? false
  });

  institutions: WritableSignal<InstitutionDropdownResponse[]> = signal([]);
  disabledInstitutionSelect = signal(false);
  loader = signal(false);
  readonly presetInstitutionId = this.route.snapshot.paramMap.get('institutionId');
  readonly fromInstitutionDetail = this.router.url.includes('/addbranch') && !!this.presetInstitutionId;

  get backLink(): string | string[] {
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      return ['/institutions', this.presetInstitutionId];
    }
    return '/branches';
  }

  get backQueryParams(): { tab: string } | undefined {
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      return { tab: 'branches' };
    }
    return undefined;
  }

  activeTab = 'profile';

  branchForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    institutionId: [{ value: '', disabled: this.disabledInstitutionSelect() }],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    city: ['', Validators.required],
    address: ['', [Validators.required, Validators.minLength(5)]],
    capacity: [0, [Validators.min(1), Validators.max(100000)]],
    opensAt: ['09:00', Validators.required],
    closesAt: ['18:00', Validators.required],
  });

  ngOnInit() {
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      this.loadInstitutions(this.presetInstitutionId, true);
      return;
    }

    this.institutionsService.getInstitutionBranchForDropdown().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const items = response?.data ?? [];
        this.applyInstitutionSelection(items);
      },
      error: () => {
        this.institutions.set([]);
        this.disabledInstitutionSelect.set(false);
      },
    });
  }

  cancel(): void {
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      this.router.navigate(['/institutions', this.presetInstitutionId], { queryParams: { tab: 'branches' } });
      return;
    }

    this.router.navigate(['/branches']);
  }

  private loadInstitutions(preferredId: string, lockSelection: boolean): void {
    this.institutionsService
      .getInstitutionBranchForDropdown()
      .pipe(
        switchMap((response) => {
          const items = [...(response?.data ?? [])];
          if (items.some((item) => item.value === preferredId)) {
            return of(items);
          }

          return this.institutionsService.getById(preferredId).pipe(
            map((institution) => [
              { key: institution.name, value: institution.id, branches: [] },
              ...items,
            ]),
            catchError(() => of(items)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => this.applyInstitutionSelection(items, preferredId, lockSelection),
        error: () => this.ensureInstitutionFromApi(preferredId, lockSelection),
      });
  }

  private ensureInstitutionFromApi(preferredId: string, lockSelection: boolean): void {
    this.institutionsService.getById(preferredId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (institution) => {
        this.applyInstitutionSelection(
          [{ key: institution.name, value: institution.id, branches: [] }],
          preferredId,
          lockSelection,
        );
      },
      error: () => {
        this.institutions.set([]);
        this.branchForm.controls.institutionId.setValue(preferredId);
        this.disabledInstitutionSelect.set(lockSelection);
        if (lockSelection) {
          this.branchForm.get('institutionId')?.disable();
        }
      },
    });
  }

  private applyInstitutionSelection(
    items: InstitutionDropdownResponse[],
    preferredId?: string | null,
    lockSelection = false,
  ): void {
    this.institutions.set(items);

    const selectedId =
      preferredId ??
      (items.length >= 1 ? items[0].value : '');

    this.branchForm.controls.institutionId.setValue(selectedId);
    this.disabledInstitutionSelect.set(lockSelection || items.length <= 1 || this.isOnboarding());

    if (this.disabledInstitutionSelect()) {
      this.branchForm.get('institutionId')?.disable();
    } else {
      this.branchForm.get('institutionId')?.enable();
    }
  }

  createBranch(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }
    this.loader.set(true);
    const formValues = this.branchForm.getRawValue();
    const payload: CreateBranchRequest = {
      name: formValues.name ?? '',
      institutionId: formValues.institutionId ?? '',
      email: formValues.email ?? '',
      phone: formValues.phone ?? '',
      city: formValues.city ?? '',
      address: formValues.address ?? '',
      capacity: formValues.capacity ?? 0,
      openAt: formValues.opensAt ?? '',
      closesAt: formValues.closesAt ?? '',
      isActive: true,
      isPrimary: this.isOnboarding(),
      isOnboarding: this.isOnboarding(),
      status: InstitutionStatus.Active 
    };
    this.branchService.createBranches(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (this.isOnboarding()) {
          const loggedInUser = this.storageService.user();
          if (loggedInUser) {
            loggedInUser.onboardingStep = OnboardingSteps.Branch;
            this.storageService.setUser(loggedInUser);
          }
        }
        this.toast.success(this.commonService.onboardingMessages.branchCreated);
        if (this.isOnboarding()) {
          this.router.navigate(['/onboarding/library']);
        } else if (this.fromInstitutionDetail && this.presetInstitutionId) {
          this.router.navigate(['/institutions', this.presetInstitutionId], { queryParams: { tab: 'branches' } });
        } else {
          this.router.navigate(['/branches']);
        }
        this.loader.set(false);
      },
      error: (error) => {
        this.toast.error(error.error.message || 'Unable to create branch. Please try again.');
        this.loader.set(false);
      }
    });
  }
}
