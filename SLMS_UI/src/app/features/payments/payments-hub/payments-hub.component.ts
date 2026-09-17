import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideBuilding2, LucideCreditCard, LucideSettings2, LucideWallet } from '@lucide/angular';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { InstitutionDropdownResponse } from '@core/models/institution-dropdown.model';
import { ToastService } from '@core/services/toast.service';
import {
  GlassCardComponent,
  PageHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { PaymentQueueComponent } from '../payment-queue/payment-queue.component';
import { PaymentSettingsComponent } from '../payment-settings/payment-settings.component';

type PaymentsTab = 'queue' | 'settings';

@Component({
  selector: 'app-payments-hub',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent,
    GlassCardComponent,
    PaymentQueueComponent,
    PaymentSettingsComponent,
    LucideCreditCard,
    LucideWallet,
    LucideSettings2,
    LucideBuilding2,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        eyebrow="Billing"
        title="Payments"
        description="Configure how members pay, then confirm UPI transfers and review the collection queue."
      />

      <app-glass-card class="block p-0 overflow-hidden">
        <div class="p-3 flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <svg lucideBuilding2 class="h-4 w-4"></svg>
            <span class="text-xs font-medium uppercase tracking-wide hidden sm:inline">Institution</span>
          </div>
          <select
            class="h-9 min-w-[200px] flex-1 max-w-md rounded-md border bg-background px-2 text-sm"
            [ngModel]="institutionId()"
            (ngModelChange)="onInstitutionChange($event)"
          >
            <option value="">Select institution…</option>
            @for (inst of institutions(); track inst.value) {
              <option [value]="inst.value">{{ inst.key }}</option>
            }
          </select>

          @if (institutionId()) {
            <div class="hidden sm:block w-px h-6 bg-border"></div>
            <nav class="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1" aria-label="Payments sections">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                [class]="tab() === 'queue' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                (click)="tab.set('queue')"
              >
                <svg lucideWallet class="h-3.5 w-3.5"></svg>
                Payment queue
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                [class]="tab() === 'settings' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                (click)="tab.set('settings')"
              >
                <svg lucideSettings2 class="h-3.5 w-3.5"></svg>
                Collection settings
              </button>
            </nav>
          }
        </div>
      </app-glass-card>

      @if (!institutionId()) {
        <app-glass-card class="block py-16 text-center px-4">
          <svg lucideCreditCard class="h-10 w-10 mx-auto text-muted-foreground/50 mb-3"></svg>
          <p class="text-sm font-medium">Choose an institution</p>
          <p class="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Payment accounts and the fee collection queue are scoped per institution.
          </p>
        </app-glass-card>
      } @else if (tab() === 'queue') {
        <app-payment-queue [institutionId]="institutionId()" />
      } @else {
        <app-payment-settings [institutionId]="institutionId()" />
      }
    </div>
  `,
})
export class PaymentsHubComponent implements OnInit {
  private readonly institutionsService = inject(InstitutionsService);
  private readonly toast = inject(ToastService);

  readonly institutions = signal<InstitutionDropdownResponse[]>([]);
  readonly institutionId = signal('');
  readonly tab = signal<PaymentsTab>('queue');

  ngOnInit(): void {
    this.institutionsService.getInstitutionBranchForDropdown().subscribe({
      next: (res) => {
        const data = res.data ?? [];
        this.institutions.set(data);
        if (data.length === 1) this.institutionId.set(data[0].value);
      },
      error: () => this.toast.error('Could not load institutions'),
    });
  }

  onInstitutionChange(id: string): void {
    this.institutionId.set(id);
    this.tab.set('queue');
  }
}
