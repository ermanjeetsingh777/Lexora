import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  LucideCheckCircle2, LucideLogIn, LucideLogOut, LucideQrCode, LucideXCircle,
} from '@lucide/angular';
import { AttendanceKioskService } from '@core/services/attendance-kiosk.service';
import { KioskDeviceService } from '@core/services/kiosk-device.service';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { MemberScannerContext, ScannerMemberStatus, AttendanceSeatOption } from '@core/models/attendanceModels';
import { AttendanceSeatPickerComponent } from '../components/attendance-seat-picker/attendance-seat-picker.component';
import { formatAttendanceDisplayTime } from '../attendance-format.util';

@Component({
  selector: 'app-member-kiosk',
  standalone: true,
  imports: [
    StatusBadgeComponent, AttendanceSeatPickerComponent,
    LucideQrCode, LucideLogIn, LucideLogOut, LucideCheckCircle2, LucideXCircle,
  ],
  templateUrl: './member-kiosk.component.html',
  styleUrl: './member-kiosk.component.css',
})
export class MemberKioskComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly kiosk = inject(AttendanceKioskService);
  private readonly device = inject(KioskDeviceService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly context = signal<MemberScannerContext | null>(null);
  readonly memberStatus = signal<ScannerMemberStatus | null>(null);
  readonly lastMessage = signal<string | null>(null);
  readonly lastMessageIsError = signal(false);
  readonly librarySeats = signal<AttendanceSeatOption[]>([]);
  readonly seatsLoading = signal(false);
  readonly selectedSeatNumber = signal<string | null>(null);
  readonly autoApplied = signal(false);

  readonly canCheckIn = computed(() => this.memberStatus()?.suggestedAction === 'check-in');
  readonly canCheckOut = computed(() => this.memberStatus()?.suggestedAction === 'check-out');
  readonly isDone = computed(() => this.memberStatus()?.suggestedAction === 'done');
  readonly isPlanBlocked = computed(() => this.memberStatus()?.suggestedAction === 'blocked');
  readonly formatAttendanceTime = formatAttendanceDisplayTime;

  readonly needsSeatPicker = computed(() =>
    this.canCheckIn() && !this.selectedSeatNumber() && !this.context()?.assignedSeatNumber,
  );

  readonly actionHint = computed(() => {
    if (this.isPlanBlocked()) {
      return this.memberStatus()?.planBlockMessage
        ?? 'Plan expired. Renew membership before check-in.';
    }
    if (this.isDone()) return 'Attendance completed for today.';
    if (this.canCheckIn() && this.selectedSeatNumber()) {
      return this.autoApplied()
        ? `Checked in on seat ${this.selectedSeatNumber()}.`
        : `Ready to check in on seat ${this.selectedSeatNumber()}.`;
    }
    if (this.canCheckIn()) return 'Select a seat, then check in — or ask staff to assign your seat.';
    if (this.canCheckOut()) return 'Tap Check out or wait — auto checkout may already have run.';
    return '';
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set('Invalid member QR code. Please scan your member attendance QR.');
      return;
    }

    const deviceId = this.device.getDeviceId();

    this.kiosk.getMemberContext(token, deviceId).subscribe({
      next: (ctx) => {
        const blocked = this.device.validateMemberAccess(ctx.memberId);
        if (blocked) {
          this.loading.set(false);
          this.error.set(blocked);
          return;
        }

        this.context.set(ctx);
        if (ctx.assignedSeatNumber) {
          this.selectedSeatNumber.set(ctx.assignedSeatNumber);
        }
        this.loading.set(false);
        this.loadStatusAndMaybeAuto(ctx.token);
        this.loadSeats(ctx.token);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Invalid or expired member QR code.');
      },
    });
  }

  record(action: 'check-in' | 'check-out' | 'auto', opts?: { silent?: boolean }): void {
    const ctx = this.context();
    if (!ctx) return;

    const resolvedAction = action === 'auto'
      ? (this.canCheckIn() ? 'check-in' : this.canCheckOut() ? 'check-out' : action)
      : action;

    const seat =
      this.selectedSeatNumber()
      || ctx.assignedSeatNumber
      || undefined;

    if (resolvedAction === 'check-in' && !seat) {
      this.setMessage('Please select an available seat before checking in.', true);
      return;
    }

    this.busy.set(true);
    this.kiosk.recordMember({
      memberToken: ctx.token,
      action,
      deviceId: this.device.getDeviceId(),
      seatNumber: resolvedAction === 'check-in' ? seat : undefined,
    }).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.setMessage(result.message ?? 'Attendance updated.', false);
        if (!opts?.silent) {
          this.autoApplied.set(true);
        } else {
          this.autoApplied.set(true);
        }
        this.loadStatus(ctx.token);
      },
      error: (err) => {
        this.busy.set(false);
        this.setMessage(err?.error?.message ?? 'Could not record attendance.', true);
      },
    });
  }

  private loadStatusAndMaybeAuto(token: string): void {
    this.kiosk.getMemberSelfStatus(token).subscribe({
      next: (status) => {
        this.memberStatus.set(status);
        if (status.seatNumber) {
          this.selectedSeatNumber.set(status.seatNumber);
        }

        const ctx = this.context();
        const seat = this.selectedSeatNumber() || ctx?.assignedSeatNumber;
        if (status.suggestedAction === 'blocked') {
          this.setMessage(
            status.planBlockMessage ?? 'Plan expired. Renew membership before check-in.',
            true,
          );
          return;
        }
        if (status.suggestedAction === 'check-in' && seat) {
          this.selectedSeatNumber.set(seat);
          this.record('check-in', { silent: true });
        } else if (status.suggestedAction === 'check-out') {
          this.record('check-out', { silent: true });
        }
      },
      error: (err) => this.setMessage(err?.error?.message ?? 'Could not load status.', true),
    });
  }

  private loadStatus(token: string): void {
    this.kiosk.getMemberSelfStatus(token).subscribe({
      next: (status) => {
        this.memberStatus.set(status);
        if (status.seatNumber) this.selectedSeatNumber.set(status.seatNumber);
      },
      error: (err) => this.setMessage(err?.error?.message ?? 'Could not load status.', true),
    });
  }

  private loadSeats(token: string): void {
    this.seatsLoading.set(true);
    this.kiosk.getMemberSeats(token).subscribe({
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

  private setMessage(message: string, isError: boolean): void {
    this.lastMessage.set(message);
    this.lastMessageIsError.set(isError);
  }
}
