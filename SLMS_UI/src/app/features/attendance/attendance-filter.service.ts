import { inject, Injectable, signal } from '@angular/core';
import { LibraryListItem } from '@core/models/library-list.models';
import { AuthService } from '@core/services/auth.service';
import { LibraryService } from '../../features/libraries/library.service';

@Injectable({ providedIn: 'root' })
export class AttendanceFilterService {
  private readonly libraryService = inject(LibraryService);
  private readonly auth = inject(AuthService);

  readonly libraries = signal<LibraryListItem[]>([]);
  readonly libraryId = signal('');
  readonly librariesLoaded = signal(false);

  readonly isSuperAdmin = () => this.auth.hasRole('SuperAdmin');

  loadLibraries(): void {
    this.libraryService.getListView({ status: 'active' }).subscribe({
      next: (view) => {
        this.libraries.set(view.items ?? []);
        this.librariesLoaded.set(true);
      },
      error: () => {
        this.libraries.set([]);
        this.librariesLoaded.set(true);
      },
    });
  }

  setLibraryId(value: string): void {
    this.libraryId.set(value);
  }

  libraryLabel(library: LibraryListItem): string {
    return `${library.name} · ${library.branchName}`;
  }
}
