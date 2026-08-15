import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideSearch } from '@lucide/angular';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { GlassCardComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { AdminService } from '@core/services/admin.service';
import { AdminUser } from '@core/models/admin.models';
import { ToastService } from '@core/services/toast.service';
import { PermissionKey } from '@core/constants/permissions';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    PageHeaderComponent, GlassCardComponent, StatusBadgeComponent,
    LucideSearch,
  ],
  template: `
    <app-page-header
      title="Users"
      description="Manage platform accounts, roles and access."
    />

    <app-glass-card class="mt-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div class="relative max-w-sm flex-1">
          <svg lucideSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></svg>
          <input
            type="search"
            class="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
            placeholder="Search by name, email or username…"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
          />
        </div>
        <p class="text-sm text-muted-foreground">{{ filtered().length }} user(s)</p>
      </div>

      @if (loading()) {
        <p class="py-12 text-center text-sm text-muted-foreground">Loading users…</p>
      } @else if (error()) {
        <p class="py-12 text-center text-sm text-destructive">{{ error() }}</p>
      } @else if (!filtered().length) {
        <p class="py-12 text-center text-sm text-muted-foreground">No users match your search.</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="pb-2 font-medium">User</th>
                <th class="pb-2 font-medium">Roles</th>
                <th class="pb-2 font-medium">Status</th>
                <th class="pb-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              @for (user of filtered(); track user.id) {
                <tr class="border-b last:border-0">
                  <td class="py-3 pr-4">
                    <div class="font-medium">{{ user.fullName || user.userName || '—' }}</div>
                    <div class="text-xs text-muted-foreground">{{ user.email }}</div>
                  </td>
                  <td class="py-3 pr-4">
                    <div class="flex flex-wrap gap-1">
                      @for (role of user.roles; track role) {
                        <span class="rounded-md bg-muted px-2 py-0.5 text-xs">{{ role }}</span>
                      }
                    </div>
                  </td>
                  <td class="py-3 pr-4">
                    <app-status-badge [status]="user.isActive ? 'Active' : 'Inactive'" />
                  </td>
                  <td class="py-3 text-muted-foreground">{{ user.createdAtUtc | date: 'mediumDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </app-glass-card>
  `,
})
export class UsersListComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly users = signal<AdminUser[]>([]);
  readonly query = signal('');

  readonly canList = this.auth.hasPermission(PermissionKey.UsersList);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.users();
    if (!q) return list;
    return list.filter((u) =>
      (u.fullName ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.userName ?? '').toLowerCase().includes(q) ||
      u.roles.some((r) => r.toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    if (!this.canList) {
      this.error.set('You do not have permission to list users.');
      this.loading.set(false);
      return;
    }

    this.admin.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load users.');
        this.loading.set(false);
        this.toast.error('Failed to load users');
      },
    });
  }
}
