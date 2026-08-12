import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LucideBell, LucideLogOut, LucideMoon, LucideSearch, LucideSun } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../sidebar/sidebar.service';
import { InputDirective } from '@shared/components/input/input.directive';
import { StorageService } from '@core/services/storage.service';

/** Sticky header with breadcrumbs, search, notifications, theme toggle and account menu. */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, InputDirective, LucideBell, LucideMoon, LucideSun, LucideSearch, LucideLogOut],
  template: `
    <header class="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-3 md:px-4">
      <button type="button" (click)="sidebar.toggle()" class="rounded-md border p-1.5 hover:bg-muted/50" aria-label="Toggle sidebar">
        <span class="block h-4 w-4">☰</span>
      </button>

      <!-- <nav class="hidden md:flex items-center gap-1.5 text-sm">
        @for (seg of segments(); track seg.href; let last = $last) {
          <span class="flex items-center gap-1.5">
            @if (!$first) { <span class="text-muted-foreground/50">/</span> }
            @if (last) {
              <span class="font-medium capitalize">{{ seg.label }}</span>
            } @else {
              <a [routerLink]="seg.href" class="text-muted-foreground hover:text-foreground capitalize">{{ seg.label }}</a>
            }
          </span>
        }
      </nav> -->

      <div class="ml-auto flex items-center gap-2">
        <div class="relative hidden md:block">
          <svg lucideSearch class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"></svg>
          <input appInput placeholder="Search members, seats, branches…" class="pl-8 h-9 w-72 bg-muted/40" />
        </div>

        <!-- <div class="relative">
          <button type="button" (click)="notifOpen.set(!notifOpen())" class="relative rounded-md p-2 hover:bg-accent" aria-label="Notifications">
            <svg lucideBell class="h-4 w-4"></svg>
            @if (unread() > 0) {
              <span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background"></span>
            }
          </button>
          @if (notifOpen()) {
            <div class="fixed inset-0 z-40" (click)="notifOpen.set(false)"></div>
            <div class="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-popover shadow-elegant">
              <div class="flex items-center justify-between border-b px-3 py-2">
                <div class="text-sm font-semibold">Notifications</div>
                <a routerLink="/notifications" class="text-xs text-primary hover:underline" (click)="notifOpen.set(false)">View all</a>
              </div>
              <div class="max-h-80 overflow-y-auto divide-y">
                @for (n of notifications; track n.id) {
                  <div class="p-3 hover:bg-muted/50">
                    <div class="flex items-center justify-between">
                      <div class="text-sm font-medium">{{ n.title }}</div>
                      <span class="label-mono">{{ n.timestamp }}</span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ n.message }}</p>
                  </div>
                }
              </div>
            </div>
          }
        </div> -->

        <button type="button" (click)="theme.toggle()" class="rounded-md p-2 hover:bg-accent" aria-label="Toggle theme">
          @if (theme.mode() === 'dark') {
            <svg lucideSun class="h-4 w-4"></svg>
          } @else {
            <svg lucideMoon class="h-4 w-4"></svg>
          }
        </button>

        <div class="relative">
          <button type="button" (click)="userOpen.set(!userOpen())" class="flex items-center gap-2 rounded-md border px-1 py-1 hover:bg-muted/50">
            <span class="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-semibold">{{ initials() }}</span>
            <span class="hidden md:block pr-2 text-left">
              <span class="block text-xs font-semibold leading-tight">{{storageService.user()?.fullName ?? storageService.user()?.userName }}</span>
              <span class="label-mono leading-tight">{{ storageService.user()?.roles }}</span>
            </span>
          </button>
          @if (userOpen()) {
            <div class="fixed inset-0 z-40" (click)="userOpen.set(false)"></div>
            <div class="absolute right-0 z-50 mt-2 w-56 rounded-md border bg-popover p-1 shadow-elegant">
              <div class="px-2 py-1.5">
                <div class="text-sm">{{storageService.user()?.fullName ?? storageService.user()?.userName }}</div>
                <div class="text-xs text-muted-foreground">{{ storageService.user()?.email }}</div>
              </div>
              <div class="my-1 h-px bg-border"></div>
              <a routerLink="/settings/profile" class="block rounded-sm px-2 py-1.5 text-sm hover:bg-muted" (click)="userOpen.set(false)">Profile</a>
              <a routerLink="/settings" class="block rounded-sm px-2 py-1.5 text-sm hover:bg-muted" (click)="userOpen.set(false)">Settings</a>
              <div class="my-1 h-px bg-border"></div>
              <button type="button" (click)="signOut()" class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted">
                <svg lucideLogOut class="mr-2 h-4 w-4"></svg> Sign out
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  protected readonly sidebar = inject(SidebarService);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  protected readonly storageService = inject(StorageService);
  private readonly router = inject(Router);

  readonly notifOpen = signal(false);
  readonly userOpen = signal(false);

  readonly initials = computed(() => {
    const name = this.storageService.user()?.fullName ?? this.storageService.user()?.userName ?? this.storageService.user()?.email;
    return name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly segments = computed(() => {
    const path = this.url().split('?')[0];
    const parts = path.split('/').filter(Boolean);
    return parts.map((seg, i) => ({
      href: '/' + parts.slice(0, i + 1).join('/'),
      label: seg.replace(/-/g, ' '),
    }));
  });

  async signOut(): Promise<void> {
    this.userOpen.set(false);
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
