import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideCheckCircle2, LucideLogIn, LucideLogOut, LucideQrCode,
  LucideScanLine, LucideSearch, LucideXCircle,
} from '@lucide/angular';
import { AttendanceScannerService } from '@core/services/attendance-scanner.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import {
  ScannerContext,
  ScannerMemberOption,
  ScannerMemberStatus,
} from '@core/models/attendanceModels';

@Component({
  selector: 'app-attendance-scanner',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent, GlassCardComponent, ButtonComponent, StatusBadgeComponent,
    LucideScanLine, LucideQrCode, LucideSearch, LucideLogIn, LucideLogOut,
    LucideCheckCircle2, LucideXCircle,
  ],
  templateUrl: './attendance-scanner.component.html',
  styleUrl: './attendance-scanner.component.css',
})
export class AttendanceScannerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly scanner = inject(AttendanceScannerService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly context = signal<ScannerContext | null>(null);
  readonly tokenInput = signal('');
  readonly memberSearch = signal('');
  readonly members = signal<ScannerMemberOption[]>([]);
  readonly memberPickerOpen = signal(false);
  readonly selectedMember = signal<ScannerMemberOption | null>(null);
  readonly memberStatus = signal<ScannerMemberStatus | null>(null);
  readonly qrImage = signal<string | null>(null);
  readonly lastMessage = signal<string | null>(null);

  readonly canCheckIn = computed(() => {
    const s = this.memberStatus();
    return s?.suggestedAction === 'check-in';
  });

  readonly canCheckOut = computed(() => {
    const s = this.memberStatus();
    return s?.suggestedAction === 'check-out';
  });

  readonly isDone = computed(() => this.memberStatus()?.suggestedAction === 'done');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.tokenInput.set(token);
      this.loadContext(token);
    } else {
      this.loading.set(false);
    }
  }

  loadContext(token?: string): void {
    const value = (token ?? this.tokenInput()).trim();
    if (!value) {
      this.toast.error('Enter or scan a library QR token');
      return;
    }

    this.loading.set(true);
    this.scanner.getContext(value).subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.tokenInput.set(ctx.token);
        this.loading.set(false);
        this.loadQr(ctx.libraryId);
        this.searchMembers();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Invalid attendance QR code');
      },
    });
  }

  searchMembers(): void {
    const token = this.context()?.token;
    if (!token) return;

    this.scanner.searchMembers(token, this.memberSearch()).subscribe({
      next: (list) => this.members.set(list),
    });
  }

  openMemberPicker(): void {
    this.memberPickerOpen.set(true);
    this.searchMembers();
  }

  selectMember(member: ScannerMemberOption): void {
    this.selectedMember.set(member);
    this.memberSearch.set(`${member.membershipNo} — ${member.fullName}`);
    this.memberPickerOpen.set(false);
    this.loadMemberStatus(member.id);
  }

  clearMember(): void {
    this.selectedMember.set(null);
    this.memberStatus.set(null);
    this.memberSearch.set('');
    this.lastMessage.set(null);
  }

  record(action: 'check-in' | 'check-out' | 'auto'): void {
    const ctx = this.context();
    const member = this.selectedMember();
    if (!ctx || !member) {
      this.toast.error('Select a library and member first');
      return;
    }

    this.busy.set(true);
    this.scanner.record({
      libraryToken: ctx.token,
      memberId: member.id,
      action,
    }).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.lastMessage.set(result.message);
        this.toast.success(result.message);
        this.loadMemberStatus(member.id);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err?.error?.message ?? 'Attendance action failed');
      },
    });
  }

  private loadMemberStatus(memberId: string): void {
    const token = this.context()?.token;
    if (!token) return;

    this.scanner.getMemberStatus(token, memberId).subscribe({
      next: (status) => this.memberStatus.set(status),
    });
  }

  private loadQr(libraryId: string): void {
    this.scanner.getLibraryQr(libraryId).subscribe({
      next: (qr) => this.qrImage.set(qr.qrCodeBase64),
      error: () => this.qrImage.set(null),
    });
  }
}
