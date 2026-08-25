import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '@core/models/AuthResponse.model';
import { PackageCatalogItem } from '@core/models/package-subscription.models';
import { AuthService } from '@core/services/auth.service';
import { PackageService } from '@core/services/package.service';
import { ToastService } from '@core/services/toast.service';
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
export class RegisterComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly packageService = inject(PackageService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly busy = signal(false);
  readonly terms = signal(false);
  readonly packages = signal<PackageCatalogItem[]>([]);
  readonly packagesLoading = signal(true);

  packageId = '';

  ngOnInit(): void {
    const preselectedPackageId = this.route.snapshot.queryParamMap.get('packageId') ?? '';

    this.packageService.getActivePackages().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (packages) => {
        this.packages.set(packages);
        const matched = packages.find((pkg) => pkg.id === preselectedPackageId);
        if (matched) {
          this.packageId = matched.id;
        } else if (packages.length === 1) {
          this.packageId = packages[0].id;
        }
        this.packagesLoading.set(false);
      },
      error: () => {
        this.toast.error('Could not load subscription packages.');
        this.packagesLoading.set(false);
      },
    });
  }

  packageLabel(pkg: PackageCatalogItem): string {
    const price = pkg.price > 0 ? `₹${pkg.price.toLocaleString('en-IN')}` : 'Free';
    return `${pkg.name} — ${price} / ${pkg.durationInDays} days`;
  }

  async submit() {
    if (this.password() !== this.confirmPassword()) {
      return;
    }

    if (!this.packageId) {
      this.toast.error('Please select a package.');
      return;
    }

    this.busy.set(true);

    const request: RegisterRequest = {
      email: this.email(),
      password: this.password(),
      confirmPassword: this.confirmPassword(),
      name: this.name(),
      packageId: this.packageId,
      userType: UserTypes.OrganizationOwner,
    };
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
