import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { StorageService } from '@core/services/storage.service';
import { WorkspaceSetupNoticeService } from '@core/services/workspace-setup-notice.service';

/**
 * Shown once on the dashboard after signing up with "Create it for me", so the owner
 * knows which institution / branch / library were created and can rename them.
 */
@Component({
  selector: 'app-new-workspace-banner',
  standalone: true,
  imports: [RouterLink, AppIconComponent],
  template: `
    @if (notice(); as workspace) {
      <div
        class="rounded-xl border border-primary/20 bg-primary/5 p-4"
        role="status"
        aria-label="Workspace created automatically"
      >
        <div class="flex items-start gap-3">
          <div class="h-9 w-9 shrink-0 grid place-items-center rounded-lg bg-primary/10 text-primary">
            <app-icon name="sparkles" [size]="18" />
          </div>

          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold tracking-tight">Your workspace is ready</h4>
            <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
              We created these for you at sign-up. Rename or edit them any time — nothing is locked in.
            </p>

            <dl class="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
              <div class="flex items-center gap-1.5">
                <dt class="text-muted-foreground">Institution</dt>
                <dd class="font-medium">{{ workspace.institutionName }}</dd>
              </div>
              <div class="flex items-center gap-1.5">
                <dt class="text-muted-foreground">Branch</dt>
                <dd class="font-medium">{{ workspace.branchName }}</dd>
              </div>
              <div class="flex items-center gap-1.5">
                <dt class="text-muted-foreground">Library</dt>
                <dd class="font-medium">{{ workspace.libraryName }}</dd>
              </div>
            </dl>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <a
                routerLink="/institutions"
                (click)="dismiss()"
                class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                <app-icon name="pencil" [size]="13" />
                <span>Review &amp; rename</span>
              </a>
              <button
                type="button"
                (click)="dismiss()"
                class="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted cursorPointer"
              >
                Looks good
              </button>
            </div>
          </div>

          <button
            type="button"
            (click)="dismiss()"
            aria-label="Dismiss workspace notice"
            title="Dismiss"
            class="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursorPointer"
          >
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      </div>
    }
  `,
})
export class NewWorkspaceBannerComponent {
  private readonly storage = inject(StorageService);
  private readonly notices = inject(WorkspaceSetupNoticeService);

  protected readonly notice = computed(() => this.notices.noticeFor(this.storage.user()?.email));

  protected dismiss(): void {
    this.notices.dismiss();
  }
}
