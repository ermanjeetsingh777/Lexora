import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { StorageService } from '@core/services/storage.service';
import { QrScannerModalService } from '@core/services/qr-scanner-modal.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-non-auth-header',
  imports: [AppIconComponent, RouterLink, RouterLinkActive],
  templateUrl: './non-auth-header.html',
  styleUrl: './non-auth-header.css',
})
export class NonAuthHeader {
  protected readonly storageService = inject(StorageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly qrScanner = inject(QrScannerModalService);

  readonly mobileMenuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.closeMobileMenu();
      });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  openScanner(): void {
    this.closeMobileMenu();
    this.qrScanner.open();
  }
}
