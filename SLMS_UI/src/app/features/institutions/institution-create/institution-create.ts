import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppIconComponent } from "@shared/components/app-icon/app-icon.component";
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Institution } from '@core/constants/lovable-mock.data';
import { InstitutionsService } from '../institutions.service';
import { OnboardingStepKey } from '../institution-onboarding-stepper.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { CreateInstitutionRequest } from '@core/models/CreateInstitutionRequest';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '@core/services/toast.service';
import { CommonService } from '@core/services/common.service';
import { StorageService } from '@core/services/storage.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { InstitutionStatus, OnboardingSteps } from '@core/enums/OnbardingSteps';

type CreateTabKey = 'profile' | 'branch' | 'activation';

@Component({
  selector: 'app-institution-create',
  imports: [AppIconComponent, CommonModule, FormsModule, PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './institution-create.html',
  styleUrl: './institution-create.css',
  providers: [InstitutionsService]
})
export class InstitutionCreate implements OnInit {
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  private readonly institutionsService = inject(InstitutionsService);
  private readonly organizationEntitlements = inject(OrganizationEntitlementService);
  private readonly fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly commonService = inject(CommonService);
  private readonly storageService = inject(StorageService);

  showPageHeader = input(true, {
    transform: (value: boolean | undefined) => value ?? true
  });

  isOnboarding = input(false, {
    transform: (value: boolean | undefined) => value ?? false
  });

  readonly loader = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    type: ['University' as CreateInstitutionRequest['type'], Validators.required],
    city: ['', [Validators.required, Validators.minLength(2)]],
    country: ['India', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]]
  });

  ngOnInit(): void {
    if (this.isOnboarding()) {
      return;
    }

    this.organizationEntitlements.load().subscribe((entitlements) => {
      if (!entitlements?.canCreateInstitution) {
        this.toast.error('Your package does not allow creating institutions. Upgrade to Premium.');
        void this.router.navigate(['/institutions']);
      }
    });
  }

  createAndContinue() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loader.set(true);
    const model = this.form.getRawValue();
    const newInstitution: CreateInstitutionRequest = {
      name: model.name.trim(),
      type: model.type,
      city: model.city.trim(),
      country: model.country.trim(),
      email: model.email,
      phone: model.phone,
      isActive: true,
      isPrimary: this.isOnboarding(),
      isOnboarding: this.isOnboarding(),
      status : InstitutionStatus.Active
    }

    this.institutionsService.createInstitution(newInstitution).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.organizationEntitlements.refresh().subscribe();
        this.toast.success(this.commonService.onboardingMessages.institutionCreated);
        this.router.navigate([this.isOnboarding() ? '/onboarding/branch' : '/institutions']);
        if (this.isOnboarding()) {
          const loggedInUser = this.storageService.user();
          if (loggedInUser) {
            loggedInUser.onboardingStep = OnboardingSteps.Institute;
            this.storageService.setUser(loggedInUser);
          }
        }
        this.loader.set(false);
      },
      error: (error) => {
        this.toast.error(error.error.message || 'Unable to sign in. Please try again.');
        this.loader.set(false);
      }
    });

  }

  inst: Institution = this.institutionsService.institutionById(this.route.snapshot.params['institutionId']);


  completedKeys(): OnboardingStepKey[] {
    // until full model expansion exists, map by status as a simple proxy
    const s = this.inst.status;
    if (s === 'Active') {
      return ['register', 'profile', 'branding', 'contacts', 'licenses', 'subscription', 'customization', 'emailTemplates'];
    }
    if (s === 'Pending') {
      return ['register', 'profile', 'contacts'];
    }
    return ['register'];
  }

  cancel(): void {
    this.router.navigate(['/institutions']);
  }

  save(): void {
    const id = this.route.snapshot.params['institutionId'];
    this.institutionsService.patchInstitutionLocal(id, {
      name: this.inst.name,
      city: this.inst.city,
      country: this.inst.country,
      status: this.inst.status,
    });
    this.router.navigate(['/institutions']);
  }

  deactivate(): void {
    const id = this.route.snapshot.params['institutionId'];
    this.institutionsService.deactivateInstitution(id);
    this.router.navigate(['/institutions']);
  }
}
