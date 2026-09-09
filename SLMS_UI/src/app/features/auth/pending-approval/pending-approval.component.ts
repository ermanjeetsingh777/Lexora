import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { CommonService } from '@core/services/common.service';
import { StorageService } from '@core/services/storage.service';
import { ToastService } from '@core/services/toast.service';
import { PaymentService } from '@core/services/payment.service';
import { OnboardingSteps } from '@core/enums/OnbardingSteps';
import { TenantRegistrationStatusResponse, SuperAdminContactInfo } from '@core/models/tenant-registration.models';
import { AppLogoComponent } from '@shared/components/app-logo/app-logo.component';
import { environment } from '@env/environment';
import {
  LucideBuilding2,
  LucideCheck,
  LucideCheckCircle,
  LucideClock,
  LucideCopy,
  LucideEdit3,
  LucideExternalLink,
  LucideHeadphones,
  LucideLayers,
  LucideLogOut,
  LucideMail,
  LucideMessageCircle,
  LucideMessageSquare,
  LucidePhone,
  LucideRefreshCw,
  LucideSend,
  LucideShieldAlert,
  LucideShieldCheck,
  LucideSparkles,
  LucideXCircle,
} from '@lucide/angular';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    AppLogoComponent,
    LucideBuilding2,
    LucideCheck,
    LucideCheckCircle,
    LucideClock,
    LucideCopy,
    LucideEdit3,
    LucideExternalLink,
    LucideHeadphones,
    LucideLayers,
    LucideLogOut,
    LucideMail,
    LucideMessageCircle,
    LucideMessageSquare,
    LucidePhone,
    LucideRefreshCw,
    LucideSend,
    LucideShieldAlert,
    LucideShieldCheck,
    LucideSparkles,
    LucideXCircle,
  ],
  templateUrl: './pending-approval.component.html',
  styleUrls: ['./pending-approval.component.css'],
})
export class PendingApprovalComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly commonService = inject(CommonService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly payments = inject(PaymentService);

  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly statusData = signal<TenantRegistrationStatusResponse | null>(null);
  readonly copiedPhone = signal(false);
  readonly copiedField = signal<string | null>(null);
  readonly onlinePaymentEnabled = signal(false);
  readonly onlinePaymentIsTestMode = signal(false);
  readonly isPaying = signal(false);

  readonly user = this.storage.user;

  /** Trial and fully-discounted plans owe nothing, so the pay card stays hidden for them. */
  readonly amountDue = computed(() => {
    const status = this.statusData();
    return status?.finalApprovedAmount ?? status?.totalCalculatedAmount ?? 0;
  });

  // Outreach Template State
  readonly activeTemplate = signal<'slip' | 'status' | 'discount'>('slip');
  readonly isEditingMessage = signal(false);
  readonly customMessage = signal('');

  readonly contactInfo = computed<SuperAdminContactInfo>(() => {
    const fromApi = this.statusData()?.superAdminContact;
    if (fromApi && fromApi.email) {
      return fromApi;
    }
    const envContact = (environment as unknown as { superAdminContact?: SuperAdminContactInfo }).superAdminContact;
    return {
      email: envContact?.email || 'yogeshyadav@uniappx.in',
      phone: envContact?.phone || '+91 9992823909',
      secondaryPhone: envContact?.secondaryPhone || '+91 9468118737',
      whatsApp: envContact?.whatsApp || '+91 9992823909',
      whatsAppUrl: envContact?.whatsAppUrl || 'https://wa.me/919992823909',
      availability: envContact?.availability || 'Instant Verification & Activation Support (9:00 AM - 9:00 PM IST)',
    };
  });

  setTemplate(template: 'slip' | 'status' | 'discount'): void {
    this.activeTemplate.set(template);
    this.customMessage.set(this.getWhatsAppMessage(template));
    this.isEditingMessage.set(false);
  }

  getWhatsAppMessage(template?: 'slip' | 'status' | 'discount'): string {
    const tmpl = template || this.activeTemplate();
    const data = this.statusData();
    const orgName = data?.institutionName || 'My Organization';
    const planName = data?.packageName || 'Lexora Subscription';
    const amount = (data?.finalApprovedAmount ?? data?.totalCalculatedAmount ?? 0);
    const user = this.user();
    const fullName = data?.fullName || user?.fullName || 'User';
    const email = data?.email || user?.email || '';

    if (tmpl === 'slip') {
      return `Hello Lexora Admin,\n\nI have completed the onboarding setup for *${orgName}*.\n\n📋 *Plan:* ${planName}\n💰 *Payable Amount:* ₹${amount}\n👤 *Owner:* ${fullName} (${email})\n\n📎 *I have attached my payment confirmation screenshot / transaction receipt here.* Please verify and activate my account.\n\nThank you!`;
    } else if (tmpl === 'status') {
      return `Hello Lexora Admin,\n\nI have submitted my organization registration for *${orgName}* on Lexora.\n\nCould you please check my verification status and guide me on the next activation steps?\n\n👤 *Owner:* ${fullName} (${email})\n\nThank you!`;
    } else {
      return `Hello Lexora Admin,\n\nI am setting up *${orgName}* on Lexora and would like to discuss subscription billing / custom pricing options.\n\n👤 *Contact:* ${fullName} (${email})\n\nThank you!`;
    }
  }

  getCurrentWhatsAppMessage(): string {
    if (this.customMessage()) {
      return this.customMessage();
    }
    return this.getWhatsAppMessage();
  }

  getWhatsAppLaunchUrl(): string {
    const contact = this.contactInfo();
    const digits = (contact.whatsApp || contact.phone || '').replace(/\D/g, '');
    const phone = digits.length === 10 ? '91' + digits : digits;
    const msg = this.getCurrentWhatsAppMessage();
    return `https://wa.me/${phone || '919992823909'}?text=${encodeURIComponent(msg)}`;
  }

  copyText(text?: string | null, field: string = 'text'): void {
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.copiedField.set(field);
    this.toast.success(`${field} copied to clipboard`);
    setTimeout(() => this.copiedField.set(null), 2000);
  }

  ngOnInit(): void {
    this.fetchStatus();
    this.payments.getPlatformStatus().subscribe({
      next: (status) => {
        this.onlinePaymentEnabled.set(status.enabled);
        this.onlinePaymentIsTestMode.set(status.isTestMode);
      },
      // Offline payment stays available either way, so a failure here is not worth a toast.
      error: () => this.onlinePaymentEnabled.set(false),
    });
  }

  /**
   * Pays the pending subscription through Razorpay. A captured payment activates the
   * tenant the same way a SuperAdmin approval does, so we just re-read the status.
   */
  async payNow(): Promise<void> {
    if (this.isPaying()) {
      return;
    }

    this.isPaying.set(true);

    this.payments.initiateSubscription().subscribe({
      next: async (instruction) => {
        try {
          const result = await this.payments.openRazorpayCheckout(instruction);

          if (!result) {
            this.isPaying.set(false);
            this.toast.info('Payment window closed.');
            return;
          }

          this.payments.verifyRazorpay(result).subscribe({
            next: () => {
              this.isPaying.set(false);
              this.toast.success('Payment received. Activating your account…');
              this.refreshStatus();
            },
            error: (error) => {
              this.isPaying.set(false);
              this.toast.error(
                error?.error?.message ?? 'We could not confirm the payment yet. It will update automatically.',
              );
            },
          });
        } catch (error) {
          this.isPaying.set(false);
          this.toast.error(error instanceof Error ? error.message : 'Could not open the payment window.');
        }
      },
      error: (error) => {
        this.isPaying.set(false);
        this.toast.error(error?.error?.message ?? 'Could not start the payment.');
      },
    });
  }

  fetchStatus(): void {
    this.isLoading.set(true);
    this.auth.getRegistrationStatus().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.statusData.set(res.data);
          this.checkIfApproved(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  refreshStatus(): void {
    this.isRefreshing.set(true);
    this.auth.getRegistrationStatus().subscribe({
      next: (res) => {
        this.isRefreshing.set(false);
        if (res.success && res.data) {
          this.statusData.set(res.data);
          if (this.checkIfApproved(res.data)) {
            return;
          }
          this.toast.info('Status updated: ' + (res.data.approvalStatus || 'Pending'));
        }
      },
      error: () => {
        this.isRefreshing.set(false);
        this.toast.error('Unable to refresh status. Please try again.');
      },
    });
  }

  private checkIfApproved(data: TenantRegistrationStatusResponse): boolean {
    const isApproved =
      data.approvalStatus?.toLowerCase() === 'approved' ||
      data.onboardingStep === OnboardingSteps.Completed;

    if (!isApproved) {
      return false;
    }

    // Tenants who deferred setup are approved on a pre-wizard step — send them to
    // the wizard instead of an empty dashboard.
    const step = data.onboardingStep ?? OnboardingSteps.Completed;
    const setupPending = step !== OnboardingSteps.Completed;

    const currentUser = this.storage.user();
    if (currentUser) {
      currentUser.onboardingStep = step;
      currentUser.approvalStatus = 'Approved';
      this.storage.setUser(currentUser);
    }

    this.toast.success(
      setupPending
        ? 'Your account is approved. Let\'s finish setting up your library.'
        : 'Congratulations! Your organization account has been approved.',
    );

    const route = setupPending
      ? this.commonService.onboardingConfig[step]?.route ?? '/onboarding/institution'
      : '/dashboard';
    void this.router.navigate([route]);
    return true;
  }

  copyToClipboard(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.copiedPhone.set(true);
    this.toast.success('Contact copied to clipboard');
    setTimeout(() => this.copiedPhone.set(false), 2000);
  }

  logout(): void {
    this.storage.clear();
    void this.router.navigate(['/login']);
  }
}
