import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArmchair,
  LucideBuilding2,
  LucideCamera,
  LucideCheckCircle2,
  LucideClipboardPaste,
  LucideLogIn,
  LucideLogOut,
  LucideQrCode,
  LucideRefreshCw,
  LucideScanLine,
  LucideUser,
  LucideXCircle,
} from '@lucide/angular';
import { MemberScannerContext, ScannerAttendanceResult } from '@core/models/attendanceModels';
import { AttendanceScannerService } from '@core/services/attendance-scanner.service';
import { KioskDeviceService } from '@core/services/kiosk-device.service';
import { QrScannerModalService } from '@core/services/qr-scanner-modal.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import {
  GlassCardComponent,
  PageHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { extractMemberAttendanceToken } from '../member-qr-token.util';

export type MemberQrScanMode = 'profile' | 'attendance';

@Component({
  selector: 'app-member-qr-scan-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    GlassCardComponent,
    ButtonComponent,
    StatusBadgeComponent,
    LucideCamera,
    LucideQrCode,
    LucideScanLine,
    LucideUser,
    LucideCheckCircle2,
    LucideXCircle,
    LucideClipboardPaste,
    LucideBuilding2,
    LucideArmchair,
    LucideLogIn,
    LucideLogOut,
    LucideRefreshCw,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        [eyebrow]="mode() === 'attendance' ? 'Attendance' : 'Members'"
        [title]="mode() === 'attendance' ? 'Scan member QR' : 'Scan member ID'"
        [description]="
          mode() === 'attendance'
            ? 'Scan the member ID card QR to check in / out with their assigned seat.'
            : 'Scan the member ID card QR to open their profile.'
        "
      >
        <div actions class="flex items-center gap-2">
          <app-button variant="outline" size="sm" [disabled]="busy()" (click)="openCamera()">
            <svg lucideCamera class="h-4 w-4 mr-1.5"></svg>
            <span>Scan with camera</span>
          </app-button>
          @if (mode() === 'attendance') {
            <a routerLink="/attendance/scanner">
              <app-button variant="outline" size="sm">Library scanner</app-button>
            </a>
          } @else {
            <a routerLink="/members">
              <app-button variant="outline" size="sm">All members</app-button>
            </a>
          }
        </div>
      </app-page-header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Left: scan controls (like Library QR column) -->
        <app-glass-card class="block lg:col-span-1">
          <div class="flex items-center gap-2 mb-3">
            <svg lucideQrCode class="h-5 w-5 text-primary"></svg>
            <h2 class="font-semibold text-sm">Member ID QR</h2>
          </div>

          <div class="mt-2 flex flex-col items-center gap-3 rounded-xl border bg-muted/20 p-5">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-xl border bg-background text-primary shadow-sm"
            >
              <svg lucideQrCode class="h-8 w-8"></svg>
            </div>
            <p class="text-xs text-muted-foreground text-center leading-relaxed">
              Point the camera at the QR on the <span class="font-medium text-foreground">back</span> of the member ID card.
            </p>
            <app-button class="w-full" [disabled]="busy()" (click)="openCamera()">
              <svg lucideCamera class="h-4 w-4 mr-1.5"></svg>
              {{ busy() ? 'Looking up…' : 'Open camera' }}
            </app-button>
          </div>

          <div class="mt-4 rounded-md border border-dashed p-3">
            <p class="text-xs text-muted-foreground mb-2">Or paste token / scan URL</p>
            <input
              class="w-full rounded-md border bg-background px-3 py-2 text-sm mb-2"
              placeholder="Member QR URL or token…"
              [ngModel]="manualInput()"
              (ngModelChange)="manualInput.set($event)"
              (keydown.enter)="resolveManual()"
            />
            <app-button class="w-full" variant="outline" size="sm" [disabled]="busy()" (click)="resolveManual()">
              <svg lucideClipboardPaste class="h-3.5 w-3.5 mr-1.5"></svg>
              Look up member
            </app-button>
          </div>
        </app-glass-card>

        <!-- Right: result / attendance (like Record attendance column) -->
        <app-glass-card class="block lg:col-span-2">
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2">
              <svg lucideScanLine class="h-5 w-5 text-primary"></svg>
              <h2 class="font-semibold text-sm">
                {{ mode() === 'attendance' ? 'Record attendance' : 'Member result' }}
              </h2>
            </div>
            @if (resolved()) {
              <app-button size="sm" variant="ghost" (click)="resetAndScan()">
                <svg lucideRefreshCw class="h-3.5 w-3.5 mr-1"></svg>
                Scan another
              </app-button>
            }
          </div>

          @if (lastError()) {
            <div
              class="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex gap-2"
            >
              <svg lucideXCircle class="h-4 w-4 shrink-0 mt-0.5"></svg>
              <div>
                <p class="font-medium">Could not use this QR</p>
                <p class="mt-0.5 opacity-90">{{ lastError() }}</p>
                <app-button class="mt-3" size="sm" variant="outline" (click)="openCamera()">
                  Try again
                </app-button>
              </div>
            </div>
          } @else if (!resolved()) {
            <p class="text-sm text-muted-foreground">
              Scan a member ID card to begin.
            </p>
          } @else if (resolved(); as m) {
            <div class="space-y-4">
              <div class="rounded-lg border p-4 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <svg lucideUser class="h-5 w-5"></svg>
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold truncate">{{ m.fullName }}</p>
                    <p class="text-xs text-muted-foreground font-mono">{{ m.membershipNo }}</p>
                  </div>
                </div>
                @if (lastResult()) {
                  <app-status-badge status="Done" />
                }
              </div>

              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="rounded-md border p-3">
                  <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <svg lucideBuilding2 class="h-3.5 w-3.5"></svg>
                    Library
                  </div>
                  <p class="font-medium mt-1 truncate">{{ m.libraryName || '—' }}</p>
                  <p class="text-xs text-muted-foreground truncate">{{ m.branchName }}</p>
                </div>
                <div class="rounded-md border p-3">
                  <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <svg lucideArmchair class="h-3.5 w-3.5"></svg>
                    Seat
                  </div>
                  <p class="font-medium mt-1 font-mono">
                    {{ m.assignedSeatNumber || 'Unassigned' }}
                  </p>
                  @if (!m.assignedSeatNumber && mode() === 'attendance') {
                    <p class="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      Assign a seat before check-in
                    </p>
                  }
                </div>
              </div>

              @if (lastResult(); as result) {
                <p class="text-sm text-success flex items-center gap-2">
                  <svg lucideCheckCircle2 class="h-4 w-4"></svg>
                  {{ result.message }}
                  @if (result.attendance?.seatNo) {
                    <span class="text-muted-foreground">· Seat {{ result.attendance?.seatNo }}</span>
                  }
                </p>
              }

              @if (mode() === 'attendance' && m.checkInBlocked) {
                <div
                  class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <p class="font-medium">Check-in blocked</p>
                  <p class="mt-0.5 opacity-90">
                    {{ m.planBlockMessage || 'Plan expired. Renew before check-in.' }}
                  </p>
                  @if (m.planLifecycle) {
                    <p class="mt-1 text-xs opacity-80">Status: {{ m.planLifecycle }}</p>
                  }
                  <a class="inline-block mt-3" [routerLink]="['/members', m.memberId]">
                    <app-button size="sm" variant="outline">Open profile to renew</app-button>
                  </a>
                </div>
              }

              @if (mode() === 'profile') {
                <div class="flex flex-wrap gap-2 pt-2">
                  <a [routerLink]="['/members', m.memberId]">
                    <app-button>
                      <svg lucideUser class="h-4 w-4 mr-1.5"></svg>
                      Open profile
                    </app-button>
                  </a>
                  <app-button variant="outline" (click)="resetAndScan()">Scan another</app-button>
                </div>
              } @else if (!m.checkInBlocked) {
                <div class="flex flex-wrap gap-2 pt-2">
                  <app-button [disabled]="busy()" (click)="markAttendance('check-in')">
                    <svg lucideLogIn class="h-4 w-4 mr-1.5"></svg>
                    Check in
                  </app-button>
                  <app-button variant="outline" [disabled]="busy()" (click)="markAttendance('check-out')">
                    <svg lucideLogOut class="h-4 w-4 mr-1.5"></svg>
                    Check out
                  </app-button>
                  <app-button variant="secondary" [disabled]="busy()" (click)="markAttendance('auto')">
                    Auto
                  </app-button>
                </div>
              } @else {
                <div class="flex flex-wrap gap-2 pt-2">
                  <app-button variant="outline" [disabled]="busy()" (click)="markAttendance('check-out')">
                    <svg lucideLogOut class="h-4 w-4 mr-1.5"></svg>
                    Check out
                  </app-button>
                </div>
              }
            </div>
          }
        </app-glass-card>
      </div>
    </div>
  `,
})
export class MemberQrScanPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scanner = inject(AttendanceScannerService);
  private readonly qrCamera = inject(QrScannerModalService);
  private readonly toast = inject(ToastService);
  private readonly device = inject(KioskDeviceService);

  readonly mode = signal<MemberQrScanMode>('profile');
  readonly manualInput = signal('');
  readonly busy = signal(false);
  readonly resolved = signal<MemberScannerContext | null>(null);
  readonly lastError = signal<string | null>(null);
  readonly lastResult = signal<ScannerAttendanceResult | null>(null);

  ngOnInit(): void {
    const path = this.router.url.split('?')[0];
    if (path.includes('/attendance/')) {
      this.mode.set('attendance');
    } else {
      this.mode.set('profile');
    }

    const queryMode = this.route.snapshot.queryParamMap.get('mode');
    if (queryMode === 'attendance' || queryMode === 'profile') {
      this.mode.set(queryMode);
    }

    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.resolveToken(token, { autoAttend: this.mode() === 'attendance' });
    }
  }

  openCamera(): void {
    this.lastError.set(null);
    this.qrCamera.open((raw) => {
      const token = extractMemberAttendanceToken(raw);
      if (!token) {
        this.toast.error('Not a member ID QR. Scan the QR on the back of the member ID card.');
        return true;
      }
      this.resolveToken(token, { autoAttend: this.mode() === 'attendance' });
      return true;
    });
  }

  resetAndScan(): void {
    this.resolved.set(null);
    this.lastResult.set(null);
    this.lastError.set(null);
    this.openCamera();
  }

  resolveManual(): void {
    const token = extractMemberAttendanceToken(this.manualInput());
    if (!token) {
      this.toast.error('Enter a valid member QR URL or token.');
      return;
    }
    this.resolveToken(token, { autoAttend: this.mode() === 'attendance' });
  }

  markAttendance(action: 'check-in' | 'check-out' | 'auto'): void {
    const m = this.resolved();
    if (!m) return;

    if (m.checkInBlocked && action !== 'check-out') {
      const msg = m.planBlockMessage ?? 'Plan expired. Renew before check-in.';
      this.lastError.set(msg);
      this.toast.error(msg);
      return;
    }

    this.busy.set(true);
    this.lastError.set(null);
    this.lastResult.set(null);
    this.scanner
      .recordByMemberToken({
        memberToken: m.token,
        action,
        deviceId: this.device.getStaffDeviceId(),
        seatNumber: m.assignedSeatNumber ?? undefined,
      })
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.lastResult.set(result);
          this.toast.success(result.message ?? 'Attendance recorded');
        },
        error: (err) => {
          this.busy.set(false);
          const msg = err?.error?.message ?? 'Could not record attendance';
          this.lastError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  private resolveToken(token: string, opts?: { autoAttend?: boolean }): void {
    this.busy.set(true);
    this.lastError.set(null);
    this.lastResult.set(null);
    this.resolved.set(null);

    this.scanner.resolveMemberByToken(token).subscribe({
      next: (ctx) => {
        this.busy.set(false);
        this.resolved.set(ctx);
        this.manualInput.set(token);

        if (this.mode() === 'profile') {
          this.toast.success(`Found ${ctx.fullName}`);
          this.router.navigate(['/members', ctx.memberId]);
          return;
        }

        if (ctx.checkInBlocked) {
          this.lastError.set(null);
          this.toast.error(ctx.planBlockMessage ?? 'Check-in blocked — renew plan first.');
          return;
        }

        if (opts?.autoAttend) {
          this.markAttendance('auto');
        }
      },
      error: (err) => {
        this.busy.set(false);
        const msg = err?.error?.message ?? 'Member QR not found';
        this.lastError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
