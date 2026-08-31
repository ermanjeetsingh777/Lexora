import { Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MemberDetailResponse, UpdateMemberRequest } from '@core/models/MemberRequest';
import { ToastService } from '@core/services/toast.service';
import { collectRouteParams, memberBackNav } from '@core/utils/entity-routes.util';
import { ButtonComponent } from '@shared/components/button/button.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { concat, last, Observable, of, switchMap } from 'rxjs';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { MemberService } from '../MemberService';

@Component({
  selector: 'app-edit-member-component',
  imports: [ReactiveFormsModule, ButtonComponent, PageHeaderComponent],
  templateUrl: './edit-member-component.html',
  styleUrl: './edit-member-component.css',
  providers: [MemberService],
})
export class EditMemberComponent implements OnInit, OnDestroy {
  private readonly memberService = inject(MemberService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly member = signal<MemberDetailResponse | null>(null);

  readonly photoFile = signal<File | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly aadhaarFile = signal<File | null>(null);
  readonly aadhaarPreview = signal<string | null>(null);
  readonly aadhaarIsPdf = signal(false);

  memberForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    dateOfBirth: [''],
    gender: ['', Validators.required],
    status: ['Active', Validators.required],
    institution: [{ value: '', disabled: true }],
    branch: [{ value: '', disabled: true }],
    library: [{ value: '', disabled: true }],
    shift: [{ value: '', disabled: true }],
    plan: [{ value: '', disabled: true }],
    membershipNo: [{ value: '', disabled: true }],
  });

  get routeParams(): Record<string, string> {
    return collectRouteParams(this.route.snapshot);
  }

  get memberId(): string {
    return this.routeParams['memberId'] ?? '';
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

  get backLink(): string | string[] {
    const nav = memberBackNav(this.routeParams);
    if (this.memberId) {
      if (this.routeParams['libraryId']) {
        return ['/libraries', this.routeParams['libraryId'], 'members', this.memberId];
      }
      if (this.routeParams['branchId'] && this.routeParams['institutionId']) {
        return ['/institutions', this.routeParams['institutionId'], 'branches', this.routeParams['branchId'], 'members', this.memberId];
      }
      if (this.routeParams['branchId']) {
        return ['/branches', this.routeParams['branchId'], 'members', this.memberId];
      }
      if (this.routeParams['institutionId']) {
        return ['/institutions', this.routeParams['institutionId'], 'members', this.memberId];
      }
      return ['/members', this.memberId];
    }
    return nav.link;
  }

  get backLabel(): string {
    return 'Back to member';
  }

  ngOnInit(): void {
    if (!this.memberId) {
      this.loadError.set('Member not found.');
      this.loading.set(false);
      return;
    }

    this.memberService.getMemberById(this.memberId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const member = response.data;
        if (!member) {
          this.loadError.set('Member not found.');
          this.loading.set(false);
          return;
        }

        this.member.set(member);
        const displayEmail = member.email?.endsWith('@member.lexora.local') ? '' : (member.email ?? '');
        this.memberForm.patchValue({
          name: member.name,
          phone: member.phone ?? '',
          email: displayEmail,
          dateOfBirth: this.toDateInputValue(member.dateOfBirth),
          gender: member.gender ?? '',
          status: member.isActive ? 'Active' : 'Inactive',
          institution: member.institution,
          branch: member.branch,
          library: member.library,
          shift: member.shift ?? '—',
          plan: member.plan || 'No plan',
          membershipNo: member.membershipNo ?? '',
        });

        if (member.hasPhoto) {
          this.photoPreview.set(this.memberService.getPhotoUrl(member.id));
        }

        this.loading.set(false);
      },
      error: (error) => {
        this.loadError.set(error?.error?.message ?? 'Unable to load member details.');
        this.loading.set(false);
      },
    });
  }

  private toDateInputValue(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return date.toISOString().slice(0, 10);
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
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);

    this.photoFile.set(file);
    this.photoPreview.set(URL.createObjectURL(file));
  }

  clearPhoto(): void {
    const previous = this.photoPreview();
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
    this.photoFile.set(null);
    const member = this.member();
    this.photoPreview.set(member?.hasPhoto ? this.memberService.getPhotoUrl(member.id) : null);
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
    const photo = this.photoPreview();
    if (photo?.startsWith('blob:')) URL.revokeObjectURL(photo);
    const aadhaar = this.aadhaarPreview();
    if (aadhaar) URL.revokeObjectURL(aadhaar);
  }

  cancel(): void {
    this.router.navigate(Array.isArray(this.backLink) ? this.backLink : [this.backLink]);
  }

  onSubmit(): void {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }

    const member = this.member();
    if (!member) return;

    const formValue = this.memberForm.getRawValue();
    const request: UpdateMemberRequest = {};

    const currentEmail = member.email?.endsWith('@member.lexora.local') ? '' : (member.email ?? '');
    const newEmail = formValue.email?.trim() ?? '';

    if (formValue.name !== member.name) request.fullName = formValue.name;
    if (newEmail !== currentEmail) request.email = newEmail;
    if (formValue.phone !== (member.phone ?? '')) request.phoneNumber = formValue.phone;

    const dobInput = formValue.dateOfBirth;
    const originalDob = this.toDateInputValue(member.dateOfBirth);
    if (dobInput && dobInput !== originalDob) request.dateOfBirth = dobInput;

    if (formValue.gender !== (member.gender ?? '')) request.gender = formValue.gender;

    const nextStatus = formValue.status;
    const currentStatus = member.isActive ? 'Active' : 'Inactive';
    if (nextStatus !== currentStatus) request.status = nextStatus;

    const photo = this.photoFile();
    const aadhaar = this.aadhaarFile();
    const hasProfileChanges = Object.keys(request).length > 0;

    if (!hasProfileChanges && !photo && !aadhaar) {
      this.toast.error('No changes to save.');
      return;
    }

    this.saving.set(true);

    const saveProfile$ = hasProfileChanges
      ? this.memberService.updateMember(member.id, request)
      : of({ data: member } as APIResponseModel<MemberDetailResponse>);

    saveProfile$.pipe(
      switchMap((response) => {
        const uploads: Observable<APIResponseModel<MemberDetailResponse>>[] = [];
        if (photo) uploads.push(this.memberService.uploadPhoto(member.id, photo));
        if (aadhaar) uploads.push(this.memberService.uploadAadhaar(member.id, aadhaar));
        if (uploads.length === 0) return of(response);
        return concat(...uploads, of(response)).pipe(last());
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.toast.success('Member updated successfully.');
        this.cancel();
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(error?.error?.message || 'Unable to update member. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
