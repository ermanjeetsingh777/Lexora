import { BreakpointObserver } from '@angular/cdk/layout';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map } from 'rxjs';

/** Shared collapsed/expanded state for the app sidebar and its topbar trigger. */
@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly isMobile = signal(false);
  readonly isTablet = signal(false);
  readonly isDesktop = signal(true);

  readonly showLabels = computed(() => {
    if (this.isMobile()) return this.mobileOpen();
    if (this.isTablet()) return false;
    return !this.collapsed();
  });

  constructor() {
    this.breakpoints
      .observe([
        '(max-width: 767px)',
        '(min-width: 768px) and (max-width: 1023px)',
        '(min-width: 1024px)',
      ])
      .pipe(
        map((state) => ({
          isMobile: state.breakpoints['(max-width: 767px)'],
          isTablet: state.breakpoints['(min-width: 768px) and (max-width: 1023px)'],
          isDesktop: state.breakpoints['(min-width: 1024px)'],
        })),
      )
      .subscribe(({ isMobile, isTablet, isDesktop }) => {
        this.isMobile.set(isMobile);
        this.isTablet.set(isTablet);
        this.isDesktop.set(isDesktop);
        if (!isMobile) {
          this.mobileOpen.set(false);
        }
      });
  }

  toggle(): void {
    if (this.isMobile()) {
      this.mobileOpen.update((open) => !open);
      return;
    }
    if (this.isTablet()) {
      return;
    }
    this.collapsed.update((collapsed) => !collapsed);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
