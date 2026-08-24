import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputDirective } from '@shared/components/input/input.directive';
import { LabelDirective } from '@shared/components/label/label.directive';
import { AuthLayoutComponent } from 'src/app/layouts/auth-layout/auth-layout.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, AuthLayoutComponent, ButtonComponent, InputDirective, LabelDirective],
  template: `
    <app-auth-layout
      eyebrow="Account recovery"
      title="Choose a new password"
      subtitle="Use a strong, unique password to help protect your account.">
      <form #resetForm="ngForm" class="space-y-4" (ngSubmit)="onSubmit(resetForm)">
        @if (!email || !token) {
          <p class="text-sm text-red-500 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
            This reset link is invalid or expired. Request a new mail from the forgot password page.
          </p>
        } @else {
          <div class="space-y-1.5">
            <label appLabel for="password">New password</label>
            <input
              appInput
              id="password"
              name="password"
              type="password"
              [(ngModel)]="password"
              #passwordCtrl="ngModel"
              required
              minlength="8"
              [disabled]="busy()" />
          </div>
          <div class="space-y-1.5">
            <label appLabel for="confirm">Confirm password</label>
            <input
              appInput
              id="confirm"
              name="confirm"
              type="password"
              [(ngModel)]="confirmPassword"
              #confirmCtrl="ngModel"
              required
              [disabled]="busy()" />
            @if (confirmPassword && password !== confirmPassword) {
              <p class="text-xs text-red-500">Passwords do not match.</p>
            }
          </div>
          @if (error()) {
            <p class="text-sm text-red-500">{{ error() }}</p>
          }
          <app-button
            type="submit"
            class="w-full"
            [disabled]="busy() || !!resetForm.invalid || password !== confirmPassword">
            {{ busy() ? 'Updating…' : 'Update password' }}
          </app-button>
        }
      </form>
    </app-auth-layout>
  `,
})
export class ResetPasswordComponent {
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  password = '';
  confirmPassword = '';

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  onSubmit(form: NgForm): void {
    if (!this.email || !this.token || !!form.invalid || this.busy() || this.password !== this.confirmPassword) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    this.auth.resetPassword({
      email: this.email,
      token: this.token,
      newPassword: this.password,
      confirmPassword: this.confirmPassword,
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (response) => {
        this.toast.success(response.message ?? response.data?.message ?? 'Password updated.');
        this.router.navigate(['/login']);
        this.busy.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Could not reset password.';
        this.error.set(message);
        this.toast.error(message);
        this.busy.set(false);
      },
    });
  }
}
