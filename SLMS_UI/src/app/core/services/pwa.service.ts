import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PwaService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  private deferredPrompt: any = null;

  readonly canInstall = signal(false);
  readonly isInstalled = signal(false);
  readonly isIOS = signal(false);
  readonly hasUpdate = signal(false);
  readonly isDismissed = signal(false);

  constructor() {
    this.checkIfInstalled();
    this.checkIfIOS();
    this.listenForInstallPrompt();
    this.listenForUpdates();
  }

  private checkIfInstalled(): void {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    this.isInstalled.set(isStandalone);
  }

  private checkIfIOS(): void {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    this.isIOS.set(isIosDevice && !this.isInstalled());
  }

  private listenForInstallPrompt(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (!this.isDismissed()) {
        this.canInstall.set(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
    });
  }

  private listenForUpdates(): void {
    if (!this.swUpdate?.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.hasUpdate.set(true);
      });
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.canInstall.set(false);
      return choiceResult.outcome === 'accepted';
    } catch {
      return false;
    }
  }

  dismissInstallPrompt(): void {
    this.canInstall.set(false);
    this.isDismissed.set(true);
  }

  reloadForUpdate(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
