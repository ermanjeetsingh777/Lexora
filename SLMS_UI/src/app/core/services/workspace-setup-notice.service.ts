import { Injectable, signal } from '@angular/core';

const WORKSPACE_NOTICE_KEY = 'lexora_auto_workspace_notice_v1';

/** Names the API generated when a tenant registered with WorkspaceSetupMode.Auto. */
export interface AutoWorkspaceNotice {
  email: string;
  institutionName: string;
  branchName: string;
  libraryName: string;
}

/**
 * Remembers that a workspace was created automatically at sign-up so the dashboard can
 * tell the owner what exists and where to rename it. Kept client-side: the API has no
 * "was this auto-created" flag, and the notice is a one-time nudge, not real state.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceSetupNoticeService {
  private readonly _notice = signal<AutoWorkspaceNotice | null>(this.read());

  readonly notice = this._notice.asReadonly();

  remember(notice: AutoWorkspaceNotice): void {
    try {
      localStorage.setItem(WORKSPACE_NOTICE_KEY, JSON.stringify(notice));
    } catch {
      // Storage unavailable (private mode) — the banner just won't show.
    }
    this._notice.set(notice);
  }

  dismiss(): void {
    try {
      localStorage.removeItem(WORKSPACE_NOTICE_KEY);
    } catch {
      // Ignore — the signal below still hides the banner for this session.
    }
    this._notice.set(null);
  }

  /** The notice belongs to the account that registered, not to whoever signs in next. */
  noticeFor(email: string | null | undefined): AutoWorkspaceNotice | null {
    const notice = this._notice();
    if (!notice || !email) {
      return null;
    }
    return notice.email.toLowerCase() === email.toLowerCase() ? notice : null;
  }

  private read(): AutoWorkspaceNotice | null {
    try {
      const raw = localStorage.getItem(WORKSPACE_NOTICE_KEY);
      return raw ? (JSON.parse(raw) as AutoWorkspaceNotice) : null;
    } catch {
      return null;
    }
  }
}
