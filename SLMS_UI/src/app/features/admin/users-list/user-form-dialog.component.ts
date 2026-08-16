import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { AdminRole, AdminUser } from '@core/models/admin.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { STAFF_ROLE_OPTIONS } from './users-list.util';

export interface UserFormSubmit {
  email: string;
  password: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
}

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent, LucideX],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.css',
})
export class UserFormDialogComponent {
  readonly open = input(false);
  readonly user = input<AdminUser | null>(null);
  readonly roles = input<AdminRole[]>([]);
  readonly busy = input(false);
  readonly overlayLeft = input('0');

  readonly submitted = output<UserFormSubmit>();
  readonly closed = output<void>();

  readonly email = signal('');
  readonly password = signal('');
  readonly fullName = signal('');
  readonly isActive = signal(true);
  readonly selectedRole = signal('');

  readonly staffRoleOptions = STAFF_ROLE_OPTIONS;

  readonly isEdit = () => !!this.user();

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const u = this.user();
      if (u) {
        this.email.set(u.email ?? '');
        this.password.set('');
        this.fullName.set(u.fullName ?? '');
        this.isActive.set(u.isActive);
        this.selectedRole.set(u.roles[0] ?? '');
      } else {
        this.email.set('');
        this.password.set('');
        this.fullName.set('');
        this.isActive.set(true);
        this.selectedRole.set('Librarians');
      }
    });
  }

  roleDescription(roleName: string): string {
    return this.staffRoleOptions.find((r) => r.key === roleName)?.description ?? '';
  }

  roleLabel(roleName: string): string {
    return this.staffRoleOptions.find((r) => r.key === roleName)?.label ?? roleName;
  }

  onClose(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    const role = this.selectedRole();
    this.submitted.emit({
      email: this.email().trim(),
      password: this.password(),
      fullName: this.fullName().trim(),
      isActive: this.isActive(),
      roles: role ? [role] : [],
    });
  }
}
