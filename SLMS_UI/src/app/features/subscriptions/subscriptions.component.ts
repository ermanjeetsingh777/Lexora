import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAlertTriangle, LucideDownload, LucideHistory, LucideLoader2, LucideRefreshCw, LucideSparkles,
} from '@lucide/angular';
import {
  PackageCatalogItem,
  PackageSubscriptionHistoryItem,
  PackageSubscriptionItem,
  PackageSubscriptionOverview,
  PackageSubscriptionQuote,
} from '@core/models/package-subscription.models';
import { PackageSubscriptionService } from '@core/services/package-subscription.service';
import { ToastService } from '@core/services/toast.service';
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

type DialogMode = 'renew' | 'upgrade' | 'update' | null;

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
    LucideRefreshCw,
    LucideHistory,
    LucideSparkles,
    LucideLoader2,
    LucideDownload,
  ],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.css',
})
export class SubscriptionsComponent {
  private readonly subscriptionsApi = inject(PackageSubscriptionService);
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

  planById(packageId: string): PackageCatalogItem | undefined {
    return this.plans().find((p) => p.id === packageId);
  }

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
        this.loading.set(false);
        this.toast.error('Unable to load subscriptions.');
      },
    });
  }

  statusLabel(status: string): string {
    if (status === 'ExpiringSoon') return 'Expiring soon';
    if (status === 'Expired') return 'Expired';
    return 'Active';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  planActionLabel(plan: PackageCatalogItem): string {
    const sub = this.current();
    if (!sub) return 'Select plan';
    if (sub.packageId === plan.id) return 'Current plan';

    if (sub.canUpgrade && plan.price > sub.packagePrice) return 'Upgrade';
    if (sub.canRenew && plan.price >= sub.packagePrice) return plan.price > sub.packagePrice ? 'Renew & upgrade' : 'Renew';
    return 'Unavailable';
  }

  canSelectPlan(plan: PackageCatalogItem): boolean {
    const sub = this.current();
    if (!sub) return true;
    if (sub.packageId === plan.id) return false;
    if (sub.canUpgrade && plan.price > sub.packagePrice) return true;
    if (sub.canRenew && plan.price >= sub.packagePrice) return true;
    return false;
  }

  openRenew(subscription: PackageSubscriptionItem): void {
    if (!subscription.canRenew) return;
    this.openDialog('renew', subscription, subscription.packageId);
  }

  openUpgrade(subscription: PackageSubscriptionItem): void {
    if (!subscription.canUpgrade) return;
    const upgradePlan = this.plans().find((p) => p.price > subscription.packagePrice);
    if (!upgradePlan) {
      this.toast.error('No higher plan available to upgrade.');
      return;
    }
    this.openDialog('upgrade', subscription, upgradePlan.id);
  }

  openUpdate(subscription: PackageSubscriptionItem): void {
    this.endDateInput.set(subscription.endDateUtc.slice(0, 10));
    this.openDialog('update', subscription, subscription.packageId);
  }

  private openDialog(mode: DialogMode, subscription: PackageSubscriptionItem, packageId: string): void {
    this.selectedSubscription.set(subscription);
    this.selectedPackageId.set(packageId);
    this.autoRenew.set(subscription.autoRenew);
    this.dialogMode.set(mode);
    this.loadQuote();
  }

  onPackageChange(packageId: string): void {
    this.selectedPackageId.set(packageId);
    this.loadQuote();
  }

  loadQuote(): void {
    const subscription = this.selectedSubscription();
    const packageId = this.selectedPackageId();
    const mode = this.dialogMode();
    if (!subscription || !packageId || !mode) {
      this.quote.set(null);
      return;
    }

    if (mode === 'update' && packageId === subscription.packageId) {
      this.quote.set(null);
      return;
    }

    this.quoteLoading.set(true);
    this.subscriptionsApi.getQuote(subscription.id, packageId, mode === 'upgrade').subscribe({
      next: (data) => {
        this.quote.set(data);
        this.quoteLoading.set(false);
      },
      error: () => {
        this.quote.set(null);
        this.quoteLoading.set(false);
      },
    });
  }

  closeDialog(): void {
    this.dialogMode.set(null);
    this.selectedSubscription.set(null);
    this.quote.set(null);
  }

  confirmDialog(): void {
    const mode = this.dialogMode();
    const subscription = this.selectedSubscription();
    const pricing = this.quote();
    if (!mode || !subscription) return;

    this.saving.set(true);

    if (mode === 'renew') {
      this.subscriptionsApi.renew({
        subscriptionId: subscription.id,
        packageId: this.selectedPackageId(),
        autoRenew: this.autoRenew(),
        amountPaid: pricing?.amountPaid,
        adjustmentAmount: pricing?.adjustmentAmount,
      }).subscribe({
        next: () => {
          this.toast.success('Subscription renewed successfully.');
          this.closeDialog();
          this.loadOverview();
          this.saving.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Renew failed.');
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
      amountPaid: pricing?.amountPaid,
      adjustmentAmount: pricing?.adjustmentAmount,
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

  dialogTitle(): string {
    const mode = this.dialogMode();
    if (mode === 'renew') return 'Renew subscription';
    if (mode === 'upgrade') return 'Upgrade plan';
    if (mode === 'update') return 'Update subscription';
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
