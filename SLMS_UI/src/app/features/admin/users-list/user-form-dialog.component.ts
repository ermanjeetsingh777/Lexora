import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { AdminRole, AdminUser } from '@core/models/admin.models';
import {
  BranchDropdownResponse,
  InstitutionDropdownResponse,
  LibraryDropdownResponse,
} from '@core/models/institution-dropdown.model';
import { ButtonComponent } from '@shared/components/button/button.component';
import { STAFF_ROLE_OPTIONS } from './users-list.util';

export interface UserInstitutionScope {
  institutionId: string;
  branchIds: string[];
  libraryIds: string[];
}

export interface UserFormSubmit {
  email: string;
  password: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
  institutionScopes: UserInstitutionScope[];
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
  readonly statusLocked = input(false);
  readonly scopeOptions = input<InstitutionDropdownResponse[]>([]);
  readonly canAssignRoles = input(true);

  readonly submitted = output<UserFormSubmit>();
  readonly closed = output<void>();

  readonly email = signal('');
  readonly password = signal('');
  readonly fullName = signal('');
  readonly isActive = signal(true);
  readonly selectedRole = signal('');
  readonly selectedInstitutionIds = signal<string[]>([]);
  readonly branchIdsByInstitution = signal<Record<string, string[]>>({});
  readonly libraryIdsByInstitution = signal<Record<string, string[]>>({});

  readonly staffRoleOptions = STAFF_ROLE_OPTIONS;

  readonly isEdit = () => !!this.user();

  readonly selectedInstitutions = computed(() =>
    this.scopeOptions().filter((item) =>
      this.selectedInstitutionIds().includes(String(item.value)),
    ),
  );

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

        const scopes = u.accessScope?.institutionScopes ?? [];
        if (scopes.length > 0) {
          this.selectedInstitutionIds.set(scopes.map((s) => s.institutionId));
          this.branchIdsByInstitution.set(
            Object.fromEntries(scopes.map((s) => [s.institutionId, s.branches.map((b) => b.id)])),
          );
          this.libraryIdsByInstitution.set(
            Object.fromEntries(scopes.map((s) => [s.institutionId, s.libraries.map((l) => l.id)])),
          );
        } else if (u.accessScope?.institutionId) {
          const institutionId = u.accessScope.institutionId;
          this.selectedInstitutionIds.set([institutionId]);
          this.branchIdsByInstitution.set({
            [institutionId]: (u.accessScope.branches ?? []).map((b) => b.id),
          });
          this.libraryIdsByInstitution.set({
            [institutionId]: (u.accessScope.libraries ?? []).map((l) => l.id),
          });
        } else {
          this.resetScope();
        }
      } else {
        this.email.set('');
        this.password.set('');
        this.fullName.set('');
        this.isActive.set(true);
        this.selectedRole.set('Librarians');
        this.resetScope();
      }
    });
  }

  roleDescription(roleName: string): string {
    return this.staffRoleOptions.find((r) => r.key === roleName)?.description ?? '';
  }

  roleLabel(roleName: string): string {
    return this.staffRoleOptions.find((r) => r.key === roleName)?.label ?? roleName;
  }

  isInstitutionSelected(institutionId: string): boolean {
    return this.selectedInstitutionIds().includes(institutionId);
  }

  toggleInstitution(institutionId: string, checked: boolean): void {
    const next = new Set(this.selectedInstitutionIds());
    if (checked) next.add(institutionId);
    else next.delete(institutionId);
    this.selectedInstitutionIds.set(Array.from(next));

    if (!checked) {
      const branches = { ...this.branchIdsByInstitution() };
      const libraries = { ...this.libraryIdsByInstitution() };
      delete branches[institutionId];
      delete libraries[institutionId];
      this.branchIdsByInstitution.set(branches);
      this.libraryIdsByInstitution.set(libraries);
    }
  }

  branchesForInstitution(institution: InstitutionDropdownResponse): BranchDropdownResponse[] {
    return institution.branches ?? [];
  }

  librariesForInstitution(institution: InstitutionDropdownResponse): LibraryDropdownResponse[] {
    const institutionId = String(institution.value);
    const branchIds = new Set(this.branchIdsByInstitution()[institutionId] ?? []);
    return this.branchesForInstitution(institution)
      .filter((branch) => branchIds.size === 0 || branchIds.has(String(branch.value)))
      .flatMap((branch) => branch.libraries ?? []);
  }

  toggleBranch(institutionId: string, branchId: string, checked: boolean): void {
    const current = new Set(this.branchIdsByInstitution()[institutionId] ?? []);
    if (checked) current.add(branchId);
    else current.delete(branchId);
    this.branchIdsByInstitution.set({
      ...this.branchIdsByInstitution(),
      [institutionId]: Array.from(current),
    });
    this.pruneLibraries(institutionId);
  }

  toggleLibrary(institutionId: string, libraryId: string, checked: boolean): void {
    const current = new Set(this.libraryIdsByInstitution()[institutionId] ?? []);
    if (checked) current.add(libraryId);
    else current.delete(libraryId);
    this.libraryIdsByInstitution.set({
      ...this.libraryIdsByInstitution(),
      [institutionId]: Array.from(current),
    });
  }

  isBranchSelected(institutionId: string, branchId: string): boolean {
    return (this.branchIdsByInstitution()[institutionId] ?? []).includes(branchId);
  }

  isLibrarySelected(institutionId: string, libraryId: string): boolean {
    return (this.libraryIdsByInstitution()[institutionId] ?? []).includes(libraryId);
  }

  idValue(value: string | number): string {
    return String(value);
  }

  onClose(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    const role = this.selectedRole();
    const institutionScopes: UserInstitutionScope[] = this.selectedInstitutionIds().map(
      (institutionId) => ({
        institutionId,
        branchIds: this.branchIdsByInstitution()[institutionId] ?? [],
        libraryIds: this.libraryIdsByInstitution()[institutionId] ?? [],
      }),
    );

    this.submitted.emit({
      email: this.email().trim(),
      password: this.password(),
      fullName: this.fullName().trim(),
      isActive: this.isActive(),
      roles: role ? [role] : [],
      institutionScopes,
    });
  }

  private resetScope(): void {
    this.selectedInstitutionIds.set([]);
    this.branchIdsByInstitution.set({});
    this.libraryIdsByInstitution.set({});
  }

  private pruneLibraries(institutionId: string): void {
    const allowed = new Set(
      this.librariesForInstitution(
        this.scopeOptions().find((item) => String(item.value) === institutionId) ?? {
          key: '',
          value: institutionId,
          branches: [],
        },
      ).map((library) => String(library.value)),
    );
    this.libraryIdsByInstitution.set({
      ...this.libraryIdsByInstitution(),
      [institutionId]: (this.libraryIdsByInstitution()[institutionId] ?? []).filter((id) =>
        allowed.has(id),
      ),
    });
  }
}
