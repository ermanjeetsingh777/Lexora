import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideCheckCircle2, LucideLogIn, LucideLogOut, LucideSearch, LucideUsers, LucideXCircle,
} from '@lucide/angular';
import { AttendanceKioskService } from '@core/services/attendance-kiosk.service';
import { KioskDeviceService } from '@core/services/kiosk-device.service';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import {
  ScannerContext,
  ScannerMemberOption,
  ScannerMemberStatus,
  AttendanceSeatOption,
} from '@core/models/attendanceModels';
import { AttendanceSeatPickerComponent } from '../components/attendance-seat-picker/attendance-seat-picker.component';
import { formatAttendanceDisplayTime } from '../attendance-format.util';

@Component({
  selector: 'app-library-kiosk',
  standalone: true,
  imports: [
    FormsModule, StatusBadgeComponent, AttendanceSeatPickerComponent,
    LucideUsers, LucideSearch, LucideLogIn, LucideLogOut, LucideCheckCircle2, LucideXCircle,
  ],
  templateUrl: './library-kiosk.component.html',
  styleUrl: './library-kiosk.component.css',
})
export class LibraryKioskComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly kiosk = inject(AttendanceKioskService);
  private readonly device = inject(KioskDeviceService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly context = signal<ScannerContext | null>(null);
  readonly memberSearch = signal('');
  readonly members = signal<ScannerMemberOption[]>([]);
  readonly selectedMember = signal<ScannerMemberOption | null>(null);
  readonly memberStatus = signal<ScannerMemberStatus | null>(null);
  readonly lastMessage = signal<string | null>(null);
  readonly lastMessageIsError = signal(false);
  readonly librarySeats = signal<AttendanceSeatOption[]>([]);
  readonly seatsLoading = signal(false);
  readonly selectedSeatNumber = signal<string | null>(null);

  readonly filteredMembers = computed(() => {
    const term = this.memberSearch().trim().toLowerCase();
    const list = this.members();
    if (!term) return list;
    return list.filter((m) =>
      m.fullName.toLowerCase().includes(term) ||
      m.membershipNo.toLowerCase().includes(term) ||
      m.id.toLowerCase().includes(term));
  });

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
      this.error.set('Invalid library QR code. Please scan the library attendance QR.');
      return;
    }

    this.kiosk.getLibraryContext(token).subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.loading.set(false);
        this.loadMembers();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Invalid or expired library QR code.');
      },
    });
  }

  loadMembers(search?: string): void {
    const token = this.context()?.token;
    if (!token) return;

    const term = search ?? this.memberSearch().trim();
    this.kiosk.searchMembers(token, term || undefined).subscribe({
      next: (list) => this.members.set(list),
    });
  }

  private setMessage(message: string | null, isError = false): void {
    this.lastMessage.set(message);
    this.lastMessageIsError.set(isError);
  }

  selectMember(member: ScannerMemberOption): void {
    const blocked = this.device.validateMemberAccess(member.id);
    if (blocked) {
      this.setMessage(blocked, true);
      return;
    }

    this.selectedMember.set(member);
    this.selectedSeatNumber.set(null);
    this.setMessage(null, false);
    this.loadMemberStatus(member.id);
    this.loadSeats();
  }

  clearMember(): void {
    this.selectedMember.set(null);
    this.memberStatus.set(null);
    this.selectedSeatNumber.set(null);
    this.librarySeats.set([]);
    this.setMessage(null, false);
  }

  record(action: 'check-in' | 'check-out' | 'auto'): void {
    const ctx = this.context();
    const member = this.selectedMember();
    if (!ctx || !member) return;

    const resolvedAction = action === 'auto'
      ? (this.canCheckIn() ? 'check-in' : this.canCheckOut() ? 'check-out' : action)
      : action;

    if (resolvedAction === 'check-in' && !this.selectedSeatNumber()) {
      this.setMessage('Please select an available seat before checking in.', true);
      return;
    }

    const blocked = this.device.validateMemberAccess(member.id);
    if (blocked) {
      this.setMessage(blocked, true);
      return;
    }

    this.busy.set(true);
    this.kiosk.recordLibrary({
      libraryToken: ctx.token,
      memberId: member.id,
      action,
      deviceId: this.device.getDeviceId(),
      seatNumber: resolvedAction === 'check-in' ? this.selectedSeatNumber() ?? undefined : undefined,
    }).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.setMessage(result.message, false);
        this.device.bindMember(member.id, member.fullName);
        this.selectedSeatNumber.set(null);
        this.loadMemberStatus(member.id);
        this.loadSeats();
      },
      error: (err) => {
        this.busy.set(false);
        this.setMessage(err?.error?.message ?? 'Attendance action failed', true);
      },
    });
  }

  private loadMemberStatus(memberId: string): void {
    const token = this.context()?.token;
    if (!token) return;

    this.kiosk.getMemberStatus(token, memberId).subscribe({
      next: (status) => this.memberStatus.set(status),
    });
  }

  private loadSeats(): void {
    const token = this.context()?.token;
    if (!token) return;

    this.seatsLoading.set(true);
    this.kiosk.getLibrarySeats(token).subscribe({
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
