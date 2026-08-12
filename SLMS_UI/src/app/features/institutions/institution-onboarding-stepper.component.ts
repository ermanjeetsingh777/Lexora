import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type OnboardingStepKey =
  | 'register'
  | 'profile'
  | 'branding'
  | 'contacts'
  | 'licenses'
  | 'subscription'
  | 'customization'
  | 'emailTemplates';

export interface OnboardingStep {
  key: OnboardingStepKey;
  label: string;
  description?: string;
}

@Component({
  selector: 'app-institution-onboarding-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold tracking-tight">Onboarding status</div>
          <div class="mt-0.5 text-xs text-[var(--muted-foreground)]">Track institution setup completion.</div>
        </div>
        <div
          class="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs font-medium"
        >
          <span class="h-2 w-2 rounded-full bg-[var(--primary)]"></span>
          {{ completedCount() }} / {{ steps.length }} completed
        </div>
      </div>

      <div class="grid gap-2">
        @for (s of steps; track s.key) {
          <div class="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div
              class="mt-0.5 h-8 w-8 shrink-0 rounded-full border flex items-center justify-center"
              [ngClass]="{
                'border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10': isCompleted(s.key),
                'border-[var(--muted-foreground)] text-[var(--muted-foreground)] bg-[var(--background)]': !isCompleted(s.key)
              }"
            >
              @if (isCompleted(s.key)) {
                <span class="text-xs font-bold">✓</span>
              } @else {
                <span class="text-xs font-bold">•</span>
              }
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold">{{ s.label }}</div>
              @if (s.description) {
                <div class="mt-0.5 text-xs text-[var(--muted-foreground)]">{{ s.description }}</div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class InstitutionOnboardingStepperComponent {
  @Input({ required: true }) completedKeys: OnboardingStepKey[] = [];

  readonly steps: OnboardingStep[] = [
    { key: 'register', label: 'Registration' },
    { key: 'profile', label: 'Profile' },
    { key: 'branding', label: 'Logo & branding' },
    { key: 'contacts', label: 'Contact information' },
    { key: 'licenses', label: 'Licenses' },
    { key: 'subscription', label: 'Subscription plan' },
    { key: 'customization', label: 'Customization' },
    { key: 'emailTemplates', label: 'Email templates' },
  ];

  isCompleted(key: OnboardingStepKey): boolean {
    return this.completedKeys.includes(key);
  }

  completedCount(): number {
    return this.steps.filter((s) => this.isCompleted(s.key)).length;
  }
}

