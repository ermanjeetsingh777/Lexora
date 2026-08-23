import { Component, DestroyRef, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BranchDropdownResponse, InstitutionDropdownResponse, LibraryDropdownResponse, PlanResponse } from '@core/models/institution-dropdown.model';
import { BulkMemberUploadResponse, BulkMemberUploadRowResult } from '@core/models/MemberRequest';
import { ToastService } from '@core/services/toast.service';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { LucideFileSpreadsheet, LucideFileText, LucideLoaderCircle, LucideUpload } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { MemberService } from '../MemberService';
import { downloadMemberBulkTemplatePdf } from '../member-bulk-template-export.util';
import { parseMemberBulkExcel, toCreateMemberShift, validateBulkMemberRow } from '../member-bulk-upload.util';

@Component({
  selector: 'app-bulk-upload-members-component',
  imports: [FormsModule, ReactiveFormsModule, ButtonComponent, PageHeaderComponent, GlassCardComponent, LucideFileSpreadsheet, LucideFileText, LucideLoaderCircle, LucideUpload],
  templateUrl: './bulk-upload-members-component.html',
  styleUrl: './bulk-upload-members-component.css',
  providers: [InstitutionsService, MemberService],
})
export class BulkUploadMembersComponent implements OnInit {
  private readonly institutionsService = inject(InstitutionsService);
  private readonly memberService = inject(MemberService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  scopeForm = this.fb.nonNullable.group({
    institutionId: ['', Validators.required],
    branchId: ['', Validators.required],
    libraryId: ['', Validators.required],
  });

  readonly institutions: WritableSignal<InstitutionDropdownResponse[]> = signal([]);
  readonly branches: WritableSignal<BranchDropdownResponse[]> = signal([]);
  readonly libraries: WritableSignal<LibraryDropdownResponse[]> = signal([]);

  readonly selectedFile = signal<File | null>(null);
  readonly downloadingTemplate = signal(false);
  readonly downloadingPdfTemplate = signal(false);
  readonly uploading = signal(false);
  readonly uploadResult = signal<BulkMemberUploadResponse | null>(null);
  readonly uploadProgress = signal<{
    total: number;
    processed: number;
    success: number;
    failed: number;
    currentLabel: string;
  } | null>(null);

  readonly progressPercent = computed(() => {
    const progress = this.uploadProgress();
    if (!progress || progress.total <= 0) return 0;
    return Math.round((progress.processed / progress.total) * 100);
  });

  ngOnInit(): void {
    this.institutionsService.getInstitutionBranchForDropdown().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response?.data) {
          this.institutions.set(response.data);
          this.scopeForm.get('branchId')?.disable();
          this.scopeForm.get('libraryId')?.disable();
        }
      },
      error: () => this.institutions.set([]),
    });
  }

  get f() {
    return this.scopeForm.controls;
  }

  onInstitutionChange(): void {
    const institutionId = this.f.institutionId.value;
    this.libraries.set([]);
    this.f.branchId.reset();
    this.f.libraryId.reset();
    this.loadBranchesForInstitution(institutionId);
    this.scopeForm.get('branchId')?.enable();
    this.scopeForm.get('libraryId')?.disable();
    this.clearUploadState();
  }

  onBranchChange(): void {
    const branchId = this.f.branchId.value;
    this.f.libraryId.reset();
    this.libraries.set([]);
    this.loadLibrariesForBranch(branchId);
    this.scopeForm.get('libraryId')?.enable();
    this.clearUploadState();
  }

  onLibraryChange(): void {
    this.clearUploadState();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.toast.error('Please select an .xlsx Excel file.');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('File must be 5 MB or smaller.');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
    this.uploadResult.set(null);
  }

  downloadTemplate(): void {
    if (this.scopeForm.invalid) {
      this.scopeForm.markAllAsTouched();
      this.toast.error('Select institution, branch, and library first.');
      return;
    }

    const { institutionId, branchId, libraryId } = this.scopeForm.getRawValue();
    this.downloadingTemplate.set(true);

    this.memberService.downloadBulkTemplate(institutionId, branchId, libraryId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (blob) => {
        this.saveBlob(blob, 'member-bulk-upload-template.xlsx');
        this.toast.success('Excel template downloaded.');
        this.downloadingTemplate.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Could not download template.');
        this.downloadingTemplate.set(false);
      },
    });
  }

  downloadPdfTemplate(): void {
    if (this.scopeForm.invalid) {
      this.scopeForm.markAllAsTouched();
      this.toast.error('Select institution, branch, and library first.');
      return;
    }

    const ctx = this.getScopeContext();
    this.downloadingPdfTemplate.set(true);

    this.memberService.getLibraryPlan(ctx.institutionId, ctx.branchId, ctx.libraryId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (response) => {
        downloadMemberBulkTemplatePdf(
          {
            institutionName: ctx.institutionName,
            branchName: ctx.branchName,
            libraryName: ctx.libraryName,
          },
          response.data ?? [],
        );
        this.toast.success('PDF template downloaded.');
        this.downloadingPdfTemplate.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Could not download PDF template.');
        this.downloadingPdfTemplate.set(false);
      },
    });
  }

  async uploadFile(): Promise<void> {
    if (this.scopeForm.invalid) {
      this.scopeForm.markAllAsTouched();
      return;
    }

    const file = this.selectedFile();
    if (!file) {
      this.toast.error('Please select an Excel file to upload.');
      return;
    }

    const { institutionId, branchId, libraryId } = this.scopeForm.getRawValue();
    this.uploading.set(true);
    this.uploadResult.set(null);
    this.uploadProgress.set({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      currentLabel: 'Reading Excel file…',
    });

    try {
      const rows = await parseMemberBulkExcel(file);
      if (rows.length === 0) {
        throw new Error('No member rows found in the uploaded file.');
      }

      const plansResponse = await firstValueFrom(
        this.memberService.getLibraryPlan(institutionId, branchId, libraryId),
      );
      const plans = plansResponse.data ?? [];
      const planByName = new Map<string, PlanResponse>(
        plans.map((plan) => [plan.name.trim().toLowerCase(), plan]),
      );

      const results: BulkMemberUploadRowResult[] = [];
      const seenEmails = new Set<string>();
      let successCount = 0;
      let failedCount = 0;

      this.uploadProgress.set({
        total: rows.length,
        processed: 0,
        success: 0,
        failed: 0,
        currentLabel: 'Starting upload…',
      });

      for (const row of rows) {
        const currentLabel = row.email.trim() || row.fullName.trim() || `Row ${row.rowNumber}`;
        this.uploadProgress.update((progress) => ({
          ...progress!,
          currentLabel,
        }));

        const validationError = validateBulkMemberRow(row, planByName, seenEmails);
        if (validationError) {
          failedCount++;
          results.push({
            rowNumber: row.rowNumber,
            fullName: row.fullName,
            email: row.email,
            success: false,
            message: validationError,
          });
        } else {
          seenEmails.add(row.email.trim().toLowerCase());
          const plan = planByName.get(row.planName.trim().toLowerCase())!;

          try {
            const response = await firstValueFrom(
              this.memberService.createMember(institutionId, branchId, libraryId, {
                fullName: row.fullName.trim(),
                email: row.email.trim(),
                phoneNumber: row.phoneNumber.trim(),
                dateOfBirth: row.dateOfBirth,
                gender: row.gender.trim(),
                shift: toCreateMemberShift(row.shift),
                planId: plan.id,
              }),
            );

            successCount++;
            results.push({
              rowNumber: row.rowNumber,
              fullName: row.fullName,
              email: row.email.trim(),
              success: true,
              message: 'Member created successfully.',
              memberId: response.data?.id,
            });
          } catch (error: unknown) {
            failedCount++;
            const message = (error as { error?: { message?: string } })?.error?.message ?? 'Unable to create member.';
            results.push({
              rowNumber: row.rowNumber,
              fullName: row.fullName,
              email: row.email.trim(),
              success: false,
              message,
            });
          }
        }

        const processed = successCount + failedCount;
        this.uploadProgress.set({
          total: rows.length,
          processed,
          success: successCount,
          failed: failedCount,
          currentLabel: processed < rows.length ? 'Processing next row…' : 'Completed',
        });
        this.uploadResult.set({
          totalRows: rows.length,
          successCount,
          failedCount,
          results: [...results],
        });
      }

      if (failedCount === 0) {
        this.toast.success(`${successCount} member(s) created successfully.`);
      } else {
        this.toast.error(`${successCount} created, ${failedCount} failed. Review details below.`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Bulk upload failed.';
      this.toast.error(message);
    } finally {
      this.uploading.set(false);
      this.uploadProgress.set(null);
    }
  }

  cancel(): void {
    this.router.navigate(['/members']);
  }

  private loadBranchesForInstitution(institutionId: string): void {
    const institution = this.institutions().find((i) => i.value === institutionId);
    this.branches.set(institution?.branches ?? []);
  }

  private loadLibrariesForBranch(branchId: string): void {
    const branch = this.branches().find((b) => b.value === branchId);
    this.libraries.set(branch?.libraries ?? []);
  }

  private getScopeContext() {
    const { institutionId, branchId, libraryId } = this.scopeForm.getRawValue();
    const institution = this.institutions().find((i) => i.value === institutionId);
    const branch = this.branches().find((b) => b.value === branchId);
    const library = this.libraries().find((l) => l.value === libraryId);

    return {
      institutionId,
      branchId,
      libraryId,
      institutionName: institution?.key ?? '',
      branchName: branch?.key ?? '',
      libraryName: library?.key ?? '',
    };
  }

  private clearUploadState(): void {
    this.selectedFile.set(null);
    this.uploadResult.set(null);
    this.uploadProgress.set(null);
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
