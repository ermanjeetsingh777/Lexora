import { Injectable, signal } from '@angular/core';

export interface DashboardHeaderPatch {
  description?: string;
  title?: string;
  isSuperAdmin?: boolean;
  totalMembers?: number;
  totalLibraries?: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardHeaderService {
  private readonly patch = signal<DashboardHeaderPatch>({});

  readonly state = this.patch.asReadonly();

  reset(): void {
    this.patch.set({});
  }

  update(values: DashboardHeaderPatch): void {
    this.patch.update((current) => ({ ...current, ...values }));
  }
}
