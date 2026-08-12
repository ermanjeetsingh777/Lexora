import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputDirective } from '@shared/components/input/input.directive';
import { LabelDirective } from '@shared/components/label/label.directive';
import { AuthLayoutComponent } from 'src/app/layouts/auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, InputDirective, LabelDirective],
  template: `
    <app-auth-layout eyebrow="Account recovery" title="Reset your password" subtitle="Enter your registered email address, and we'll send you a secure password reset link." [hasFooter]="true">
      <form class="space-y-4" (submit)="onSubmit($event)">
        <div class="space-y-1.5">
          <label appLabel for="email">Email</label>
          <input appInput id="email" type="email" name="email" [(ngModel)]="email" required />
        </div>
        <app-button type="submit" class="w-full">Send recovery link</app-button>
      </form>

      <div footer><a routerLink="/login" class="text-primary hover:underline">Back to sign in</a></div>
    </app-auth-layout>
  `,
})
export class ForgotPasswordComponent {
  private readonly toast = inject(ToastService);
  readonly email = signal('admin@meridian.edu');

  onSubmit(event: Event): void {
    event.preventDefault();
    this.toast.success('Recovery link sent.');
  }
}
