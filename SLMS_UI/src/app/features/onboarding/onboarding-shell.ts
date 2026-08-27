import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { LucideLogOut } from '@lucide/angular';
import { environment } from '@env/environment';

@Component({
  selector: 'app-onboarding-shell',
  imports: [RouterOutlet, RouterLink, LucideLogOut],
  templateUrl: './onboarding-shell.html',
  styleUrl: './onboarding-shell.css',
})
export class OnboardingShell {
  private readonly auth = inject(AuthService);

  readonly appName = environment.appName;

  logout(): void {
    this.auth.logout();
  }
}
