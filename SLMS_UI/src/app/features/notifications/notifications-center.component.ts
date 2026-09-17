import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { LucideBell, LucideRefreshCw } from '@lucide/angular';
import { ApiService } from '@core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';

interface NotificationItem {
  id: string;
  title?: string | null;
  message?: string | null;
  notificationType?: string | null;
  memberId?: string | null;
  isRead: boolean;
  createdAtUtc: string;
}

@Component({
  selector: 'app-notifications-center',
  standalone: true,
  imports: [
    DatePipe,
    PageHeaderComponent,
    SectionHeaderComponent,
    GlassCardComponent,
    StatusBadgeComponent,
    ButtonComponent,
    LucideBell,
    LucideRefreshCw,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        eyebrow="Inbox"
        title="Notifications"
        description="Plan expiry (7/3/1), payment dues, late arrivals — email + WhatsApp links on generate."
      >
        <div actions class="flex flex-wrap gap-2">
          <app-button variant="outline" size="sm" [disabled]="busy()" (click)="refresh()">
            <svg lucideRefreshCw class="h-4 w-4 mr-1"></svg> Refresh
          </app-button>
          <app-button size="sm" [disabled]="busy()" (click)="generateAlerts()">
            Generate alerts
          </app-button>
        </div>
      </app-page-header>

      <app-glass-card class="block">
        <app-section-header title="Your inbox" description="Newest first · mark as read when done" />
        @if (loading()) {
          <p class="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        } @else if (!items().length) {
          <div class="py-10 text-center">
            <svg lucideBell class="h-8 w-8 mx-auto text-muted-foreground mb-2"></svg>
            <p class="text-sm text-muted-foreground">No notifications yet. Click Generate alerts to scan expiry, dues, and late arrivals.</p>
          </div>
        } @else {
          <ul class="divide-y">
            @for (n of items(); track n.id) {
              <li class="py-3 flex items-start justify-between gap-3" [class.opacity-60]="n.isRead">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="font-medium text-sm">{{ n.title }}</p>
                    <app-status-badge [status]="n.notificationType || 'general'" variant="muted" />
                  </div>
                  <p class="text-sm text-muted-foreground mt-0.5">{{ n.message }}</p>
                  <p class="text-[11px] text-muted-foreground mt-1">{{ n.createdAtUtc | date:'medium' }}</p>
                </div>
                @if (!n.isRead) {
                  <app-button size="sm" variant="outline" (click)="markRead(n)">Mark read</app-button>
                }
              </li>
            }
          </ul>
        }
      </app-glass-card>
    </div>
  `,
})
export class NotificationsCenterComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly items = signal<NotificationItem[]>([]);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.get<NotificationItem[]>('notifications').subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Could not load notifications');
      },
    });
  }

  generateAlerts(): void {
    this.busy.set(true);
    this.api.post<{ created: number }>('notifications/generate-alerts', {}).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.toast.success(res.message ?? `Generated ${res.data?.created ?? 0} alert(s)`);
        this.refresh();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err?.error?.message ?? 'Could not generate alerts');
      },
    });
  }

  markRead(n: NotificationItem): void {
    this.api.putTo<object>(`notifications/${n.id}/mark-as-read`, {}).subscribe({
      next: () => {
        this.items.update((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Could not mark as read'),
    });
  }
}
