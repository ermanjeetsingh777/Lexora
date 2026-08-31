import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideCheckCircle2, LucideDownload, LucideLogIn, LucideLogOut, LucideQrCode,
  LucideScanLine, LucideSearch, LucideXCircle,
} from '@lucide/angular';
import { AttendanceScannerService } from '@core/services/attendance-scanner.service';
import { AuthService } from '@core/services/auth.service';
import { KioskDeviceService } from '@core/services/kiosk-device.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import {
  ScannerContext,
  ScannerMemberOption,
  ScannerMemberStatus,
  AttendanceSeatOption,
} from '@core/models/attendanceModels';
import { AttendanceSeatPickerComponent } from '../components/attendance-seat-picker/attendance-seat-picker.component';
import { formatAttendanceDisplayTime } from '../attendance-format.util';
import { AttendanceFilterService } from '../attendance-filter.service';
import { exportLibraryQrPdf } from '../../libraries/library-qr-pdf.util';

@Component({
  selector: 'app-attendance-scanner',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent, GlassCardComponent, ButtonComponent, StatusBadgeComponent, AttendanceSeatPickerComponent,
    LucideScanLine, LucideQrCode, LucideSearch, LucideLogIn, LucideLogOut,
    LucideCheckCircle2, LucideXCircle, LucideDownload,
  ],
  templateUrl: './attendance-scanner.component.html',
  styleUrl: './attendance-scanner.component.css',
})
export class AttendanceScannerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly scanner = inject(AttendanceScannerService);
  readonly filters = inject(AttendanceFilterService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly device = inject(KioskDeviceService);

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
  readonly librarySeats = signal<AttendanceSeatOption[]>([]);
  readonly seatsLoading = signal(false);
  readonly selectedSeatNumber = signal<string | null>(null);

  readonly isSuperAdmin = computed(() => this.auth.hasRole('SuperAdmin'));
  readonly canCheckIn = computed(() => this.memberStatus()?.suggestedAction === 'check-in');
  readonly canCheckOut = computed(() => this.memberStatus()?.suggestedAction === 'check-out');
  readonly isDone = computed(() => this.memberStatus()?.suggestedAction === 'done');
  readonly formatAttendanceTime = formatAttendanceDisplayTime;

  constructor() {
    effect(() => {
      const libraryId = this.filters.libraryId();
      if (!this.filters.librariesLoaded()) {
        return;
      }
      if (libraryId) {
        this.selectLibrary(libraryId);
      } else if (this.filters.libraries().length === 1) {
        this.selectLibrary(this.filters.libraries()[0].id);
      } else {
        this.resetLibraryContext();
        this.loading.set(false);
      }
    });
  }

  ngOnInit(): void {
    const queryToken = this.route.snapshot.queryParamMap.get('token');
    if (queryToken) {
      this.tokenInput.set(queryToken);
      this.loadContext(queryToken);
    }
  }

  selectLibrary(libraryId: string): void {
    if (!libraryId) {
      this.resetLibraryContext();
      return;
    }

    this.clearMember();
    this.loading.set(true);

    this.scanner.getLibraryQr(libraryId).subscribe({
      next: (qr) => {
        this.qrImage.set(qr.qrCodeBase64);
        this.loadContext(qr.token);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'You do not have access to this library');
      },
    });
  }

  loadContext(token?: string): void {
    const value = (token ?? this.tokenInput()).trim();
    if (!value) {
      this.toast.error('Select a library or enter a valid attendance token');
      return;
    }

    this.loading.set(true);
    this.scanner.getContext(value).subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.tokenInput.set(ctx.token);
        this.loading.set(false);
        if (!this.qrImage()) {
          this.loadQr(ctx.libraryId);
        }
        this.searchMembers();
      },
      error: (err) => {
        this.loading.set(false);
        this.context.set(null);
        this.qrImage.set(null);
        this.toast.error(err?.error?.message ?? 'Invalid attendance QR code');
      },
    });
  }

  searchMembers(): void {
    const token = this.context()?.token;
    if (!token) return;

    this.scanner.searchMembers(token, this.memberSearch()).subscribe({
      next: (list) => this.members.set(list),
      error: (err) => this.toast.error(err?.error?.message ?? 'Could not search members'),
    });
  }

  openMemberPicker(): void {
    this.memberPickerOpen.set(true);
    this.searchMembers();
  }

  selectMember(member: ScannerMemberOption): void {
    this.selectedMember.set(member);
    this.selectedSeatNumber.set(null);
    this.memberSearch.set(`${member.membershipNo} — ${member.fullName}`);
    this.memberPickerOpen.set(false);
    this.loadMemberStatus(member.id);
    this.loadSeats();
  }

  clearMember(): void {
    this.selectedMember.set(null);
    this.memberStatus.set(null);
    this.selectedSeatNumber.set(null);
    this.librarySeats.set([]);
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

    const resolvedAction = action === 'auto'
      ? (this.canCheckIn() ? 'check-in' : this.canCheckOut() ? 'check-out' : action)
      : action;

    if (resolvedAction === 'check-in' && !this.selectedSeatNumber()) {
      this.toast.error('Please select an available seat before checking in.');
      return;
    }

    this.busy.set(true);
    this.scanner.record({
      libraryToken: ctx.token,
      memberId: member.id,
      action,
      deviceId: this.device.getStaffDeviceId(),
      seatNumber: resolvedAction === 'check-in' ? this.selectedSeatNumber() ?? undefined : undefined,
    }).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.lastMessage.set(result.message);
        this.selectedSeatNumber.set(null);
        this.toast.success(result.message);
        this.loadMemberStatus(member.id);
        this.loadSeats();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err?.error?.message ?? 'Attendance action failed');
      },
    });
  }

  private resetLibraryContext(): void {
    this.context.set(null);
    this.qrImage.set(null);
    this.tokenInput.set('');
    this.clearMember();
  }

  private loadMemberStatus(memberId: string): void {
    const token = this.context()?.token;
    if (!token) return;

    this.scanner.getMemberStatus(token, memberId).subscribe({
      next: (status) => this.memberStatus.set(status),
      error: (err) => this.toast.error(err?.error?.message ?? 'Could not load member status'),
    });
  }

  private loadSeats(): void {
    const token = this.context()?.token;
    if (!token) return;

    this.seatsLoading.set(true);
    this.scanner.getLibrarySeats(token).subscribe({
      next: (seats) => {
        this.librarySeats.set(seats);
        this.seatsLoading.set(false);
      },
      error: () => {
        this.librarySeats.set([]);
        this.seatsLoading.set(false);
      },
    });
  }

  private loadQr(libraryId: string): void {
    this.scanner.getLibraryQr(libraryId).subscribe({
      next: (qr) => this.qrImage.set(qr.qrCodeBase64),
      error: () => this.qrImage.set(null),
    });
  }

  downloadAttendanceQrPdf(): void {
    const ctx = this.context();
    const qrImg = this.qrImage();
    if (!ctx || !qrImg) {
      this.toast.error('Attendance QR code is not loaded yet');
      return;
    }

    try {
      exportLibraryQrPdf({
        libraryName: ctx.libraryName || 'Library',
        institutionName: ctx.institutionName,
        branchName: ctx.branchName,
        scanUrl: ctx.scanUrl,
        qrCodeBase64: qrImg,
      });
      this.toast.success('Attendance QR PDF downloaded successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.toast.error('Failed to generate QR PDF: ' + message);
    }
  }
}
