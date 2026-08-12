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
import { Router } from '@angular/router';
import { InstitutionDropdownResponse } from '@core/models/institution-dropdown.model';
import { BranchService } from '../branch.service';

@Component({
  selector: 'app-branch-create',
  imports: [PageHeaderComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './branch-create.html',
  styleUrl: './branch-create.css',
  providers: [InstitutionsService, BranchService]
})
export class BranchCreate implements OnInit {
  readonly router = inject(Router);
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
    this.institutionsService.getInstitutionBranchForDropdown().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.institutions.set(response.data);
          this.branchForm.controls['institutionId'].setValue((this.institutions().length >= 1) ? this.institutions()[0].value : '');
          this.disabledInstitutionSelect.set((this.institutions().length <= 1 || this.isOnboarding()));
          if (this.disabledInstitutionSelect()) {
            this.branchForm.get('institutionId')?.disable();
          } else {
            this.branchForm.get('institutionId')?.enable();
          }
        }
      },
      error: (error) => {
        this.institutions.set([]);
        this.disabledInstitutionSelect.set(false);
      }
    });
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
        this.router.navigate([this.isOnboarding() ? '/onboarding/library' : '/branches']);
        this.loader.set(false);
      },
      error: (error) => {
        this.toast.error(error.error.message || 'Unable to create branch. Please try again.');
        this.loader.set(false);
      }
    });
  }
}
