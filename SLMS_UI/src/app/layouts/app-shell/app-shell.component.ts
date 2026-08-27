import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { MemberPortalService } from '@core/services/member-portal.service';
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
      @if (!isMemberPortalUser()) {
        <app-sidebar />
      }
      <app-topbar [memberPortalMode]="isMemberPortalUser()" />
      <div
        class="flex min-h-screen flex-col pt-14 transition-[padding] duration-200"
        [class.pl-0]="isMemberPortalUser()"
        [class.md:pl-16]="!isMemberPortalUser()"
        [class.lg:pl-64]="!isMemberPortalUser() && sidebar.isDesktop() && !sidebar.collapsed()"
        [class.lg:pl-16]="!isMemberPortalUser() && sidebar.isDesktop() && sidebar.collapsed()"
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
export class AppShellComponent implements OnInit {
  protected readonly sidebar = inject(SidebarService);
  private readonly auth = inject(AuthService);
  private readonly organizationEntitlements = inject(OrganizationEntitlementService);
  private readonly memberPortal = inject(MemberPortalService);

  protected isMemberPortalUser(): boolean {
    return this.auth.isMemberPortalUser();
  }

  ngOnInit(): void {
    if (this.isMemberPortalUser()) {
      this.memberPortal.resolveMemberId().subscribe();
      return;
    }

    this.organizationEntitlements.load().subscribe();
  }
}
