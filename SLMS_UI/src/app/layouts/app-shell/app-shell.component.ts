import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SidebarService } from '../sidebar/sidebar.service';
import { TopbarComponent } from '../topbar/topbar.component';

/**
 * Authenticated area shell: sidebar + topbar + routed content. Mirrors `_authenticated.tsx`.
 *
 * Both the sidebar and the topbar are truly `fixed` to the viewport so they never scroll away:
 * - The sidebar is `fixed inset-y-0 left-0`; the content column gets a matching `padding-left`.
 * - The topbar is `fixed inset-x-0 top-0` (full width); the higher z-index sidebar visually
 *   overlaps its left edge, so it only appears to span the content area. The content column
 *   gets a matching `padding-top` (`pt-14` = the topbar's `h-14`) to compensate for the space
 *   the topbar no longer occupies in normal flow.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="min-h-screen w-full bg-background">
      <app-sidebar />
      <app-topbar />
      <div
        class="flex min-h-screen flex-col pt-14 pl-0 transition-[padding] duration-200 md:pl-16"
        [class.lg:pl-64]="sidebar.isDesktop() && !sidebar.collapsed()"
        [class.lg:pl-16]="sidebar.isDesktop() && sidebar.collapsed()"
      >
        <main class="flex-1 p-4 md:p-6 lg:p-6">
          <div class="mx-auto max-w-7xl space-y-6">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  protected readonly sidebar = inject(SidebarService);
}
