import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideBookOpen,
  LucideClock,
  LucideCreditCard,
  LucideLogIn,
  LucideLogOut,
  LucideRepeat,
  LucideUserPlus,
} from '@lucide/angular';
import { DashboardActivityItem, DashboardActivitySummary, DashboardActivityType } from '@core/models/dashboard.models';

const ACTIVITY_META: Record<DashboardActivityType, { label: string; className: string }> = {
  'check-in': { label: 'Check-in', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  'check-out': { label: 'Check-out', className: 'bg-slate-500/10 text-slate-700 border-slate-500/20' },
  payment: { label: 'Payment', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
  enrollment: { label: 'Enrollment', className: 'bg-violet-500/10 text-violet-700 border-violet-500/20' },
  renewal: { label: 'Renewal', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  'book-checkout': { label: 'Book loan', className: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20' },
  'book-return': { label: 'Book return', className: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20' },
  'pending-payment': { label: 'Pending', className: 'bg-rose-500/10 text-rose-700 border-rose-500/20' },
};

@Component({
  selector: 'app-dashboard-activity-feed',
  standalone: true,
  imports: [RouterLink, LucideArrowRight, LucideLogIn, LucideLogOut, LucideCreditCard, LucideUserPlus, LucideRepeat, LucideBookOpen, LucideClock],
  template: `
    @if (summary() && showSummary()) {
      <div class="mb-4 grid grid-cols-2 gap-2">
        <div class="rounded-lg border bg-muted/20 px-3 py-2">
          <div class="label-mono">Check-ins today</div>
          <div class="text-lg font-semibold tabular-nums">{{ summary()!.todayCheckIns }}</div>
        </div>
        <div class="rounded-lg border bg-muted/20 px-3 py-2">
          <div class="label-mono">Check-outs today</div>
          <div class="text-lg font-semibold tabular-nums">{{ summary()!.todayCheckOuts }}</div>
        </div>
        <div class="rounded-lg border bg-muted/20 px-3 py-2">
          <div class="label-mono">Payments today</div>
          <div class="text-lg font-semibold tabular-nums">{{ summary()!.todayPayments }}</div>
        </div>
        <div class="rounded-lg border bg-muted/20 px-3 py-2">
          <div class="label-mono">Enrollments today</div>
          <div class="text-lg font-semibold tabular-nums">{{ summary()!.todayEnrollments }}</div>
        </div>
        @if (summary()!.todayBookLoans != null) {
          <div class="rounded-lg border bg-muted/20 px-3 py-2">
            <div class="label-mono">Book loans today</div>
            <div class="text-lg font-semibold tabular-nums">{{ summary()!.todayBookLoans }}</div>
          </div>
        }
        @if (summary()!.todayPendingPayments != null) {
          <div class="rounded-lg border bg-muted/20 px-3 py-2">
            <div class="label-mono">Pending dues today</div>
            <div class="text-lg font-semibold tabular-nums">{{ summary()!.todayPendingPayments }}</div>
          </div>
        }
      </div>
    }

    @if (showFilters()) {
      <div class="mb-4 flex flex-wrap gap-1.5">
        @for (filter of typeFilters; track filter.key) {
          <button
            type="button"
            (click)="setFilter(filter.key)"
            [class]="filterClass(filter.key)">
            {{ filter.label }}
          </button>
        }
      </div>
    }

    @if (visibleActivities().length === 0) {
      <p class="text-sm text-muted-foreground">{{ emptyMessage() }}</p>
    } @else {
      <ol class="space-y-0 divide-y" [class.max-h-80]="scrollable()" [class.overflow-y-auto]="scrollable()" [class.pr-1]="scrollable()">
        @for (a of visibleActivities(); track a.id) {
          <li class="flex items-start gap-3 py-3 text-sm first:pt-0">
            <span [class]="iconClass(a.activityType)" class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
              @switch (normalizeType(a.activityType)) {
                @case ('check-in') { <svg lucideLogIn class="h-3.5 w-3.5"></svg> }
                @case ('check-out') { <svg lucideLogOut class="h-3.5 w-3.5"></svg> }
                @case ('payment') { <svg lucideCreditCard class="h-3.5 w-3.5"></svg> }
                @case ('renewal') { <svg lucideRepeat class="h-3.5 w-3.5"></svg> }
                @case ('book-checkout') { <svg lucideBookOpen class="h-3.5 w-3.5"></svg> }
                @case ('book-return') { <svg lucideBookOpen class="h-3.5 w-3.5"></svg> }
                @case ('pending-payment') { <svg lucideClock class="h-3.5 w-3.5"></svg> }
                @default { <svg lucideUserPlus class="h-3.5 w-3.5"></svg> }
              }
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span [class]="badgeClass(a.activityType)" class="inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  {{ typeLabel(a.activityType) }}
                </span>
                <span class="label-mono">{{ a.timeLabel }}</span>
              </div>
              <div class="mt-1">
                <span class="font-medium">{{ a.actor }}</span>
                <span class="text-muted-foreground"> {{ a.action }} </span>
                <span class="font-medium">{{ a.target }}</span>
              </div>
              @if (a.detail) {
                <div class="label-mono mt-0.5 truncate">{{ a.detail }}</div>
              }
            </div>
          </li>
        }
      </ol>
    }

    @if (enableLoadMore() && hasMore()) {
      <button
        type="button"
        (click)="loadMore()"
        class="mt-4 inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent">
        Load more ({{ remainingCount() }} remaining)
      </button>
    }

    @if (showViewAllLink() && activities().length > 0) {
      <a routerLink="/dashboard/activity" class="mt-3 inline-flex items-center text-xs font-medium text-primary hover:underline">
        View all activity <svg lucideArrowRight class="ml-1 h-3.5 w-3.5"></svg>
      </a>
    }
  `,
})
export class DashboardActivityFeedComponent {
  readonly activities = input.required<DashboardActivityItem[]>();
  readonly summary = input<DashboardActivitySummary | null>(null);
  readonly showSummary = input(true);
  readonly limit = input<number | null>(null);
  readonly scrollable = input(false);
  readonly showFilters = input(false);
  readonly showViewAllLink = input(false);
  readonly enableLoadMore = input(false);
  readonly pageSize = input(40);
  readonly emptyMessage = input('No recent activity in your scope.');

  readonly activeFilter = signal<'all' | DashboardActivityType>('all');
  readonly visibleCount = signal(40);

  readonly typeFilters: { key: 'all' | DashboardActivityType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'check-in', label: 'Check-ins' },
    { key: 'check-out', label: 'Check-outs' },
    { key: 'payment', label: 'Payments' },
    { key: 'renewal', label: 'Renewals' },
    { key: 'enrollment', label: 'Enrollments' },
    { key: 'book-checkout', label: 'Book loans' },
    { key: 'book-return', label: 'Returns' },
    { key: 'pending-payment', label: 'Pending dues' },
  ];

  readonly filteredActivities = computed(() => {
    const filter = this.activeFilter();
    let rows = this.activities();
    if (filter !== 'all') {
      rows = rows.filter((row) => this.normalizeType(row.activityType) === filter);
    }
    return rows;
  });

  readonly visibleActivities = computed(() => {
    const rows = this.filteredActivities();
    const max = this.limit();
    if (max != null) {
      return rows.slice(0, max);
    }
    return rows.slice(0, this.visibleCount());
  });

  readonly hasMore = computed(() => {
    if (this.limit() != null) return false;
    return this.filteredActivities().length > this.visibleCount();
  });

  readonly remainingCount = computed(() =>
    Math.max(0, this.filteredActivities().length - this.visibleCount()),
  );

  setFilter(key: 'all' | DashboardActivityType): void {
    this.activeFilter.set(key);
    this.visibleCount.set(this.pageSize());
  }

  loadMore(): void {
    this.visibleCount.update((count) => count + this.pageSize());
  }

  typeLabel(type: DashboardActivityType | string | undefined): string {
    const normalized = this.normalizeType(type);
    return ACTIVITY_META[normalized]?.label ?? 'Activity';
  }

  badgeClass(type: DashboardActivityType | string | undefined): string {
    const normalized = this.normalizeType(type);
    return ACTIVITY_META[normalized]?.className ?? 'bg-muted text-muted-foreground border-border';
  }

  iconClass(type: DashboardActivityType | string | undefined): string {
    return this.badgeClass(type);
  }

  normalizeType(type: DashboardActivityType | string | undefined): DashboardActivityType {
    if (type && type in ACTIVITY_META) {
      return type as DashboardActivityType;
    }
    return 'check-in';
  }

  filterClass(key: 'all' | DashboardActivityType): string {
    const active = this.activeFilter() === key;
    return `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'border text-muted-foreground hover:text-foreground'
    }`;
  }
}
