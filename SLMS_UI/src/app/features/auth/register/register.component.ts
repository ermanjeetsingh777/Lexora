import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '@core/models/AuthResponse.model';
import { AddonCatalogItem, PackageCatalogItem } from '@core/models/package-subscription.models';
import { AuthService } from '@core/services/auth.service';
import { PackageService } from '@core/services/package.service';
import { AddonService } from '@core/services/addon.service';
import { ToastService } from '@core/services/toast.service';
import { InputDirective } from '@shared/components/input/input.directive';
import { LabelDirective } from '@shared/components/label/label.directive';
import { AuthLayoutComponent } from 'src/app/layouts/auth-layout/auth-layout.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserTypes } from '@core/enums/OnbardingSteps';

export interface SelectedAddonState {
  addon: AddonCatalogItem;
  quantity: number;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthLayoutComponent, InputDirective, LabelDirective],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly packageService = inject(PackageService);
  private readonly addonService = inject(AddonService);
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
  readonly addons = signal<AddonCatalogItem[]>([]);
  readonly packagesLoading = signal(true);
  readonly selectedAddonQuantities = signal<Record<string, number>>({});
  readonly showAddons = signal(false);
  readonly isPackageLocked = signal(false);

  readonly selectedPackageId = signal<string>('');

  get packageId(): string {
    return this.selectedPackageId();
  }

  set packageId(val: string) {
    this.selectedPackageId.set(val);
  }

  readonly selectedPackage = computed(() => {
    const id = this.selectedPackageId();
    return this.packages().find((p) => p.id === id) ?? null;
  });

  readonly isTrialSelected = computed(() => {
    const pkg = this.selectedPackage();
    if (!pkg) return false;
    return pkg.price <= 0 ||
           (pkg.code?.toLowerCase() === 'trial') ||
           (pkg.name?.toLowerCase() === 'trial');
  });

  readonly addonsTotal = computed(() => {
    if (this.isTrialSelected()) return 0;
    const quantities = this.selectedAddonQuantities();
    return this.addons().reduce((acc, addon) => {
      const qty = quantities[addon.id] || 0;
      return acc + (qty * addon.price);
    }, 0);
  });

  readonly grandTotal = computed(() => {
    const pkg = this.selectedPackage();
    const pkgPrice = pkg?.price ?? 0;
    return pkgPrice + this.addonsTotal();
  });

  ngOnInit(): void {
    const preselectedPackageId = this.route.snapshot.queryParamMap.get('packageId') ?? '';

    this.packageService.getActivePackages().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (packages) => {
        this.packages.set(packages);
        const matched = packages.find((pkg) => pkg.id === preselectedPackageId);
        if (matched) {
          this.packageId = matched.id;
          this.isPackageLocked.set(true);
        } else if (packages.length > 0) {
          // Default to Basic or first package
          const basic = packages.find((p) => p.code === 'Basic') ?? packages[0];
          this.packageId = basic.id;
          this.isPackageLocked.set(false);
        }
        this.packagesLoading.set(false);
      },
      error: () => {
        this.toast.error('Could not load subscription packages.');
        this.packagesLoading.set(false);
      },
    });

    this.addonService.getActiveAddons().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (addons) => {
        this.addons.set(addons);
      },
      error: () => {
        // Addons are optional
      }
    });
  }

  packageLabel(pkg: PackageCatalogItem): string {
    const price = pkg.price > 0 ? `₹${pkg.price.toLocaleString('en-IN')}` : 'Free';
    return `${pkg.name} — ${price} / ${pkg.durationInDays} days`;
  }

  toggleAddon(addonId: string) {
    const current = { ...this.selectedAddonQuantities() };
    if (current[addonId]) {
      delete current[addonId];
    } else {
      current[addonId] = 1;
    }
    this.selectedAddonQuantities.set(current);
  }

  updateAddonQuantity(addonId: string, delta: number) {
    const current = { ...this.selectedAddonQuantities() };
    const currentQty = current[addonId] || 0;
    const newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) {
      delete current[addonId];
    } else {
      current[addonId] = newQty;
    }
    this.selectedAddonQuantities.set(current);
  }

  isAddonSelected(addonId: string): boolean {
    return (this.selectedAddonQuantities()[addonId] || 0) > 0;
  }

  getAddonQuantity(addonId: string): number {
    return this.selectedAddonQuantities()[addonId] || 0;
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

    const selectedAddonsList = Object.entries(this.selectedAddonQuantities())
      .filter(([_, qty]) => qty > 0)
      .map(([addonId, quantity]) => ({ addonId, quantity }));

    const request: RegisterRequest = {
      email: this.email(),
      password: this.password(),
      confirmPassword: this.confirmPassword(),
      name: this.name(),
      packageId: this.packageId,
      userType: UserTypes.OrganizationOwner,
      selectedAddons: selectedAddonsList
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
        this.toast.error(error.error?.message || error.message || 'Sign-up failed');
        this.busy.set(false);
      }
    });
  }
}
