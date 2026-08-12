import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { AuthLayoutComponent } from 'src/app/layouts/auth-layout/auth-layout.component';

/** 6-digit one-time-code entry, replicating the shadcn `InputOTP` behaviour with plain inputs. */
@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [AuthLayoutComponent,  FormsModule, RouterLink],
  templateUrl: './verify-otp.component.html',
})
export class VerifyOtpComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  email = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('slms_otp_email') : null) ?? '';
  readonly step = signal<'email' | 'code'>('email');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly slots = [0, 1, 2, 3, 4, 5];
  readonly code = signal('');

  digitAt(index: number): string {
    return this.code().charAt(index);
  }

  onDigit(event: Event, index: number, current: HTMLInputElement): void {
    const value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1);
    const digits = this.code().split('');
    digits[index] = value;
    this.code.set(digits.join('').slice(0, 6));
    if (value && current.nextElementSibling instanceof HTMLInputElement) {
      current.nextElementSibling.focus();
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    // await this.auth.login('admin@meridian.edu', 'demo');
    this.toast.success('Verified.');
    await this.router.navigateByUrl('/dashboard');
  }

  async sendCode(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      // await this.auth.sendOtp(this.email);
      this.step.set('code');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async verify(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      // await this.auth.verifyOtp(this.email, this.code());
      await this.router.navigate(['/dashboard']);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
