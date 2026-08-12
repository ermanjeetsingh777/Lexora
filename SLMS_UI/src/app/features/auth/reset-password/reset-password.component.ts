import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputDirective } from '@shared/components/input/input.directive';
import { LabelDirective } from '@shared/components/label/label.directive';
import { AuthLayoutComponent } from 'src/app/layouts/auth-layout/auth-layout.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [AuthLayoutComponent, ButtonComponent, InputDirective, LabelDirective],
  template: `
    <app-auth-layout eyebrow="Account recovery" title="Choose a new password" subtitle="Use a strong, unique password to help protect your account.">
      <form class="space-y-4" (submit)="onSubmit()">
        <div class="space-y-1.5">
          <label appLabel for="password">New password</label>
          <input appInput id="password" type="password" required />
        </div>
        <div class="space-y-1.5">
          <label appLabel for="confirm">Confirm password</label>
          <input appInput id="confirm" type="password" required />
        </div>
        <app-button type="submit" class="w-full" [disabled]="busy()"> {{ busy() ? 'Updating…' : 'Update password' }}</app-button>
      </form>
    </app-auth-layout>
  `,
})
export class ResetPasswordComponent {
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  
  email = this.route.snapshot.queryParamMap.get('email') ?? '';
  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  password = '';

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  async onSubmit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      // await this.auth.resetPassword(this.email, this.token, this.password);
      this.success.set(true);
      setTimeout(() => this.router.navigate(['/login']), 1200);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
