import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDownload, LucideRefreshCw, LucideShare, LucideSmartphone, LucideX } from '@lucide/angular';
import { PwaService } from '@core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule, LucideSmartphone, LucideDownload, LucideX, LucideRefreshCw, LucideShare],
  template: `
    <!-- New Version Available Toast -->
    @if (pwa.hasUpdate()) {
      <div
        class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-xl border border-primary/20 bg-background/95 backdrop-blur-md p-4 shadow-2xl flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <svg lucideRefreshCw class="h-5 w-5 animate-spin"></svg>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-foreground">Update Available</h4>
            <p class="text-[11px] text-muted-foreground">A new version of Lexora is ready.</p>
          </div>
        </div>
        <button
          type="button"
          (click)="pwa.reloadForUpdate()"
          class="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
        >
          Refresh
        </button>
      </div>
    }

    <!-- Install App Prompt (Android / Chrome / Edge Desktop) -->
    @if (pwa.canInstall() && !pwa.isInstalled() && !dismissed()) {
      <div
        class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[380px] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-xl p-4 shadow-2xl ring-1 ring-black/5"
      >
        <div class="flex items-start gap-3">
          <div class="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white grid place-items-center font-bold text-sm shadow-md shrink-0 ring-2 ring-white/20">
            SL
          </div>
          <div class="flex-1 min-w-0 pr-4">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-semibold text-foreground tracking-tight">Install Lexora App</h4>
              <span class="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">PWA</span>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Install on your device for full-screen experience and fast offline access.
            </p>
          </div>
          <button
            type="button"
            (click)="dismiss()"
            class="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted grid place-items-center transition-colors -mr-1 -mt-1"
            aria-label="Close"
          >
            <svg lucideX class="h-4 w-4"></svg>
          </button>
        </div>

        <div class="mt-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            (click)="dismiss()"
            class="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Not now
          </button>
          <button
            type="button"
            (click)="install()"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 transition-all active:scale-95"
          >
            <svg lucideDownload class="h-3.5 w-3.5"></svg>
            Install app
          </button>
        </div>
      </div>
    }

    <!-- iOS Add to Home Screen Helper Guide (Manual on Safari) -->
    @if (pwa.isIOS() && showIosGuide() && !dismissed()) {
      <div
        class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[360px] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-xl p-4 shadow-2xl"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white grid place-items-center font-bold text-xs shadow">
              SL
            </div>
            <div>
              <h4 class="text-xs font-semibold text-foreground">Install on iPhone / iPad</h4>
              <p class="text-[11px] text-muted-foreground">Add Lexora to your Home Screen</p>
            </div>
          </div>
          <button
            type="button"
            (click)="dismiss()"
            class="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted grid place-items-center"
            aria-label="Close"
          >
            <svg lucideX class="h-3.5 w-3.5"></svg>
          </button>
        </div>

        <div class="mt-3 text-xs text-muted-foreground space-y-1.5 bg-muted/40 rounded-lg p-2.5 border">
          <div class="flex items-center gap-2">
            <span class="font-bold text-foreground">1.</span>
            <span>Tap the <strong>Share</strong> button <svg lucideShare class="h-3.5 w-3.5 inline text-primary mx-0.5"></svg> in Safari.</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-foreground">2.</span>
            <span>Scroll down & tap <strong>"Add to Home Screen"</strong>.</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class PwaInstallBannerComponent {
  readonly pwa = inject(PwaService);
  readonly dismissed = signal(false);
  readonly showIosGuide = signal(true);

  async install(): Promise<void> {
    const installed = await this.pwa.promptInstall();
    if (installed) {
      this.dismissed.set(true);
    }
  }

  dismiss(): void {
    this.dismissed.set(true);
    this.pwa.dismissInstallPrompt();
  }
}
