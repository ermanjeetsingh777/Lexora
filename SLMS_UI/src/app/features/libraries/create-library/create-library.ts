import { Component, DestroyRef, inject, input, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { branches } from '@core/constants/lovable-mock.data';
import { CreateLibraryRequest } from '@core/models/CreateLibraryRequest ';
import { BranchDropdownResponse, InstitutionDropdownResponse, KeyValueResponse } from '@core/models/institution-dropdown.model';
import { CommonService } from '@core/services/common.service';
import { StorageService } from '@core/services/storage.service';
import { ToastService } from '@core/services/toast.service';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { PageHeaderComponent } from "@shared/components/page-header/page-header.component";
import { concat } from 'rxjs';
import { LibraryService } from '../library.service';
import { InstitutionStatus, OnboardingSteps } from '@core/enums/OnbardingSteps';

@Component({
  selector: 'app-create-library',
  imports: [PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './create-library.html',
  styleUrl: './create-library.css',
  providers: [InstitutionsService, LibraryService]
})
export class CreateLibrary {
  readonly router = inject(Router);
  private readonly institutionsService = inject(InstitutionsService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly commonService = inject(CommonService);
  private readonly storageService = inject(StorageService);
  private readonly libraryService = inject(LibraryService);

  showPageHeader = input(true, {
    transform: (value: boolean | undefined) => value ?? true
  });

  isOnboarding = input(false, {
    transform: (value: boolean | undefined) => value ?? false
  });

  institutions: WritableSignal<InstitutionDropdownResponse[]> = signal([]);
  branches: WritableSignal<BranchDropdownResponse[]> = signal([]);
  disabledInstitutionSelect = signal(false);
  disabledBranchSelect = signal(false);
  loader = signal(false);

  librariesForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    institutionId: [{ value: '', disabled: this.disabledInstitutionSelect() },[Validators.required]],
    branchId: [{ value: '', disabled: this.disabledBranchSelect() },[Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    floor: [0, [Validators.min(0), Validators.max(10)]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    capacity: [0, [Validators.min(1), Validators.max(100000)]]
  });

  ngOnInit() {
    this.institutionsService.getInstitutionBranchForDropdown().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.institutions.set(response.data);
          this.branches.set(this.institutions().length === 1 ? this.institutions()[0].branches : [])
          this.librariesForm.controls['institutionId'].setValue((this.institutions().length === 1) ? this.institutions()[0].value : '');
          this.librariesForm.controls['branchId'].setValue((this.branches().length === 1) ? this.branches()[0].value : '');
          this.disabledInstitutionSelect.set((this.institutions().length <= 1 || this.isOnboarding()));
          if (this.institutions().length == 1) {
            this.disabledBranchSelect.set((this.institutions()[0].branches.length <= 1 || this.isOnboarding()));
          }
          this.disabledInstitutionSelect() ? this.librariesForm.get('institutionId')?.disable() : this.librariesForm.get('institutionId')?.enable();
          this.disabledBranchSelect() ? this.librariesForm.get('branchId')?.disable() : this.librariesForm.get('branchId')?.enable();
        }
      },
      error: (error) => {
        this.institutions.set([]);
        this.disabledInstitutionSelect.set(false);
        this.disabledBranchSelect.set(false);
      }
    });
    this.librariesForm.controls.institutionId.valueChanges.subscribe((institutionId) => {
      this.onInstitutionChange(institutionId ?? '');
    });
  }
  
  onInstitutionChange(institutionId: string): void {
    if (!institutionId) {
      this.branches.set([]);
      this.librariesForm.controls.branchId.setValue('');
      return;
    }

    const institution = this.institutions().find(
      x => x.value === institutionId
    );

    const branches = institution?.branches ?? [];

    this.branches.set(branches);

    this.disabledBranchSelect.set(branches.length <= 1);

    this.librariesForm.controls.branchId.setValue(
      branches.length === 1 ? branches[0].value : ''
    );
  }


  createlibraries(): void {
    if (this.librariesForm.invalid) {
      this.librariesForm.markAllAsTouched();
      return;
    }
    this.loader.set(true);
    const formValues = this.librariesForm.getRawValue();

    const request: CreateLibraryRequest = {
      name: formValues.name ?? '',
      description: '',
      address: formValues.address ?? '',
      floor: formValues.floor ?? 0,
      capacity: formValues.capacity ?? 0,
      isActive: true,
      isPrimary: this.isOnboarding(),
      isOnboarding: this.isOnboarding(),
      status: InstitutionStatus.Active
    };
    this.loader.set(true);

    this.libraryService.createlibrary(formValues.institutionId ?? '', formValues.branchId ?? '', request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (this.isOnboarding()) {
          const loggedInUser = this.storageService.user();
          if (loggedInUser) {
            loggedInUser.onboardingStep = OnboardingSteps.Completed;
            this.storageService.setUser(loggedInUser);
          }
        }
        this.toast.success(this.commonService.onboardingMessages.libraryCreated);
        // this.router.navigate([this.isOnboarding() ? '/onboarding/library' : '/libraries/create']);
        this.loader.set(false);
      },
      error: (error) => {
        this.toast.error(error.error.message || 'Unable to create library. Please try again.');
        this.loader.set(false);
      }
    });
  }
}
