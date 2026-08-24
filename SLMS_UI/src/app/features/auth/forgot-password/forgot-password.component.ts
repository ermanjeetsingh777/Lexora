import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputDirective } from '@shared/components/input/input.directive';
import { LabelDirective } from '@shared/components/label/label.directive';
import { AuthLayoutComponent } from 'src/app/layouts/auth-layout/auth-layout.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, InputDirective, LabelDirective],
  template: `
    <app-auth-layout
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter your registered email address and we'll send a password reset mail with a secure link."
      [hasFooter]="true">
      <form #forgotForm="ngForm" class="space-y-4" (ngSubmit)="onSubmit(forgotForm)">
        <div class="space-y-1.5">
          <label appLabel for="email">Email</label>
          <input
            appInput
            id="email"
            type="email"
            name="email"
            [(ngModel)]="email"
            #emailCtrl="ngModel"
            required
            email
            [disabled]="busy()" />
          @if (emailCtrl.invalid && (emailCtrl.touched || forgotForm.submitted)) {
            <p class="text-xs text-red-500">Enter a valid email address.</p>
          }
        </div>

        @if (sent()) {
          <p class="text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-2">
            Check your inbox for the reset mail. If SMTP is not configured in development, see the API logs for the reset link.
          </p>
        }

        <app-button type="submit" class="w-full" [disabled]="busy() || !!forgotForm.invalid">
          {{ busy() ? 'Sending mail…' : 'Send mail' }}
        </app-button>
      </form>

      <div footer><a routerLink="/login" class="text-primary hover:underline">Back to sign in</a></div>
    </app-auth-layout>
  `,
})
export class ForgotPasswordComponent {
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  email = '';
  readonly busy = signal(false);
  readonly sent = signal(false);

  onSubmit(form: NgForm): void {
    if (!!form.invalid || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.sent.set(false);

    this.auth.forgotPassword({ email: this.email.trim() }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (response) => {
        this.sent.set(true);
        this.toast.success(response.message ?? response.data?.message ?? 'Reset mail sent.');
        this.busy.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Could not send reset mail.');
        this.busy.set(false);
      },
    });
  }
}
