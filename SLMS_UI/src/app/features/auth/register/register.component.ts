import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '@core/models/AuthResponse.model';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputDirective } from '@shared/components/input/input.directive';
import { LabelDirective } from '@shared/components/label/label.directive';
import { AuthLayoutComponent } from 'src/app/layouts/auth-layout/auth-layout.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserTypes } from '@core/enums/OnbardingSteps';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthLayoutComponent, InputDirective, LabelDirective],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly busy = signal(false);
  readonly terms = signal(false);


  async submit() {
    if (this.password() !== this.confirmPassword()) {
      return;
    }

    this.busy.set(true);

    const request: RegisterRequest = {
      email: this.email(),
      password: this.password(),
      confirmPassword: this.confirmPassword(),
      name: this.name(),
      packageId: '44444444-4444-4444-4444-444444444444', // Replace with actual package ID if available
      userType: UserTypes.OrganizationOwner // Assuming the user type is OrganizationOwner for registration
    }
    this.auth.register(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.toast.success('Account created successfully. Continue to set up your institution.');
          this.router.navigate(['/onboarding/institution']);
        } else {
          this.toast.error(response.message || 'Sign-up failed');
        }
        this.busy.set(false);
      },
      error: (error) => {
        this.toast.error(error.error.message || 'Sign-up failed');
        this.busy.set(false);
      }
    });
  }
}
