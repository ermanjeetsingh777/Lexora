import { Injectable, signal } from '@angular/core';

/** Shared collapsed/expanded state for the app sidebar and its topbar trigger. */
@Injectable({ providedIn: 'root' })
export class SidebarService {
  readonly collapsed = signal(false);

  toggle(): void {
    this.collapsed.update((v) => !v);
  }
}
