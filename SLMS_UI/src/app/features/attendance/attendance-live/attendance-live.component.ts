import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideLogIn,
  LucideLogOut,
  LucidePause,
  LucidePlay,
  LucideRefreshCw,
  LucideSearch,
} from '@lucide/angular';
import { AttendanceLiveEvent } from '@core/models/attendanceModels';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { AttendanceFilterService } from '../attendance-filter.service';

@Component({
  selector: 'app-attendance-live',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent,
    GlassCardComponent,
    SectionHeaderComponent,
    KpiCardComponent,
    ButtonComponent,
    StatusBadgeComponent,
    LucideSearch,
    LucideLogIn,
    LucideLogOut,
    LucidePause,
    LucidePlay,
    LucideRefreshCw,
  ],
  templateUrl: './attendance-live.component.html',
  styleUrl: '../attendance-shell/attendance-shell.component.css',
})
export class AttendanceLiveComponent {
  private readonly moduleService = inject(AttendanceModuleService);
  readonly filters = inject(AttendanceFilterService);

  readonly loading = signal(true);
  readonly paused = signal(false);
  readonly filter = signal<'all' | 'in' | 'out'>('all');
  readonly search = signal('');
  readonly events = signal<AttendanceLiveEvent[]>([]);

  readonly filteredEvents = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.events().filter((event) => {
      if (this.filter() !== 'all' && event.direction !== this.filter()) {
        return false;
      }
      if (term && !event.memberName.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  });

  readonly checkIns = computed(() => this.events().filter((e) => e.direction === 'in').length);
  readonly checkOuts = computed(() => this.events().filter((e) => e.direction === 'out').length);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      this.filters.libraryId();
      this.filters.librariesLoaded();
      this.paused();
      this.setupPolling();
      this.loadFeed();
    });
  }

  togglePaused(): void {
    this.paused.update((value) => !value);
  }

  refresh(): void {
    this.loadFeed();
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  }

  relativeTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return `${Math.floor(diffMinutes / 60)}h ago`;
  }

  private setupPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.paused() || !this.filters.librariesLoaded()) {
      return;
    }
    this.pollTimer = setInterval(() => this.loadFeed(false), 10_000);
  }

  private loadFeed(showLoader = true): void {
    if (!this.filters.librariesLoaded()) {
      return;
    }
    if (showLoader) {
      this.loading.set(true);
    }
    this.moduleService.getLiveFeed(this.filters.libraryId() || undefined, 30).subscribe({
      next: (feed) => {
        this.events.set(feed);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.events.set([]);
      },
    });
  }
}
