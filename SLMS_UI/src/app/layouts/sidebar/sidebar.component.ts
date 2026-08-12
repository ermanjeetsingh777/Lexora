import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideArmchair, LucideBarChart3, LucideBell, LucideBookOpen, LucideBookUser,
  LucideBuilding2, LucideCalendarCheck, LucideCreditCard, LucideGraduationCap,
  LucideLayoutDashboard, LucideLifeBuoy, LucideScanLine, LucideSettings, LucideUserCog, LucideUsers,
} from '@lucide/angular';
import { SidebarService } from './sidebar.service';

/** Primary navigation rail. Ported 1:1 from `components/app-sidebar.tsx`. */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive,
    LucideLayoutDashboard, LucideBarChart3, LucideUsers, LucideGraduationCap, LucideBookUser,
    LucideArmchair, LucideCalendarCheck, LucideScanLine, LucideBuilding2, LucideBookOpen,
    LucideCreditCard, LucideBell, LucideUserCog, LucideSettings, LucideLifeBuoy,
  ],
  template: `
    <aside
      class="fixed inset-y-0 left-0 z-40 hidden md:flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200"
      [class.w-64]="!sidebar.collapsed()"
      [class.w-16]="sidebar.collapsed()"
    >
      <div class="border-b">
        <a routerLink="/dashboard" class="flex items-center gap-2 px-3 py-3">
          <div class="relative h-8 w-8 shrink-0 rounded-md bg-gradient-primary grid place-items-center text-primary-foreground font-mono font-bold">
            SL
            <span class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-sidebar"></span>
          </div>
          @if (!sidebar.collapsed()) {
            <div class="leading-tight">
              <div class="text-sm font-semibold tracking-tight">SmartLibrary</div>
              <div class="label-mono">v2.4 · Institutional</div>
            </div>
          }
        </a>
      </div>

      <nav class="flex-1 overflow-y-auto py-2">
        <div class="px-3 py-2">
          @if (!sidebar.collapsed()) { <p class="label-mono px-2 pb-1">Workspace</p> }
          <a routerLink="/dashboard" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" [routerLinkActiveOptions]="{ exact: true }" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideLayoutDashboard class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Dashboard</span> }
          </a>
          <a routerLink="/dashboard/analytics" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideBarChart3 class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Analytics</span> }
          </a>
        </div>

        <div class="px-3 py-2">
          @if (!sidebar.collapsed()) { <p class="label-mono px-2 pb-1">Operations</p> }
          <a routerLink="/members" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideUsers class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Members</span> }
          </a>
          <a routerLink="/students" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideGraduationCap class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Students</span> }
          </a>
          <a routerLink="/teachers" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideBookUser class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Teachers</span> }
          </a>
          <a routerLink="/seats" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideArmchair class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Seats</span> }
          </a>
          <a routerLink="/attendance" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideCalendarCheck class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Attendance</span> }
          </a>
          <a routerLink="/attendance/scanner" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideScanLine class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Scanner</span> }
          </a>
        </div>

        <div class="px-3 py-2">
          @if (!sidebar.collapsed()) { <p class="label-mono px-2 pb-1">Organization</p> }
          <a routerLink="/institutions" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideBuilding2 class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Institutions</span> }
          </a>
          <a routerLink="/branches" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideBuilding2 class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Branches</span> }
          </a>
          <a routerLink="/libraries" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideBookOpen class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Libraries</span> }
          </a>
          <a routerLink="/subscriptions" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideCreditCard class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Subscriptions</span> }
          </a>
          <a routerLink="/payments" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideCreditCard class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Payments</span> }
          </a>
        </div>

        <div class="px-3 py-2">
          @if (!sidebar.collapsed()) { <p class="label-mono px-2 pb-1">Insights</p> }
          <a routerLink="/reports" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideBarChart3 class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Reports</span> }
          </a>
          <a routerLink="/notifications" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideBell class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Notifications</span> }
          </a>
        </div>

        <div class="px-3 py-2">
          @if (!sidebar.collapsed()) { <p class="label-mono px-2 pb-1">Library</p> }
          <a routerLink="/books" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideBookOpen class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Books</span> }
          </a>
        </div>

        <div class="px-3 py-2">
          @if (!sidebar.collapsed()) { <p class="label-mono px-2 pb-1">Admin</p> }
          <a routerLink="/users" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideUserCog class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Users</span> }
          </a>
          <a routerLink="/roles" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideUserCog class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Roles</span> }
          </a>
          <a routerLink="/settings" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideSettings class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Settings</span> }
          </a>
          <a routerLink="/support" routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/60">
            <svg lucideLifeBuoy class="h-4 w-4 shrink-0"></svg>
            @if (!sidebar.collapsed()) { <span>Support</span> }
          </a>
        </div>
      </nav>

      <div class="border-t px-3 py-2 label-mono">
        {{ sidebar.collapsed() ? '©' : '© Meridian Institute' }}
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  protected readonly sidebar = inject(SidebarService);
}
