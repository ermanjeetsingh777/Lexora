import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideArmchair,
  LucideCheckCircle2,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideUserPlus,
  LucideXCircle,
} from '@lucide/angular';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { InstitutionDropdownResponse } from '@core/models/institution-dropdown.model';
import { ApiService } from '@core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import {
  GlassCardComponent,
  PageHeaderComponent,
  SectionHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { branchesForInstitution, librariesForBranch } from '@features/books/library-scope.util';

interface SeatItem {
  id: string;
  libraryId: string;
  libraryName: string;
  seatNumber?: string | null;
  status?: string | null;
  assignedMemberId?: string | null;
  assignedMemberName?: string | null;
}

type SeatStatusFilter = 'all' | 'Available' | 'Occupied' | 'Inactive';

@Component({
  selector: 'app-seats-hub',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent,
    SectionHeaderComponent,
    GlassCardComponent,
    ButtonComponent,
    StatusBadgeComponent,
    KpiCardComponent,
    LucideArmchair,
    LucideCheckCircle2,
    LucideXCircle,
    LucideUserPlus,
    LucideSearch,
    LucideRefreshCw,
    LucidePlus,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        eyebrow="Operations"
        title="Seats"
        description="Track availability, assign members, and manage seat inventory by branch."
      >
        <div actions class="flex flex-wrap items-center gap-2">
          <app-button variant="outline" size="sm" [disabled]="!branchId() || loading()" (click)="loadSeats()">
            <svg lucideRefreshCw class="h-4 w-4 mr-1"></svg>
            {{ loading() ? 'Loading…' : 'Refresh' }}
          </app-button>
          <app-button size="sm" [disabled]="!branchId()" (click)="showAdd.set(true)">
            <svg lucidePlus class="h-4 w-4 mr-1"></svg> Add seat
          </app-button>
        </div>
      </app-page-header>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <app-kpi-card label="Total" [value]="seats().length" hint="In selected branch">
          <svg icon lucideArmchair class="h-4 w-4"></svg>
        </app-kpi-card>
        <app-kpi-card label="Available" [value]="availableCount()" tone="success" hint="Ready to assign">
          <svg icon lucideCheckCircle2 class="h-4 w-4"></svg>
        </app-kpi-card>
        <app-kpi-card label="Occupied" [value]="occupiedCount()" tone="warning" hint="Currently assigned">
          <svg icon lucideUserPlus class="h-4 w-4"></svg>
        </app-kpi-card>
        <app-kpi-card label="Inactive" [value]="inactiveCount()" tone="destructive" hint="Hidden from assign">
          <svg icon lucideXCircle class="h-4 w-4"></svg>
        </app-kpi-card>
      </div>

      <app-glass-card class="block p-0 overflow-hidden">
        <div class="p-3 border-b flex flex-wrap items-center gap-2">
          <select
            class="h-9 min-w-[150px] rounded-md border bg-background px-2 text-sm"
            [ngModel]="institutionId()"
            (ngModelChange)="onInstitution($event)"
          >
            <option value="">Institution…</option>
            @for (i of institutions(); track i.value) {
              <option [value]="i.value">{{ i.key }}</option>
            }
          </select>
          <select
            class="h-9 min-w-[140px] rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            [disabled]="!institutionId()"
            [ngModel]="branchId()"
            (ngModelChange)="onBranch($event)"
          >
            <option value="">Branch…</option>
            @for (b of branches(); track b.value) {
              <option [value]="b.value">{{ b.key }}</option>
            }
          </select>
          <select
            class="h-9 min-w-[140px] rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            [disabled]="!branchId()"
            [ngModel]="filterLibraryId()"
            (ngModelChange)="filterLibraryId.set($event)"
          >
            <option value="">All libraries</option>
            @for (l of libraries(); track l.value) {
              <option [value]="l.value">{{ l.key }}</option>
            }
          </select>
          <div class="hidden sm:block w-px h-6 bg-border"></div>
          <div class="relative flex-1 min-w-[180px]">
            <svg lucideSearch class="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground"></svg>
            <input
              class="w-full h-9 rounded-md border bg-background pl-8 pr-3 text-sm"
              placeholder="Search seat or member…"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
            />
          </div>
          <select
            class="h-9 rounded-md border bg-background px-2 text-sm"
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilter.set($event)"
          >
            <option value="all">All status</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        @if (showAdd() && branchId()) {
          <div class="p-3 border-b bg-muted/20 flex flex-wrap items-end gap-2">
            <div class="min-w-[140px] flex-1">
              <label class="text-xs font-medium text-muted-foreground">Library</label>
              <select
                class="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                [ngModel]="createLibraryId()"
                (ngModelChange)="createLibraryId.set($event)"
              >
                <option value="">Select…</option>
                @for (l of libraries(); track l.value) {
                  <option [value]="l.value">{{ l.key }}</option>
                }
              </select>
            </div>
            <div class="min-w-[120px] flex-1">
              <label class="text-xs font-medium text-muted-foreground">Seat number</label>
              <input
                class="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="e.g. A-12"
                [ngModel]="newSeatNumber()"
                (ngModelChange)="newSeatNumber.set($event)"
              />
            </div>
            <app-button size="sm" [disabled]="creating()" (click)="createSeat()">
              {{ creating() ? 'Adding…' : 'Save seat' }}
            </app-button>
            <app-button size="sm" variant="ghost" (click)="showAdd.set(false)">Cancel</app-button>
          </div>
        }

        @if (!branchId()) {
          <div class="py-16 text-center px-4">
            <svg lucideArmchair class="h-10 w-10 mx-auto text-muted-foreground/50 mb-3"></svg>
            <p class="text-sm font-medium">Select institution and branch</p>
            <p class="text-xs text-muted-foreground mt-1">Seat availability loads for the selected branch.</p>
          </div>
        } @else if (loading()) {
          <p class="py-16 text-center text-sm text-muted-foreground">Loading seats…</p>
        } @else if (!filteredSeats().length) {
          <div class="py-16 text-center px-4">
            <svg lucideArmchair class="h-10 w-10 mx-auto text-muted-foreground/50 mb-3"></svg>
            <p class="text-sm font-medium">
              {{ seats().length ? 'No seats match your filters' : 'No seats in this branch yet' }}
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ seats().length ? 'Try clearing search or status.' : 'Use Add seat to create the first one.' }}
            </p>
            @if (!seats().length) {
              <app-button class="mt-4" size="sm" (click)="showAdd.set(true)">
                <svg lucidePlus class="h-4 w-4 mr-1"></svg> Add seat
              </app-button>
            }
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-muted/30 text-left border-b">
                <tr>
                  <th class="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">Seat</th>
                  <th class="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">Library</th>
                  <th class="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                  <th class="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">Member</th>
                  <th class="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                @for (s of filteredSeats(); track s.id) {
                  <tr class="hover:bg-muted/30 transition-colors">
                    <td class="px-4 py-3 font-semibold font-mono tabular-nums">{{ s.seatNumber }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ s.libraryName }}</td>
                    <td class="px-4 py-3"><app-status-badge [status]="s.status || '—'" /></td>
                    <td class="px-4 py-3">{{ s.assignedMemberName || '—' }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-1.5 flex-wrap">
                        @if (s.status === 'Occupied') {
                          <app-button size="sm" variant="outline" (click)="releaseSeat(s)">Release</app-button>
                        } @else if (s.status === 'Available') {
                          <app-button size="sm" variant="outline" (click)="openAssign(s)">Assign</app-button>
                        }
                        <app-button size="sm" variant="ghost" (click)="toggleActive(s)">
                          {{ s.status === 'Inactive' ? 'Activate' : 'Deactivate' }}
                        </app-button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="border-t px-4 py-2.5 text-xs text-muted-foreground">
            Showing {{ filteredSeats().length }} of {{ seats().length }} seats
          </div>
        }
      </app-glass-card>
    </div>

    @if (assignTarget(); as seat) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="closeAssign()">
        <div class="w-full max-w-sm rounded-xl border bg-background shadow-xl p-5 space-y-4" (click)="$event.stopPropagation()">
          <app-section-header
            title="Assign seat {{ seat.seatNumber }}"
            description="Enter the member’s membership number for {{ seat.libraryName }}."
          />
          <div>
            <label class="text-sm font-medium">Membership number</label>
            <input
              class="mt-1.5 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="e.g. MEM-1042"
              [ngModel]="assignMembershipNo()"
              (ngModelChange)="assignMembershipNo.set($event)"
              (keydown.enter)="confirmAssign()"
            />
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <app-button variant="outline" size="sm" (click)="closeAssign()">Cancel</app-button>
            <app-button size="sm" [disabled]="assigning()" (click)="confirmAssign()">
              {{ assigning() ? 'Assigning…' : 'Assign' }}
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SeatsHubComponent implements OnInit {
  private readonly institutionsService = inject(InstitutionsService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly institutions = signal<InstitutionDropdownResponse[]>([]);
  readonly institutionId = signal('');
  readonly branchId = signal('');
  readonly seats = signal<SeatItem[]>([]);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly assigning = signal(false);
  readonly createLibraryId = signal('');
  readonly newSeatNumber = signal('');
  readonly showAdd = signal(false);
  readonly filterLibraryId = signal('');
  readonly query = signal('');
  readonly statusFilter = signal<SeatStatusFilter>('all');
  readonly assignTarget = signal<SeatItem | null>(null);
  readonly assignMembershipNo = signal('');

  readonly branches = computed(() => branchesForInstitution(this.institutions(), this.institutionId()));
  readonly libraries = computed(() =>
    librariesForBranch(this.institutions(), this.institutionId(), this.branchId()),
  );

  readonly availableCount = computed(() => this.seats().filter((s) => s.status === 'Available').length);
  readonly occupiedCount = computed(() => this.seats().filter((s) => s.status === 'Occupied').length);
  readonly inactiveCount = computed(() => this.seats().filter((s) => s.status === 'Inactive').length);

  readonly filteredSeats = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    const lib = this.filterLibraryId();
    return this.seats().filter((s) => {
      if (lib && s.libraryId !== lib) return false;
      if (status !== 'all' && s.status !== status) return false;
      if (!q) return true;
      const hay = `${s.seatNumber ?? ''} ${s.libraryName ?? ''} ${s.assignedMemberName ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  });

  ngOnInit(): void {
    this.institutionsService.getInstitutionBranchForDropdown().subscribe({
      next: (res) => {
        const data = res.data ?? [];
        this.institutions.set(data);
        if (data.length === 1) {
          this.onInstitution(data[0].value);
          const branches = branchesForInstitution(data, data[0].value);
          if (branches.length === 1) this.onBranch(branches[0].value);
        }
      },
      error: () => this.toast.error('Could not load institutions'),
    });
  }

  onInstitution(id: string): void {
    this.institutionId.set(id);
    this.branchId.set('');
    this.seats.set([]);
    this.createLibraryId.set('');
    this.filterLibraryId.set('');
    this.showAdd.set(false);
  }

  onBranch(id: string): void {
    this.branchId.set(id);
    this.seats.set([]);
    this.filterLibraryId.set('');
    const libs = this.libraries();
    this.createLibraryId.set(libs.length === 1 ? libs[0].value : '');
    if (id) this.loadSeats();
  }

  loadSeats(): void {
    const institutionId = this.institutionId();
    const branchId = this.branchId();
    if (!institutionId || !branchId) return;
    this.loading.set(true);
    this.api.get<SeatItem[]>(`institutions/${institutionId}/branches/${branchId}/seats`).subscribe({
      next: (res) => {
        this.seats.set(res.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Could not load seats');
      },
    });
  }

  createSeat(): void {
    const institutionId = this.institutionId();
    const branchId = this.branchId();
    const libraryId = this.createLibraryId();
    const seatNumber = this.newSeatNumber().trim();
    if (!institutionId || !branchId || !libraryId || !seatNumber) {
      this.toast.error('Library and seat number are required.');
      return;
    }
    this.creating.set(true);
    this.api
      .post<SeatItem>(`institutions/${institutionId}/branches/${branchId}/seats`, {
        libraryId,
        seatNumber,
      })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.newSeatNumber.set('');
          this.showAdd.set(false);
          this.toast.success('Seat added');
          this.loadSeats();
        },
        error: (err) => {
          this.creating.set(false);
          this.toast.error(err?.error?.message ?? 'Could not add seat');
        },
      });
  }

  toggleActive(seat: SeatItem): void {
    const institutionId = this.institutionId();
    const branchId = this.branchId();
    if (!institutionId || !branchId) return;
    const next = seat.status === 'Inactive' ? 'Available' : 'Inactive';
    this.api
      .put<SeatItem>(`institutions/${institutionId}/branches/${branchId}/seats`, seat.id, { status: next })
      .subscribe({
        next: () => {
          this.toast.success(next === 'Inactive' ? 'Seat deactivated' : 'Seat activated');
          this.loadSeats();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Could not update seat'),
      });
  }

  openAssign(seat: SeatItem): void {
    this.assignTarget.set(seat);
    this.assignMembershipNo.set('');
  }

  closeAssign(): void {
    this.assignTarget.set(null);
    this.assignMembershipNo.set('');
  }

  confirmAssign(): void {
    const seat = this.assignTarget();
    const institutionId = this.institutionId();
    const branchId = this.branchId();
    const membershipNo = this.assignMembershipNo().trim();
    if (!seat || !institutionId || !branchId || !membershipNo) {
      this.toast.error('Membership number is required.');
      return;
    }
    this.assigning.set(true);
    this.api
      .post<SeatItem>(`institutions/${institutionId}/branches/${branchId}/seats/${seat.id}/assign`, {
        membershipNo,
      })
      .subscribe({
        next: () => {
          this.assigning.set(false);
          this.closeAssign();
          this.toast.success('Seat assigned');
          this.loadSeats();
        },
        error: (err) => {
          this.assigning.set(false);
          this.toast.error(err?.error?.message ?? 'Could not assign seat');
        },
      });
  }

  releaseSeat(seat: SeatItem): void {
    const institutionId = this.institutionId();
    const branchId = this.branchId();
    if (!institutionId || !branchId) return;
    if (!window.confirm(`Release seat ${seat.seatNumber} from ${seat.assignedMemberName || 'member'}?`)) return;
    this.api
      .post<SeatItem>(`institutions/${institutionId}/branches/${branchId}/seats/${seat.id}/release`, {})
      .subscribe({
        next: () => {
          this.toast.success('Seat released');
          this.loadSeats();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Could not release seat'),
      });
  }
}
