import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Role } from '@core/models/auth.model';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { LucideShield, LucideUser, LucideUsers } from '@lucide/angular';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputDirective } from '@shared/components/input/input.directive';
import { LabelDirective } from '@shared/components/label/label.directive';
import { AuthLayoutComponent } from 'src/app/layouts/auth-layout/auth-layout.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoginRequest } from '@core/models/AuthResponse.model';
import { OnboardingSteps } from '@core/enums/OnbardingSteps';
import { CommonService } from '@core/services/common.service';
import { MemberPortalService } from '@core/services/member-portal.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    AuthLayoutComponent,
    InputDirective,
    LabelDirective,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private readonly CommonService = inject(CommonService);
  private readonly memberPortal = inject(MemberPortalService);

  readonly email = signal('');
  readonly password = signal('');
  readonly loader = signal(false);
  readonly showDemoLogin = !environment.production;

  submit() {
    this.performLogin({
      email: this.email(),
      password: this.password(),
    });
  }

  loginAsDemo(): void {
    this.performLogin({
      email: environment.email,
      password: environment.password,
    });
  }

  private performLogin(request: LoginRequest): void {
    if (this.loader()) {
      return;
    }

    this.loader.set(true);

    this.auth.login(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          if (this.auth.isMemberPortalUser()) {
            this.memberPortal.resolveMemberId(true).subscribe((memberId) => {
              if (memberId) {
                void this.router.navigate(['/members', memberId]);
              } else {
                this.toast.error('Member profile not found for this account.');
              }
            });
          } else {
            this.getRedirect(response.data.user.onboardingStep);
          }
        } else {
          this.toast.error(response.message || 'Unable to sign in. Please try again.');
        }
        this.loader.set(false);
      },
      error: (error) => {
        this.toast.error(error.error?.message || 'Unable to sign in. Please try again.');
        this.loader.set(false);
      },
    });
  }

  private getRedirect(onboardingStep: OnboardingSteps) {
    const config = this.CommonService.onboardingConfig[onboardingStep] ?? { route: '/dashboard', message: '' };
    this.toast.info(config.message ?? '');
    this.router.navigate([config.route]);
  }
}
