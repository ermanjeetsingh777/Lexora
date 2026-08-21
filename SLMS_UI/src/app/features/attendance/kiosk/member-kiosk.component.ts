import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  LucideCheckCircle2, LucideLogIn, LucideLogOut, LucideQrCode, LucideXCircle,
} from '@lucide/angular';
import { AttendanceKioskService } from '@core/services/attendance-kiosk.service';
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

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly context = signal<MemberScannerContext | null>(null);
  readonly memberStatus = signal<ScannerMemberStatus | null>(null);
  readonly lastMessage = signal<string | null>(null);
  readonly librarySeats = signal<AttendanceSeatOption[]>([]);
  readonly seatsLoading = signal(false);
  readonly selectedSeatNumber = signal<string | null>(null);

  readonly canCheckIn = computed(() => this.memberStatus()?.suggestedAction === 'check-in');
  readonly canCheckOut = computed(() => this.memberStatus()?.suggestedAction === 'check-out');
  readonly isDone = computed(() => this.memberStatus()?.suggestedAction === 'done');
  readonly formatAttendanceTime = formatAttendanceDisplayTime;

  readonly actionHint = computed(() => {
    if (this.isDone()) return 'Attendance completed for today.';
    if (this.canCheckIn()) return 'Tap Check in or use Auto to mark arrival.';
    if (this.canCheckOut()) return 'Tap Check out or use Auto to mark departure.';
    return '';
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set('Invalid member QR code. Please scan your member attendance QR.');
      return;
    }

    this.kiosk.getMemberContext(token).subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.loading.set(false);
        this.loadStatus(ctx.token);
        this.loadSeats(ctx.token);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Invalid or expired member QR code.');
      },
    });
  }

  record(action: 'check-in' | 'check-out' | 'auto'): void {
    const ctx = this.context();
    if (!ctx) return;

    const resolvedAction = action === 'auto'
      ? (this.canCheckIn() ? 'check-in' : this.canCheckOut() ? 'check-out' : action)
      : action;

    if (resolvedAction === 'check-in' && !this.selectedSeatNumber()) {
      this.lastMessage.set('Please select an available seat before checking in.');
      return;
    }

    this.busy.set(true);
    this.kiosk.recordMember({
      memberToken: ctx.token,
      action,
      seatNumber: resolvedAction === 'check-in' ? this.selectedSeatNumber() ?? undefined : undefined,
    }).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.lastMessage.set(result.message);
        this.selectedSeatNumber.set(null);
        this.loadStatus(ctx.token);
        this.loadSeats(ctx.token);
      },
      error: (err) => {
        this.busy.set(false);
        this.lastMessage.set(err?.error?.message ?? 'Attendance action failed');
      },
    });
  }

  private loadStatus(token: string): void {
    this.kiosk.getMemberSelfStatus(token).subscribe({
      next: (status) => this.memberStatus.set(status),
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
}
