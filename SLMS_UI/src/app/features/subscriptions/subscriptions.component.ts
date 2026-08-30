import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAlertTriangle,
  LucideBookOpen,
  LucideBuilding,
  LucideCheckCircle,
  LucideClock,
  LucideDownload,
  LucideExternalLink,
  LucideHistory,
  LucideLayers,
  LucideLoader2,
  LucideMessageCircle,
  LucidePlus,
  LucideRefreshCw,
  LucideSettings,
  LucideSparkles,
  LucideUsers,
  LucideXCircle,
} from '@lucide/angular';
import {
  AddonCatalogItem,
  PackageCatalogItem,
  PackageSubscriptionHistoryItem,
  PackageSubscriptionItem,
  PackageSubscriptionOverview,
  PackageSubscriptionQuote,
  UserAddonItem,
} from '@core/models/package-subscription.models';
import { PackageSubscriptionService } from '@core/services/package-subscription.service';
import { PackageService } from '@core/services/package.service';
import { AddonService } from '@core/services/addon.service';
import { ToastService } from '@core/services/toast.service';
import { environment } from '@env/environment';
import {
  downloadSubscriptionHistoryPdf,
  downloadSubscriptionInvoicePdf,
  SubscriptionInvoiceContext,
} from './subscription-invoice-export.util';
import { ButtonComponent } from '@shared/components/button/button.component';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { PackageFeaturesListComponent } from './package-features-list.component';

type DialogMode = 'renew' | 'upgrade' | 'update' | 'buy-addon' | 'edit-package' | 'edit-addon' | null;

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    PageHeaderComponent,
    SectionHeaderComponent,
    GlassCardComponent,
    KpiCardComponent,
    StatusBadgeComponent,
    ButtonComponent,
    PackageFeaturesListComponent,
    LucideAlertTriangle,
    LucideBookOpen,
    LucideBuilding,
    LucideCheckCircle,
    LucideClock,
    LucideRefreshCw,
    LucideHistory,
    LucideSparkles,
    LucideLoader2,
    LucideDownload,
    LucideExternalLink,
    LucideLayers,
    LucideMessageCircle,
    LucidePlus,
    LucideSettings,
    LucideUsers,
    LucideXCircle,
  ],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.css',
})
export class SubscriptionsComponent {
  private readonly subscriptionsApi = inject(PackageSubscriptionService);
  private readonly packageService = inject(PackageService);
  private readonly addonService = inject(AddonService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly quoteLoading = signal(false);
  readonly overview = signal<PackageSubscriptionOverview | null>(null);
  readonly dialogMode = signal<DialogMode>(null);
  readonly selectedSubscription = signal<PackageSubscriptionItem | null>(null);
  readonly selectedPackageId = signal<string>('');
  readonly autoRenew = signal(false);
  readonly quote = signal<PackageSubscriptionQuote | null>(null);
  readonly endDateInput = signal('');

  // Addons state
  readonly addons = signal<AddonCatalogItem[]>([]);
  readonly myAddons = signal<UserAddonItem[]>([]);
  readonly selectedAddon = signal<AddonCatalogItem | null>(null);
  readonly addonPurchaseQuantity = signal(1);
  readonly addonPurchaseNote = signal('');

  // SuperAdmin edit state
  readonly editingPackage = signal<PackageCatalogItem | null>(null);
  readonly editingAddon = signal<Partial<AddonCatalogItem> | null>(null);

  readonly isSuperAdmin = computed(() => this.overview()?.isSuperAdmin ?? false);
  readonly current = computed(() => this.overview()?.currentSubscription ?? null);
  readonly expiringSoon = computed(() => this.overview()?.expiringSoon ?? []);
  readonly expired = computed(() => this.overview()?.expired ?? []);
  readonly history = computed(() => this.overview()?.history ?? []);
  readonly plans = computed(() => this.overview()?.availablePackages ?? []);
  readonly adminRows = computed(() => this.overview()?.activeSubscriptions ?? []);

  readonly dialogPlans = computed(() => {
    const mode = this.dialogMode();
    const sub = this.selectedSubscription();
    if (!mode || !sub) return this.plans();

    const currentPrice = sub.packagePrice;
    if (mode === 'upgrade') {
      return this.plans().filter((p) => p.price > currentPrice);
    }
    if (mode === 'renew') {
      return this.plans().filter((p) => p.price >= currentPrice);
    }
    return this.plans();
  });

  readonly selectedPlan = computed(() => {
    const id = this.selectedPackageId();
    return this.plans().find((p) => p.id === id) ?? null;
  });

  constructor() {
    this.loadOverview();
  }

  loadOverview(): void {
    this.loading.set(true);
    this.subscriptionsApi.getOverview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load subscription overview.');
        this.loading.set(false);
      },
    });

    this.loadAddons();
  }

  loadAddons(): void {
    this.addonService.getActiveAddons().subscribe({
      next: (items) => this.addons.set(items),
      error: () => {},
    });

    this.addonService.getMyAddons().subscribe({
      next: (items) => this.myAddons.set(items),
      error: () => {},
    });
  }

  openRenew(item: PackageSubscriptionItem): void {
    this.openDialog('renew', item, item.packageId);
  }

  openUpgrade(item: PackageSubscriptionItem): void {
    const nextPlan = this.plans().find((p) => p.price > item.packagePrice);
    this.openDialog('upgrade', item, nextPlan?.id ?? '');
  }

  openUpdate(item: PackageSubscriptionItem): void {
    this.openDialog('update', item, item.packageId);
  }

  openBuyAddon(addon: AddonCatalogItem): void {
    this.selectedAddon.set(addon);
    this.addonPurchaseQuantity.set(1);
    this.addonPurchaseNote.set('');
    this.dialogMode.set('buy-addon');
  }

  openEditPackage(pkg: PackageCatalogItem): void {
    this.editingPackage.set({ ...pkg });
    this.dialogMode.set('edit-package');
  }

  openCreateAddon(): void {
    this.editingAddon.set({
      name: '',
      code: '',
      resourceType: 'Library',
      unitQuantity: 1,
      price: 999,
      durationInDays: 365,
      description: '',
      isActive: true,
    });
    this.dialogMode.set('edit-addon');
  }

  openEditAddon(addon: AddonCatalogItem): void {
    this.editingAddon.set({ ...addon });
    this.dialogMode.set('edit-addon');
  }

  openDialog(mode: DialogMode, item: PackageSubscriptionItem, preselectedPackageId?: string): void {
    this.dialogMode.set(mode);
    this.selectedSubscription.set(item);
    this.autoRenew.set(item.autoRenew);
    this.endDateInput.set(item.endDateUtc ? item.endDateUtc.slice(0, 10) : '');

    const candidates = this.dialogPlans();
    const resolvedId = preselectedPackageId && candidates.some((p) => p.id === preselectedPackageId)
      ? preselectedPackageId
      : candidates[0]?.id ?? '';

    this.selectedPackageId.set(resolvedId);

    if (resolvedId && (mode === 'upgrade' || mode === 'renew')) {
      this.fetchQuote(item.id, resolvedId);
    } else {
      this.quote.set(null);
    }
  }

  closeDialog(): void {
    this.dialogMode.set(null);
    this.selectedSubscription.set(null);
    this.selectedPackageId.set('');
    this.quote.set(null);
    this.selectedAddon.set(null);
    this.editingPackage.set(null);
    this.editingAddon.set(null);
  }

  onPlanChange(newPlanId: string): void {
    this.selectedPackageId.set(newPlanId);
    const sub = this.selectedSubscription();
    const mode = this.dialogMode();
    if (sub && (mode === 'upgrade' || mode === 'renew')) {
      this.fetchQuote(sub.id, newPlanId);
    }
  }

  private fetchQuote(subscriptionId: string, newPackageId: string): void {
    this.quoteLoading.set(true);
    this.subscriptionsApi.getQuote(subscriptionId, newPackageId).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.quoteLoading.set(false);
      },
      error: () => {
        this.quote.set(null);
        this.quoteLoading.set(false);
      },
    });
  }

  confirmAction(): void {
    const mode = this.dialogMode();

    if (mode === 'buy-addon') {
      const addon = this.selectedAddon();
      if (!addon) return;
      this.saving.set(true);
      this.addonService.purchaseAddon({
        addonId: addon.id,
        quantity: this.addonPurchaseQuantity(),
        paymentMethod: 'Online',
        note: this.addonPurchaseNote().trim() || undefined,
      }).subscribe({
        next: () => {
          this.toast.success(`Add-on request submitted for ${addon.name}! Sent to SuperAdmin for verification.`);
          this.closeDialog();
          this.loadAddons();
          this.saving.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Addon request failed.');
          this.saving.set(false);
        },
      });
      return;
    }

    if (mode === 'edit-package') {
      const pkg = this.editingPackage();
      if (!pkg) return;
      this.saving.set(true);
      this.packageService.updatePackage(pkg.id, pkg).subscribe({
        next: () => {
          this.toast.success('Package limits and price updated successfully.');
          this.closeDialog();
          this.loadOverview();
          this.saving.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Failed to update package.');
          this.saving.set(false);
        },
      });
      return;
    }

    if (mode === 'edit-addon') {
      const addon = this.editingAddon();
      if (!addon) return;
      this.saving.set(true);
      if (addon.id) {
        this.addonService.updateAddon(addon.id, addon).subscribe({
          next: () => {
            this.toast.success('Addon updated successfully.');
            this.closeDialog();
            this.loadAddons();
            this.saving.set(false);
          },
          error: (err) => {
            this.toast.error(err?.error?.message ?? 'Failed to update addon.');
            this.saving.set(false);
          },
        });
      } else {
        this.addonService.createAddon(addon).subscribe({
          next: () => {
            this.toast.success('Addon created successfully.');
            this.closeDialog();
            this.loadAddons();
            this.saving.set(false);
          },
          error: (err) => {
            this.toast.error(err?.error?.message ?? 'Failed to create addon.');
            this.saving.set(false);
          },
        });
      }
      return;
    }

    const subscription = this.selectedSubscription();
    if (!subscription || !mode) return;

    this.saving.set(true);

    if (mode === 'renew') {
      this.subscriptionsApi.renew({
        subscriptionId: subscription.id,
        packageId: this.selectedPackageId(),
        autoRenew: this.autoRenew(),
      }).subscribe({
        next: () => {
          this.toast.success('Plan renewed successfully.');
          this.closeDialog();
          this.loadOverview();
          this.saving.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Renewal failed.');
          this.saving.set(false);
        },
      });
      return;
    }

    if (mode === 'upgrade') {
      this.subscriptionsApi.upgrade({
        subscriptionId: subscription.id,
        newPackageId: this.selectedPackageId(),
        autoRenew: this.autoRenew(),
      }).subscribe({
        next: () => {
          this.toast.success('Plan upgraded successfully.');
          this.closeDialog();
          this.loadOverview();
          this.saving.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Upgrade failed.');
          this.saving.set(false);
        },
      });
      return;
    }

    this.subscriptionsApi.update(subscription.id, {
      packageId: this.selectedPackageId() !== subscription.packageId ? this.selectedPackageId() : undefined,
      endDateUtc: this.endDateInput() ? new Date(this.endDateInput()).toISOString() : undefined,
      autoRenew: this.autoRenew(),
    }).subscribe({
      next: () => {
        this.toast.success('Subscription updated successfully.');
        this.closeDialog();
        this.loadOverview();
        this.saving.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Update failed.');
        this.saving.set(false);
      },
    });
  }

  selectPlan(plan: PackageCatalogItem): void {
    const currentSub = this.current();
    if (!currentSub) {
      this.saving.set(true);
      this.subscriptionsApi.subscribe({ packageId: plan.id, autoRenew: false }).subscribe({
        next: () => {
          this.toast.success('Plan subscribed successfully.');
          this.loadOverview();
          this.saving.set(false);
        },
        error: () => {
          this.toast.error('Subscribe failed.');
          this.saving.set(false);
        },
      });
      return;
    }

    if (currentSub.canUpgrade && plan.price > currentSub.packagePrice) {
      this.openDialog('upgrade', currentSub, plan.id);
      return;
    }

    if (currentSub.canRenew && plan.price >= currentSub.packagePrice) {
      this.openDialog('renew', currentSub, plan.id);
    }
  }

  planActionLabel(plan: PackageCatalogItem): string {
    const currentSub = this.current();
    if (!currentSub) return 'Subscribe now';
    if (plan.id === currentSub.packageId) {
      return currentSub.canRenew ? 'Renew plan' : 'Current plan';
    }
    if (plan.price > currentSub.packagePrice) {
      return currentSub.canUpgrade ? 'Upgrade to plan' : 'Unavailable';
    }
    return currentSub.canRenew ? 'Switch & Renew' : 'Unavailable';
  }

  canSelectPlan(plan: PackageCatalogItem): boolean {
    const currentSub = this.current();
    if (!currentSub) return true;
    if (plan.id === currentSub.packageId) return currentSub.canRenew;
    if (plan.price > currentSub.packagePrice) return currentSub.canUpgrade;
    return currentSub.canRenew;
  }

  statusLabel(status: string): string {
    if (status === 'ExpiringSoon') return 'Expiring soon';
    return status;
  }

  isAddonPending(addon: UserAddonItem): boolean {
    return !addon.approvalStatus || addon.approvalStatus.toLowerCase() === 'pending' || (!addon.isActive && addon.approvalStatus.toLowerCase() !== 'rejected');
  }

  isAddonApproved(addon: UserAddonItem): boolean {
    return addon.approvalStatus?.toLowerCase() === 'approved' || addon.isActive;
  }

  isAddonRejected(addon: UserAddonItem): boolean {
    return addon.approvalStatus?.toLowerCase() === 'rejected';
  }

  getWhatsAppAddonSlipUrl(addon: UserAddonItem): string {
    const env = (environment as unknown as { superAdminContact?: { whatsApp?: string; phone?: string } }).superAdminContact;
    const cleanWa = (env?.whatsApp || env?.phone || '9992823909').replace(/\D/g, '');
    const phone = cleanWa.length === 10 ? '91' + cleanWa : cleanWa;
    const currentSub = this.current();
    const org = currentSub?.institutionName || 'My Organization';
    const amount = addon.finalApprovedAmount ?? addon.amountPaid;
    const msg = `Hello Lexora Admin,\n\nI have submitted a Capacity Add-on request for *${org}*:\n\n⚡ *Add-on:* ${addon.addonName} (+${addon.totalExtraQuantity} ${addon.resourceType})\n💰 *Payable Amount:* ₹${amount}\n\n📎 *I have attached my payment confirmation screenshot / transaction receipt here.* Please verify and activate our extra quota.\n\nThank you!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  formatCurrency(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  dialogTitle(): string {
    const mode = this.dialogMode();
    if (mode === 'renew') return 'Renew subscription';
    if (mode === 'upgrade') return 'Upgrade plan';
    if (mode === 'update') return 'Update subscription';
    if (mode === 'buy-addon') return 'Add Extra Capacity (Add-on)';
    if (mode === 'edit-package') return 'SuperAdmin: Edit Package Quotas & Price';
    if (mode === 'edit-addon') return this.editingAddon()?.id ? 'SuperAdmin: Edit Add-on' : 'SuperAdmin: New Add-on';
    return '';
  }

  private invoiceContext(): SubscriptionInvoiceContext {
    const sub = this.current() ?? this.history()[0];
    return {
      accountName: sub?.userName ?? 'Account',
      accountEmail: sub?.userEmail ?? '',
      institutionName: sub?.institutionName,
    };
  }

  downloadAllHistory(): void {
    const items = this.history();
    if (!items.length) {
      this.toast.error('No subscription history to download.');
      return;
    }
    downloadSubscriptionHistoryPdf(this.invoiceContext(), items, this.isSuperAdmin());
    this.toast.success('Subscription history downloaded.');
  }

  downloadInvoice(item: PackageSubscriptionHistoryItem): void {
    downloadSubscriptionInvoicePdf(this.invoiceContext(), item);
    this.toast.success('Invoice downloaded.');
  }
}
