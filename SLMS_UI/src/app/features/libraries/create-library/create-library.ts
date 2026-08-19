import { Component, DestroyRef, inject, input, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateLibraryRequest } from '@core/models/CreateLibraryRequest ';
import { BranchDropdownResponse, InstitutionDropdownResponse } from '@core/models/institution-dropdown.model';
import { CommonService } from '@core/services/common.service';
import { StorageService } from '@core/services/storage.service';
import { ToastService } from '@core/services/toast.service';
import { BranchService } from '@features/branches/branch.service';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { catchError, map, of, switchMap } from 'rxjs';
import { LibraryService } from '../library.service';
import { InstitutionStatus, OnboardingSteps } from '@core/enums/OnbardingSteps';

@Component({
  selector: 'app-create-library',
  imports: [PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './create-library.html',
  styleUrl: './create-library.css',
  providers: [InstitutionsService, LibraryService],
})
export class CreateLibrary implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly branchService = inject(BranchService);
  private readonly institutionsService = inject(InstitutionsService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly commonService = inject(CommonService);
  private readonly storageService = inject(StorageService);
  private readonly libraryService = inject(LibraryService);

  showPageHeader = input(true, {
    transform: (value: boolean | undefined) => value ?? true,
  });

  isOnboarding = input(false, {
    transform: (value: boolean | undefined) => value ?? false,
  });

  institutions: WritableSignal<InstitutionDropdownResponse[]> = signal([]);
  branches: WritableSignal<BranchDropdownResponse[]> = signal([]);
  disabledInstitutionSelect = signal(false);
  disabledBranchSelect = signal(false);
  loader = signal(false);
  readonly presetInstitutionId = this.route.snapshot.paramMap.get('institutionId');
  readonly presetBranchId = this.route.snapshot.paramMap.get('branchId');
  readonly fromInstitutionDetail = !!this.presetInstitutionId;
  readonly fromBranchDetail = !!this.presetBranchId;

  get backLink(): string | string[] {
    if (this.fromBranchDetail && this.presetBranchId) {
      return ['/branches', this.presetBranchId];
    }
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      return ['/institutions', this.presetInstitutionId];
    }
    return '/libraries';
  }

  get backQueryParams(): { tab: string } | undefined {
    if (this.fromBranchDetail && this.presetBranchId) {
      return { tab: 'libraries' };
    }
    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      return { tab: 'libraries' };
    }
    return undefined;
  }

  librariesForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    institutionId: [{ value: '', disabled: this.disabledInstitutionSelect() }, [Validators.required]],
    branchId: [{ value: '', disabled: this.disabledBranchSelect() }, [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    floor: [0, [Validators.min(0), Validators.max(10)]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    capacity: [0, [Validators.min(1), Validators.max(100000)]],
  });

  ngOnInit() {
    this.librariesForm.controls.institutionId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((institutionId) => {
        if (!this.fromInstitutionDetail && !this.fromBranchDetail) {
          this.onInstitutionChange(institutionId ?? '');
        }
      });

    if (this.fromBranchDetail && this.presetBranchId) {
      this.loadBranchContext(this.presetBranchId);
      return;
    }

    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      this.loadInstitutions(this.presetInstitutionId, true);
      return;
    }

    this.institutionsService
      .getInstitutionBranchForDropdown()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = response?.data ?? [];
          this.applyInstitutionSelection(items);
        },
        error: () => {
          this.institutions.set([]);
          this.disabledInstitutionSelect.set(false);
          this.disabledBranchSelect.set(false);
        },
      });
  }

  cancel(): void {
    if (this.fromBranchDetail && this.presetBranchId) {
      this.router.navigate(['/branches', this.presetBranchId], { queryParams: { tab: 'libraries' } });
      return;
    }

    if (this.fromInstitutionDetail && this.presetInstitutionId) {
      this.router.navigate(['/institutions', this.presetInstitutionId], { queryParams: { tab: 'libraries' } });
      return;
    }

    this.router.navigate(['/libraries']);
  }

  onInstitutionChange(institutionId: string): void {
    if (!institutionId) {
      this.branches.set([]);
      this.librariesForm.controls.branchId.setValue('');
      return;
    }

    const institution = this.institutions().find((x) => x.value === institutionId);
    const branchItems = institution?.branches ?? [];

    if (branchItems.length > 0) {
      this.applyBranchSelection(branchItems);
      return;
    }

    this.loadBranchesForInstitution(institutionId);
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
      status: InstitutionStatus.Active,
    };

    this.libraryService
      .createlibrary(formValues.institutionId ?? '', formValues.branchId ?? '', request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.isOnboarding()) {
            const loggedInUser = this.storageService.user();
            if (loggedInUser) {
              loggedInUser.onboardingStep = OnboardingSteps.Completed;
              this.storageService.setUser(loggedInUser);
            }
          }

          this.toast.success(this.commonService.onboardingMessages.libraryCreated);

          if (this.isOnboarding()) {
            this.router.navigate(['/dashboard']);
          } else if (this.fromBranchDetail && this.presetBranchId) {
            this.router.navigate(['/branches', this.presetBranchId], { queryParams: { tab: 'libraries' } });
          } else if (this.fromInstitutionDetail && this.presetInstitutionId) {
            this.router.navigate(['/institutions', this.presetInstitutionId], { queryParams: { tab: 'libraries' } });
          } else {
            this.router.navigate(['/libraries']);
          }

          this.loader.set(false);
        },
        error: (error) => {
          this.toast.error(error.error.message || 'Unable to create library. Please try again.');
          this.loader.set(false);
        },
      });
  }

  private loadBranchContext(branchId: string): void {
    this.branchService
      .getDetailView(branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branch) => {
          const branchItem: BranchDropdownResponse = {
            key: branch.name,
            value: branch.id,
            libraries: [],
          };
          const institutionItem: InstitutionDropdownResponse = {
            key: branch.institutionName,
            value: branch.institutionId,
            branches: [branchItem],
          };

          this.institutions.set([institutionItem]);
          this.librariesForm.controls.institutionId.setValue(branch.institutionId);
          this.disabledInstitutionSelect.set(true);
          this.librariesForm.get('institutionId')?.disable();

          this.branches.set([branchItem]);
          this.librariesForm.controls.branchId.setValue(branch.id);
          this.disabledBranchSelect.set(true);
          this.librariesForm.get('branchId')?.disable();
        },
        error: () => {
          this.toast.error('Unable to load branch details.');
          this.router.navigate(['/branches']);
        },
      });
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
    this.institutionsService
      .getById(preferredId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (institution) => {
          this.applyInstitutionSelection(
            [{ key: institution.name, value: institution.id, branches: [] }],
            preferredId,
            lockSelection,
          );
        },
        error: () => {
          this.institutions.set([]);
          this.librariesForm.controls.institutionId.setValue(preferredId);
          this.disabledInstitutionSelect.set(lockSelection);
          if (lockSelection) {
            this.librariesForm.get('institutionId')?.disable();
          }
          this.loadBranchesForInstitution(preferredId);
        },
      });
  }

  private applyInstitutionSelection(
    items: InstitutionDropdownResponse[],
    preferredId?: string | null,
    lockSelection = false,
  ): void {
    this.institutions.set(items);

    const selectedId = preferredId ?? (items.length === 1 ? items[0].value : '');
    this.librariesForm.controls.institutionId.setValue(selectedId);
    this.disabledInstitutionSelect.set(lockSelection || items.length <= 1 || this.isOnboarding());

    if (this.disabledInstitutionSelect()) {
      this.librariesForm.get('institutionId')?.disable();
    } else {
      this.librariesForm.get('institutionId')?.enable();
    }

    if (selectedId) {
      this.onInstitutionChange(selectedId);
    }
  }

  private loadBranchesForInstitution(institutionId: string): void {
    this.institutionsService
      .getBranchesView(institutionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (view) => {
          const branchItems = (view?.branches ?? []).map((branch) => ({
            key: branch.name,
            value: branch.id,
            libraries: [],
          }));
          this.applyBranchSelection(branchItems);
        },
        error: () => {
          this.branches.set([]);
          this.librariesForm.controls.branchId.setValue('');
          this.disabledBranchSelect.set(false);
          this.librariesForm.get('branchId')?.enable();
        },
      });
  }

  private applyBranchSelection(branchItems: BranchDropdownResponse[]): void {
    this.branches.set(branchItems);
    this.disabledBranchSelect.set(branchItems.length <= 1 || this.isOnboarding());
    this.librariesForm.controls.branchId.setValue(branchItems.length === 1 ? branchItems[0].value : '');

    if (this.disabledBranchSelect()) {
      this.librariesForm.get('branchId')?.disable();
    } else {
      this.librariesForm.get('branchId')?.enable();
    }
  }
}
