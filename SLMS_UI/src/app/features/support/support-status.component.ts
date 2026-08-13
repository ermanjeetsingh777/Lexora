import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideActivity, LucideAlertTriangle, LucideArrowLeft, LucideBell, LucideCheckCircle2,
  LucideChevronDown, LucideClock, LucideHistory, LucideMail, LucideMessageSquare,
  LucideRadio, LucideRefreshCw, LucideShieldAlert, LucideWebhook, LucideWrench, LucideZap,
} from '@lucide/angular';
import { interval } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
import { SystemIncident, SystemStatus } from '@core/models/support.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { SidebarService } from '../../layouts/sidebar/sidebar.service';
import { formatRelative } from './support-format.util';
import { SupportService } from './support.service';
import {
  addStatusSubscription, loadStatusSubscriptions, removeStatusSubscription,
  StatusSubscription, StatusSubscriptionChannel,
} from './support-subscription.store';

type StatusTab = 'components' | 'incidents' | 'history' | 'subscribers';

@Component({
  selector: 'app-support-status',
  imports: [
    DatePipe, DecimalPipe, FormsModule, RouterLink,
    ButtonComponent, PageHeaderComponent, GlassCardComponent, StatusBadgeComponent,
    LucideRefreshCw, LucideActivity, LucideAlertTriangle, LucideZap, LucideArrowLeft,
    LucideBell, LucideShieldAlert, LucideHistory, LucideCheckCircle2, LucideChevronDown,
    LucideClock, LucideMail, LucideMessageSquare, LucideWebhook, LucideWrench, LucideRadio,
  ],
  providers: [SupportService],
  templateUrl: './support-status.component.html',
  styleUrl: './support-status.component.css',
})
export class SupportStatusComponent implements OnInit {
  private readonly supportService = inject(SupportService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly sidebar = inject(SidebarService);

  readonly formatRelative = formatRelative;

  readonly status = signal<SystemStatus | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly autoRefresh = signal(true);
  readonly pollSeconds = signal(15);
  readonly expandedIncident = signal<string | null>(null);
  readonly activeTab = signal<StatusTab>('components');
  readonly subscriptions = signal<StatusSubscription[]>(loadStatusSubscriptions());

  readonly showSubscribe = signal(false);
  readonly subChannel = signal<StatusSubscriptionChannel>('email');
  readonly subTarget = signal('');
  readonly subScope = signal<'all' | 'select'>('all');
  readonly subSelected = signal<string[]>([]);

  readonly overall = computed(() => {
    const components = this.status()?.components ?? [];
    if (components.some(c => c.status === 'Major Outage')) {
      return { text: 'Major service outage', tone: 'destructive' as const, dot: 'bg-destructive' };
    }
    if (components.some(c => c.status === 'Partial Outage')) {
      return { text: 'Partial outage', tone: 'warning' as const, dot: 'bg-orange-500' };
    }
    if (components.some(c => c.status === 'Degraded')) {
      return { text: 'Some services degraded', tone: 'warning' as const, dot: 'bg-amber-500' };
    }
    if (components.some(c => c.status === 'Maintenance')) {
      return { text: 'Scheduled maintenance in progress', tone: 'muted' as const, dot: 'bg-sky-500' };
    }
    return { text: 'All systems operational', tone: 'success' as const, dot: 'bg-emerald-500' };
  });

  readonly activeAndScheduled = computed(() => {
    const s = this.status();
    if (!s) return [];
    return [...s.activeIncidents];
  });

  readonly incidentCount = computed(() => this.activeAndScheduled().length);

  readonly overlayLeft = computed(() => {
    if (this.sidebar.isMobile()) return '0';
    if (this.sidebar.isTablet()) return '4rem';
    return this.sidebar.collapsed() ? '4rem' : '16rem';
  });

  ngOnInit(): void {
    interval(5000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    interval(this.pollSeconds() * 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.autoRefresh()) this.refresh(false);
      });
    this.refresh(true);
  }

  refresh(manual = true): void {
    if (manual) {
      this.loading.set(true);
      this.refreshing.set(true);
    }
    this.supportService.getStatus().subscribe({
      next: (res) => {
        const next = res.data ?? null;
        this.status.set(next);
        this.loading.set(false);
        setTimeout(() => this.refreshing.set(false), 350);
        if (next && !this.expandedIncident() && next.activeIncidents[0]) {
          this.expandedIncident.set(next.activeIncidents[0].id);
        }
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        if (manual) this.toast.error('Failed to load system status');
      },
    });
  }

  simulateIncident(): void {
    this.supportService.simulateIncident().subscribe({
      next: () => {
        this.toast.success('Incident simulated');
        this.refresh(true);
      },
      error: () => this.toast.error('Failed to simulate incident'),
    });
  }

  setTab(tab: StatusTab): void {
    this.activeTab.set(tab);
  }

  toggleIncident(id: string): void {
    this.expandedIncident.update(current => current === id ? null : id);
  }

  statusTone(status: string): { dot: string; variant: 'success' | 'warning' | 'destructive' | 'muted' } {
    switch (status) {
      case 'Operational': return { dot: 'bg-emerald-500', variant: 'success' };
      case 'Degraded': return { dot: 'bg-amber-500', variant: 'warning' };
      case 'Partial Outage': return { dot: 'bg-orange-500', variant: 'warning' };
      case 'Major Outage': return { dot: 'bg-destructive', variant: 'destructive' };
      case 'Maintenance': return { dot: 'bg-sky-500', variant: 'muted' };
      default: return { dot: 'bg-muted', variant: 'muted' };
    }
  }

  severityVariant(severity: string): 'destructive' | 'warning' | 'muted' {
    if (severity === 'critical') return 'destructive';
    if (severity === 'major') return 'warning';
    return 'muted';
  }

  uptimePercent(values: number[]): string {
    if (!values.length) return '100.00';
    return ((values.reduce((a, b) => a + b, 0) / values.length) * 100).toFixed(2);
  }

  uptime30Percent(values: number[]): string {
    const slice = values.slice(-30);
    if (!slice.length) return '100.00';
    return ((slice.reduce((a, b) => a + b, 0) / slice.length) * 100).toFixed(2);
  }

  uptimeBarClass(value: number): string {
    if (value >= 0.99) return 'bg-emerald-500/80';
    if (value >= 0.95) return 'bg-amber-500/80';
    if (value >= 0.85) return 'bg-orange-500/80';
    return 'bg-destructive/80';
  }

  uptimeBarHeight(value: number): string {
    return `${Math.max(6, Math.round(value * 100)) * 0.24}rem`;
  }

  incidentDuration(incident: SystemIncident): string {
    if (incident.resolvedAtUtc) {
      const mins = Math.round((new Date(incident.resolvedAtUtc).getTime() - new Date(incident.startedAtUtc).getTime()) / 60000);
      return `${mins} min`;
    }
    if (incident.status === 'Scheduled') {
      return `starts ${formatRelative(incident.startedAtUtc)}`;
    }
    return `ongoing · ${formatRelative(incident.startedAtUtc).replace(' ago', '')}`;
  }

  openSubscribe(): void {
    this.showSubscribe.set(true);
  }

  closeSubscribe(): void {
    this.showSubscribe.set(false);
    this.subTarget.set('');
    this.subSelected.set([]);
    this.subScope.set('all');
    this.subChannel.set('email');
  }

  toggleSubComponent(name: string, checked: boolean): void {
    this.subSelected.update(list => checked ? [...list, name] : list.filter(n => n !== name));
  }

  confirmSubscribe(): void {
    const target = this.subTarget().trim();
    if (!target) {
      this.toast.error('Please provide a delivery target.');
      return;
    }
    const components = this.subScope() === 'all' ? ['all'] : this.subSelected();
    if (this.subScope() === 'select' && !components.length) {
      this.toast.error('Select at least one component.');
      return;
    }
    this.subscriptions.set(addStatusSubscription({
      channel: this.subChannel(),
      target,
      components,
    }));
    this.toast.success(`Subscribed via ${this.subChannel()}`);
    this.closeSubscribe();
  }

  unsubscribe(target: string): void {
    this.subscriptions.set(removeStatusSubscription(target));
    this.toast.success('Unsubscribed');
  }

  trackIncident(_: number, incident: SystemIncident): string {
    return incident.id;
  }
}
