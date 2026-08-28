import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideArmchair, LucideBarChart3, LucideBell, LucideBookOpen, LucideBookUser,
  LucideBuilding2, LucideCalendarCheck, LucideCreditCard, LucideGraduationCap,
  LucideLayoutDashboard, LucideLifeBuoy, LucideScanLine, LucideUser, LucideUserCog, LucideUsers,
} from '@lucide/angular';
import { SidebarService } from './sidebar.service';
import { AuthService } from '@core/services/auth.service';
import { PermissionKey } from '@core/constants/permissions';

/** Primary navigation rail. Ported 1:1 from `components/app-sidebar.tsx`. */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive,
    LucideLayoutDashboard, LucideBarChart3, LucideUsers, LucideGraduationCap, LucideBookUser,
    LucideArmchair, LucideCalendarCheck, LucideScanLine, LucideBuilding2, LucideBookOpen,
    LucideCreditCard, LucideBell, LucideUserCog, LucideUser, LucideLifeBuoy,
  ],
  template: `
    @if (sidebar.isMobile() && sidebar.mobileOpen()) {
      <div class="fixed inset-0 z-30 bg-black/40 md:hidden" (click)="sidebar.closeMobile()" aria-hidden="true"></div>
    }

    <aside
      class="fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 w-64 -translate-x-full md:translate-x-0 md:w-16"
      [class.translate-x-0]="sidebar.mobileOpen()"
      [class.lg:w-64]="sidebar.isDesktop() && !sidebar.collapsed()"
    >
      <div class="border-b">
        <a routerLink="/dashboard" class="flex items-center gap-2 px-3 py-3" (click)="sidebar.closeMobile()">
          <div class="relative h-8 w-8 shrink-0 rounded-md bg-gradient-primary grid place-items-center text-primary-foreground font-mono font-bold">
            SL
            <span class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-sidebar"></span>
          </div>
          @if (sidebar.showLabels()) {
            <div class="leading-tight">
              <div class="text-sm font-semibold tracking-tight">Lexora</div>
              <div class="label-mono">v2.4 · Institutional</div>
            </div>
          }
        </a>
      </div>

      <nav class="flex-1 overflow-y-auto py-2">
        @if (canViewDashboard()) {
          <div class="px-3 py-2">
            @if (sidebar.showLabels()) { <p class="label-mono px-2 pb-1">Workspace</p> }
            <a routerLink="/dashboard" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" [routerLinkActiveOptions]="{ exact: true }" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
              <svg lucideLayoutDashboard class="h-4 w-4 shrink-0"></svg>
              @if (sidebar.showLabels()) { <span>Dashboard</span> }
            </a> 
          </div>
        }

        @if (canViewMembers() || canViewAttendance() || canUseScanner()) {
          <div class="px-3 py-2">
            @if (sidebar.showLabels()) { <p class="label-mono px-2 pb-1">Operations</p> }
            @if (canViewMembers()) {
              <a routerLink="/members" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
                <svg lucideUsers class="h-4 w-4 shrink-0"></svg>
                @if (sidebar.showLabels()) { <span>Members</span> }
              </a>
            }
            @if (canViewAttendance()) {
              <a routerLink="/attendance" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
                <svg lucideCalendarCheck class="h-4 w-4 shrink-0"></svg>
                @if (sidebar.showLabels()) { <span>Attendance</span> }
              </a>
            }
            @if (canUseScanner()) {
              <a routerLink="/attendance/scanner" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
                <svg lucideScanLine class="h-4 w-4 shrink-0"></svg>
                @if (sidebar.showLabels()) { <span>Scanner</span> }
              </a>
            }
          </div>
        }

        @if (canViewInstitutions() || canViewBranches() || canViewLibraries() || canViewSubscriptions()) {
          <div class="px-3 py-2">
            @if (sidebar.showLabels()) { <p class="label-mono px-2 pb-1">Organization</p> }
            @if (canViewInstitutions()) {
              <a routerLink="/institutions" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
                <svg lucideBuilding2 class="h-4 w-4 shrink-0"></svg>
                @if (sidebar.showLabels()) { <span>Institutions</span> }
              </a>
            }
            @if (canViewBranches()) {
              <a routerLink="/branches" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
                <svg lucideBuilding2 class="h-4 w-4 shrink-0"></svg>
                @if (sidebar.showLabels()) { <span>Branches</span> }
              </a>
            }
            @if (canViewLibraries()) {
              <a routerLink="/libraries" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
                <svg lucideBookOpen class="h-4 w-4 shrink-0"></svg>
                @if (sidebar.showLabels()) { <span>Libraries</span> }
              </a>
            }
            @if (canViewSubscriptions()) {
              <a routerLink="/subscriptions" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
                <svg lucideCreditCard class="h-4 w-4 shrink-0"></svg>
                @if (sidebar.showLabels()) { <span>Subscriptions</span> }
              </a>
            }
          </div> 
        }

        @if (canViewBooks()) {
          <div class="px-3 py-2">
            @if (sidebar.showLabels()) { <p class="label-mono px-2 pb-1">Library</p> }
            <a routerLink="/books" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
              <svg lucideBookOpen class="h-4 w-4 shrink-0"></svg>
              @if (sidebar.showLabels()) { <span>Books</span> }
            </a>
          </div>
        }

        <div class="px-3 py-2">
          @if (sidebar.showLabels()) { <p class="label-mono px-2 pb-1">Admin</p> }
          @if (canListUsers()) {
            <a routerLink="/users" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
              <svg lucideUserCog class="h-4 w-4 shrink-0"></svg>
              @if (sidebar.showLabels()) { <span>Users</span> }
            </a>
          }
          @if (canListRoles()) {
            <a routerLink="/roles" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
              <svg lucideUserCog class="h-4 w-4 shrink-0"></svg>
              @if (sidebar.showLabels()) { <span>Roles</span> }
            </a>
          }
          <a routerLink="/profile" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
            <svg lucideUser class="h-4 w-4 shrink-0"></svg>
            @if (sidebar.showLabels()) { <span>Profile</span> }
          </a>
          <a routerLink="/support" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60" (click)="sidebar.closeMobile()">
            <svg lucideLifeBuoy class="h-4 w-4 shrink-0"></svg>
            @if (sidebar.showLabels()) { <span>Support</span> }
          </a>
        </div>
      </nav>

      <div class="border-t px-3 py-2 label-mono">
        {{ sidebar.showLabels() ? '© Lexora Institute' : '©' }}
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  protected readonly sidebar = inject(SidebarService);
  private readonly auth = inject(AuthService);

  protected canViewDashboard(): boolean {
    return this.auth.hasPermission(PermissionKey.DashboardView) || this.auth.hasPermission(PermissionKey.DashboardList);
  }

  protected canViewMembers(): boolean {
    return this.auth.hasPermission(PermissionKey.MembersList) || this.auth.hasPermission(PermissionKey.MembersView);
  }

  protected canViewAttendance(): boolean {
    return this.auth.hasPermission(PermissionKey.AttendanceView) || this.auth.hasPermission(PermissionKey.AttendanceList);
  }

  protected canViewInstitutions(): boolean {
    return this.auth.hasPermission(PermissionKey.InstitutionsList) || this.auth.hasPermission(PermissionKey.InstitutionsView);
  }

  protected canViewBranches(): boolean {
    return this.auth.hasPermission(PermissionKey.BranchesList) || this.auth.hasPermission(PermissionKey.BranchesView);
  }

  protected canViewLibraries(): boolean {
    return this.auth.hasPermission(PermissionKey.LibrariesList) || this.auth.hasPermission(PermissionKey.LibrariesView);
  }

  protected canViewSubscriptions(): boolean {
    return this.auth.hasPermission(PermissionKey.SubscriptionsView) || this.auth.hasPermission(PermissionKey.SubscriptionsList);
  }

  protected canViewBooks(): boolean {
    return this.auth.hasPermission(PermissionKey.BooksList) || this.auth.hasPermission(PermissionKey.BooksView);
  }

  protected canListUsers(): boolean {
    return this.auth.hasPermission(PermissionKey.UsersList);
  }

  protected canListRoles(): boolean {
    return this.auth.hasPermission(PermissionKey.RolesList);
  }

  protected canUseScanner(): boolean {
    return this.auth.hasPermission(PermissionKey.AttendanceScannerUse);
  }
}
