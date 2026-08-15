import { Component, DestroyRef, inject, input, OnDestroy, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Shift } from '@core/constType';
import { BranchDropdownResponse, InstitutionDropdownResponse, KeyValueResponse, LibraryDropdownResponse } from '@core/models/institution-dropdown.model';
import { ToastService } from '@core/services/toast.service';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { MemberService } from '../MemberService';
import { CreateMemberRequest } from '@core/models/MemberRequest';
import { CommonService } from '@core/services/common.service';
import { switchMap, of } from 'rxjs';



@Component({
  selector: 'app-create-member-component',
  imports: [FormsModule, ButtonComponent, PageHeaderComponent, GlassCardComponent, ReactiveFormsModule],
  templateUrl: './create-member-component.html',
  styleUrl: './create-member-component.css',
  providers: [InstitutionsService, MemberService]
})
export class CreateMemberComponent implements OnDestroy {
  private readonly institutionsService = inject(InstitutionsService);
  private readonly memberService = inject(MemberService);
  readonly commonService = inject(CommonService);
  private destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  showPageHeader = input(true, {
    transform: (value: boolean | undefined) => value ?? true
  });

  memberForm = this.fb.nonNullable.group({
    institutionId: ['', Validators.required],
    branchId: ['', Validators.required],
    libraryId: ['', Validators.required],
    shift: this.fb.control<Shift>('General', Validators.required),
    planId: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.pattern(/^[6-9]\d{9}$/), Validators.required]],
    email: ['', [Validators.email, Validators.maxLength(150), Validators.required]],
    dateOfBirth: [null as Date | null, Validators.required],
    gender: ['', Validators.required]
  });

  get f() {
    return this.memberForm.controls;
  }
  readonly busy = signal(false);
  readonly photoFile = signal<File | null>(null);
  readonly photoPreview = signal<string | null>(null);

  institutions: WritableSignal<InstitutionDropdownResponse[]> = signal([]);
  branches: WritableSignal<BranchDropdownResponse[]> = signal([]);
  libraries: WritableSignal<LibraryDropdownResponse[]> = signal([]);
  plans: WritableSignal<KeyValueResponse[]> = signal([]);
  loader = signal(false);

  ngOnInit() {
    this.institutionsService.getInstitutionBranchForDropdown().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.institutions.set(response.data);
          this.memberForm.get('branchId')?.disable();
          this.memberForm.get('libraryId')?.disable();
         this.memberForm.get('planId')?.disable();
        }
      },
      error: (error) => {
        this.institutions.set([]);
      }
    });
  }

  onInstitutionChange(): void {
    const institutionId = this.f.institutionId.value;
    const branches = this.institutions().filter((b) => b.value === institutionId)[0].branches;
    this.branches.set(branches);
    this.libraries.set([]);
    this.plans.set([]);
    this.f.branchId.reset();
    this.f.libraryId.reset();
    this.f.planId.reset();
    this.memberForm.get('branchId')?.enable();
    this.memberForm.get('libraryId')?.disable();
    this.memberForm.get('planId')?.disable();
  }

  onBranchChange(): void {
    const branchId = this.f.branchId.value;

    this.f.libraryId.reset();
    this.f.planId.reset();
    this.libraries.set([]);
    this.plans.set([]);
    // Simulate libraries per branch
    const branch = this.branches().find((b) => b.value === branchId);
    if (branch) {
      this.libraries.set(this.branches().filter((b) => b.value === branchId)[0].libraries);
    }
    this.memberForm.get('libraryId')?.enable();
    this.memberForm.get('planId')?.disable();
  }

  onlibrariesChange(): void {
    const libraryId = this.f.libraryId.value;
    this.f.planId.reset();
    // Simulate libraries per branch
    const library = this.libraries().find((b) => b.value === libraryId);
    if (library) {
      this.plans.set(this.libraries().filter((b) => b.value === libraryId)[0].plans);
    }
    this.memberForm.get('planId')?.enable();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error('Please select an image file (JPG, PNG, or WEBP).');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Photo must be 5 MB or smaller.');
      input.value = '';
      return;
    }

    const previous = this.photoPreview();
    if (previous) URL.revokeObjectURL(previous);

    this.photoFile.set(file);
    this.photoPreview.set(URL.createObjectURL(file));
  }

  clearPhoto(): void {
    const previous = this.photoPreview();
    if (previous) URL.revokeObjectURL(previous);
    this.photoFile.set(null);
    this.photoPreview.set(null);
  }

  ngOnDestroy(): void {
    const previous = this.photoPreview();
    if (previous) URL.revokeObjectURL(previous);
  }

  async onSubmit(): Promise<void> {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }

    const formValue = this.memberForm.getRawValue();
    this.loader.set(true);
    const request: CreateMemberRequest = {
      fullName: formValue.name,
      email: formValue.email,
      phoneNumber: formValue.phone,
      dateOfBirth: formValue.dateOfBirth,
      gender: formValue.gender,
      planId: formValue.planId,
      shift: formValue.shift,
    }

    this.memberService.createMember(formValue.institutionId, formValue.branchId, formValue.libraryId, request).pipe(
      switchMap((response) => {
        const memberId = response.data?.id;
        const photo = this.photoFile();
        if (memberId && photo) {
          return this.memberService.uploadPhoto(memberId, photo).pipe(
            switchMap(() => of(response)),
          );
        }
        return of(response);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.toast.success('Member created successfully.');
        this.router.navigate(['/members']);
        this.loader.set(false);
      },
      error: (error) => {
        const message = error?.error?.message;
        if (message?.toLowerCase().includes('photo')) {
          this.toast.error(message);
        } else {
          this.toast.error(message || 'Unable to create member. Please try again.');
        }
        this.loader.set(false);
      }
    });

  }

  cancel(): void {
    this.memberForm.reset();
    this.router.navigate(['/members']);
  }
}
