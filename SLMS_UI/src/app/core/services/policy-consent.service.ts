import { Injectable, signal } from '@angular/core';

const POLICY_CONSENT_KEY = 'lexora_policy_consent_accepted_v1';

@Injectable({ providedIn: 'root' })
export class PolicyConsentService {
  private readonly _accepted = signal(this.readAccepted());

  readonly accepted = this._accepted.asReadonly();

  hasAccepted(): boolean {
    return this._accepted();
  }

  accept(): void {
    localStorage.setItem(POLICY_CONSENT_KEY, new Date().toISOString());
    this._accepted.set(true);
  }

  private readAccepted(): boolean {
    try {
      return localStorage.getItem(POLICY_CONSENT_KEY) === 'true' || !!localStorage.getItem(POLICY_CONSENT_KEY);
    } catch {
      return false;
    }
  }
}
