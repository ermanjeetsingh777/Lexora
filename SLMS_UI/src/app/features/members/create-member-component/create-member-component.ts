import { Component, DestroyRef, inject, input, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Shift } from '@core/constType';
import { BranchDropdownResponse, InstitutionDropdownResponse, KeyValueResponse, LibraryDropdownResponse } from '@core/models/institution-dropdown.model';
import { ToastService } from '@core/services/toast.service';
import { BranchService } from '@features/branches/branch.service';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { LibraryService } from '@features/libraries/library.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { MemberService } from '../MemberService';
import { switchMap, of, concat, last, Observable } from 'rxjs';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { CreateMemberRequest, MemberDetailResponse } from '@core/models/MemberRequest';
import { CommonService } from '@core/services/common.service';
import { collectRouteParams, memberCreateBackNav } from '@core/utils/entity-routes.util';

@Component({
  selector: 'app-create-member-component',
  imports: [FormsModule, ButtonComponent, PageHeaderComponent, GlassCardComponent, ReactiveFormsModule],
  templateUrl: './create-member-component.html',
  styleUrl: './create-member-component.css',
  providers: [InstitutionsService, MemberService],
})
export class CreateMemberComponent implements OnInit, OnDestroy {
  private readonly institutionsService = inject(InstitutionsService);
  private readonly memberService = inject(MemberService);
  private readonly branchService = inject(BranchService);
  private readonly libraryService = inject(LibraryService);
  readonly commonService = inject(CommonService);
  private destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  private scopeInstitutionId: string | null = null;
  private scopeBranchId: string | null = null;
  private scopeLibraryId: string | null = null;
  private scopeApplied = false;
  private dropdownReady = false;

  readonly lockedInstitution = signal(false);
  readonly lockedBranch = signal(false);
  readonly lockedLibrary = signal(false);

  showPageHeader = input(true, {
    transform: (value: boolean | undefined) => value ?? true,
  });

  memberForm = this.fb.nonNullable.group({
    institutionId: ['', Validators.required],
    branchId: ['', Validators.required],
    libraryId: ['', Validators.required],
    shift: this.fb.control<Shift>('General', Validators.required),
    planId: ['', Validators.required],
    membershipNo: ['', [Validators.maxLength(40), Validators.pattern(/^$|^[A-Za-z0-9][A-Za-z0-9._\-]*$/)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    dateOfBirth: [null as Date | null],
    gender: ['', Validators.required],
  });

  get f() {
    return this.memberForm.controls;
  }

  readonly busy = signal(false);
  readonly photoFile = signal<File | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly aadhaarFile = signal<File | null>(null);
  readonly aadhaarPreview = signal<string | null>(null);
  readonly aadhaarIsPdf = signal(false);

  institutions: WritableSignal<InstitutionDropdownResponse[]> = signal([]);
  branches: WritableSignal<BranchDropdownResponse[]> = signal([]);
  libraries: WritableSignal<LibraryDropdownResponse[]> = signal([]);
  plans: WritableSignal<KeyValueResponse[]> = signal([]);
  loader = signal(false);

  get routeParams(): Record<string, string> {
    return collectRouteParams(this.route.snapshot);
  }

  get fromLibraryDetail(): boolean {
    return !!this.routeParams['libraryId'];
  }

  get fromBranchDetail(): boolean {
    return !!this.routeParams['branchId'] && !this.routeParams['libraryId'];
  }

  get fromInstitutionDetail(): boolean {
    return !!this.routeParams['institutionId'] && !this.routeParams['branchId'] && !this.routeParams['libraryId'];
  }

  get fromMembersList(): boolean {
    return !this.fromLibraryDetail && !this.fromBranchDetail && !this.fromInstitutionDetail;
  }

  get backLink(): string | string[] {
    return memberCreateBackNav(this.routeParams).link;
  }

  get backQueryParams(): { tab: string } | undefined {
    return memberCreateBackNav(this.routeParams).queryParams;
  }

  get backLabel(): string {
    return memberCreateBackNav(this.routeParams).label;
  }

  ngOnInit(): void {
    this.institutionsService.getInstitutionBranchForDropdown().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response?.data) {
          this.institutions.set(response.data);
          this.memberForm.get('branchId')?.disable();
          this.memberForm.get('libraryId')?.disable();
          this.memberForm.get('planId')?.disable();
          this.dropdownReady = true;
          this.initRouteScope();
        }
      },
      error: () => {
        this.institutions.set([]);
      },
    });
  }

  private initRouteScope(): void {
    const params = this.routeParams;

    if (params['libraryId']) {
      this.scopeLibraryId = params['libraryId'];
      this.lockedLibrary.set(true);

      if (params['institutionId'] && params['branchId']) {
        this.scopeInstitutionId = params['institutionId'];
        this.scopeBranchId = params['branchId'];
        this.lockedInstitution.set(true);
        this.lockedBranch.set(true);
        this.applyScopeSelection();
        return;
      }

      this.libraryService.getDetailView(params['libraryId']).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (library) => {
          this.scopeInstitutionId = library.institutionId;
          this.scopeBranchId = library.branchId;
          this.lockedInstitution.set(true);
          this.lockedBranch.set(true);
          this.applyScopeSelection();
        },
        error: () => this.toast.error('Unable to load library context.'),
      });
      return;
    }

    if (params['branchId']) {
      this.scopeBranchId = params['branchId'];
      this.lockedBranch.set(true);

      if (params['institutionId']) {
        this.scopeInstitutionId = params['institutionId'];
        this.lockedInstitution.set(true);
        this.applyScopeSelection();
        return;
      }

      this.branchService.getDetailView(params['branchId']).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (branch) => {
          this.scopeInstitutionId = branch.institutionId;
          this.lockedInstitution.set(true);
          this.applyScopeSelection();
        },
        error: () => this.toast.error('Unable to load branch context.'),
      });
      return;
    }

    if (params['institutionId']) {
      this.scopeInstitutionId = params['institutionId'];
      this.lockedInstitution.set(true);
      this.applyScopeSelection();
    }
  }

  private applyScopeSelection(): void {
    if (this.scopeApplied || !this.dropdownReady || !this.scopeInstitutionId) return;

    const institution = this.institutions().find((i) => i.value === this.scopeInstitutionId);
    if (!institution) return;

    this.f.institutionId.setValue(this.scopeInstitutionId);
    this.loadBranchesForInstitution(this.scopeInstitutionId);

    if (this.scopeBranchId) {
      const branch = this.branches().find((b) => b.value === this.scopeBranchId);
      if (!branch) return;

      this.f.branchId.setValue(this.scopeBranchId);
      this.loadLibrariesForBranch(this.scopeBranchId);

      if (this.scopeLibraryId) {
        const library = this.libraries().find((l) => l.value === this.scopeLibraryId);
        if (!library) return;

        this.f.libraryId.setValue(this.scopeLibraryId);
        this.loadPlansForLibrary(this.scopeLibraryId);
        this.memberForm.get('planId')?.enable();
      } else {
        this.memberForm.get('libraryId')?.enable();
      }
    } else {
      this.memberForm.get('branchId')?.enable();
    }

    if (this.lockedInstitution()) {
      this.memberForm.get('institutionId')?.disable();
    }
    if (this.lockedBranch()) {
      this.memberForm.get('branchId')?.disable();
    }
    if (this.lockedLibrary()) {
      this.memberForm.get('libraryId')?.disable();
    }

    this.scopeApplied = true;
  }

  private loadBranchesForInstitution(institutionId: string): void {
    const institution = this.institutions().find((i) => i.value === institutionId);
    this.branches.set(institution?.branches ?? []);
  }

  private loadLibrariesForBranch(branchId: string): void {
    const branch = this.branches().find((b) => b.value === branchId);
    this.libraries.set(branch?.libraries ?? []);
  }

  private loadPlansForLibrary(libraryId: string): void {
    const library = this.libraries().find((l) => l.value === libraryId);
    this.plans.set(library?.plans ?? []);
  }

  onInstitutionChange(): void {
    const institutionId = this.f.institutionId.value;
    this.libraries.set([]);
    this.plans.set([]);
    this.f.branchId.reset();
    this.f.libraryId.reset();
    this.f.planId.reset();
    this.loadBranchesForInstitution(institutionId);
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
    this.loadLibrariesForBranch(branchId);
    this.memberForm.get('libraryId')?.enable();
    this.memberForm.get('planId')?.disable();
  }

  onlibrariesChange(): void {
    const libraryId = this.f.libraryId.value;
    this.f.planId.reset();
    this.loadPlansForLibrary(libraryId);
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

  onAadhaarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      this.toast.error('Please select a JPG, PNG, WEBP, or PDF file.');
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Aadhaar document must be 10 MB or smaller.');
      input.value = '';
      return;
    }

    const previous = this.aadhaarPreview();
    if (previous) URL.revokeObjectURL(previous);

    this.aadhaarFile.set(file);
    this.aadhaarIsPdf.set(isPdf);
    this.aadhaarPreview.set(isPdf ? null : URL.createObjectURL(file));
  }

  clearAadhaar(): void {
    const previous = this.aadhaarPreview();
    if (previous) URL.revokeObjectURL(previous);
    this.aadhaarFile.set(null);
    this.aadhaarPreview.set(null);
    this.aadhaarIsPdf.set(false);
  }

  ngOnDestroy(): void {
    const previous = this.photoPreview();
    if (previous) URL.revokeObjectURL(previous);
    const aadhaarPrevious = this.aadhaarPreview();
    if (aadhaarPrevious) URL.revokeObjectURL(aadhaarPrevious);
  }

  private navigateBack(): void {
    const link = this.backLink;
    this.router.navigate(Array.isArray(link) ? link : [link], {
      queryParams: this.backQueryParams,
    });
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
      email: formValue.email?.trim() ? formValue.email.trim() : undefined,
      phoneNumber: formValue.phone?.trim() ?? '',
      dateOfBirth: formValue.dateOfBirth,
      gender: formValue.gender,
      planId: formValue.planId,
      shift: formValue.shift,
      membershipNo: formValue.membershipNo?.trim() ? formValue.membershipNo.trim() : undefined,
    };

    this.memberService.createMember(formValue.institutionId, formValue.branchId, formValue.libraryId, request).pipe(
      switchMap((response) => {
        const memberId = response.data?.id;
        const photo = this.photoFile();
        const aadhaar = this.aadhaarFile();
        if (!memberId) return of(response);

        const uploads: Observable<APIResponseModel<MemberDetailResponse>>[] = [];
        if (photo) uploads.push(this.memberService.uploadPhoto(memberId, photo));
        if (aadhaar) uploads.push(this.memberService.uploadAadhaar(memberId, aadhaar));
        if (uploads.length === 0) return of(response);

        return concat(...uploads, of(response)).pipe(last());
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.toast.success('Member created successfully.');
        this.navigateBack();
        this.loader.set(false);
      },
      error: (error) => {
        const message = error?.error?.message;
        if (message?.toLowerCase().includes('photo') || message?.toLowerCase().includes('aadhaar')) {
          this.toast.error(message);
        } else {
          this.toast.error(message || 'Unable to create member. Please try again.');
        }
        this.loader.set(false);
      },
    });
  }

  cancel(): void {
    this.memberForm.reset({ shift: 'General' });
    this.navigateBack();
  }
}
