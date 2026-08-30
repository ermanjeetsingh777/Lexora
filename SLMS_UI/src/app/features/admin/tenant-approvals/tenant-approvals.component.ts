import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';
import { ToastService } from '@core/services/toast.service';
import {
  ApproveTenantRegistrationRequest,
  RejectTenantRegistrationRequest,
  TenantRegistrationItem,
} from '@core/models/tenant-registration.models';
import {
  LucideBuilding,
  LucideCalendar,
  LucideCheck,
  LucideCheckCircle,
  LucideClock,
  LucideCopy,
  LucideEdit3,
  LucideExternalLink,
  LucideEye,
  LucideMail,
  LucideMessageCircle,
  LucideMessageSquare,
  LucidePhone,
  LucideRefreshCw,
  LucideSearch,
  LucideSend,
  LucideShieldCheck,
  LucideSparkles,
  LucideUser,
  LucideUserCheck,
  LucideUsers,
  LucideX,
  LucideXCircle,
} from '@lucide/angular';

@Component({
  selector: 'app-tenant-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    LucideBuilding,
    LucideCalendar,
    LucideCheck,
    LucideCheckCircle,
    LucideClock,
    LucideCopy,
    LucideEdit3,
    LucideExternalLink,
    LucideEye,
    LucideMail,
    LucideMessageCircle,
    LucideMessageSquare,
    LucidePhone,
    LucideRefreshCw,
    LucideSearch,
    LucideSend,
    LucideShieldCheck,
    LucideSparkles,
    LucideUser,
    LucideUserCheck,
    LucideUsers,
    LucideX,
    LucideXCircle,
  ],
  templateUrl: './tenant-approvals.component.html',
  styleUrls: ['./tenant-approvals.component.css'],
})
export class TenantApprovalsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly registrations = signal<TenantRegistrationItem[]>([]);
  readonly activeTab = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');
  readonly searchQuery = signal('');

  // Selected item for modal
  readonly selectedRegistration = signal<TenantRegistrationItem | null>(null);
  readonly modalOpen = signal(false);
  readonly formFinalAmount = signal<number | null>(null);
  readonly formRemarks = signal<string>('');
  readonly rejectReason = signal<string>('');
  readonly copiedText = signal<string | null>(null);

  // Outreach Template State
  readonly activeOutreachTemplate = signal<'payment' | 'discount' | 'reminder'>('payment');
  readonly isEditingOutreachMessage = signal(false);
  readonly customOutreachText = signal('');

  // Computed counts
  readonly totalCount = computed(() => this.registrations().length);
  readonly pendingCount = computed(() =>
    this.registrations().filter((r) => r.approvalStatus?.toLowerCase() === 'pending').length
  );
  readonly approvedCount = computed(() =>
    this.registrations().filter((r) => r.approvalStatus?.toLowerCase() === 'approved').length
  );
  readonly rejectedCount = computed(() =>
    this.registrations().filter((r) => r.approvalStatus?.toLowerCase() === 'rejected').length
  );

  // Filtered list
  readonly filteredRegistrations = computed(() => {
    let list = this.registrations();
    const tab = this.activeTab();
    if (tab !== 'all') {
      list = list.filter((r) => r.approvalStatus?.toLowerCase() === tab);
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          (r.institutionName && r.institutionName.toLowerCase().includes(query)) ||
          (r.packageName && r.packageName.toLowerCase().includes(query))
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadRegistrations();
  }

  loadRegistrations(): void {
    this.isLoading.set(true);
    this.adminService.getTenantRegistrations().subscribe({
      next: (data) => {
        this.registrations.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Failed to load registration requests.');
      },
    });
  }

  setTab(tab: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.activeTab.set(tab);
  }

  isPending(item?: TenantRegistrationItem | null): boolean {
    if (!item) return false;
    return !item.approvalStatus || item.approvalStatus.toLowerCase() === 'pending';
  }

  isApproved(item?: TenantRegistrationItem | null): boolean {
    if (!item) return false;
    return item.approvalStatus?.toLowerCase() === 'approved';
  }

  isRejected(item?: TenantRegistrationItem | null): boolean {
    if (!item) return false;
    return item.approvalStatus?.toLowerCase() === 'rejected';
  }

  cleanPhoneNumber(phone?: string | null): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return '91' + digits;
    }
    return digits;
  }

  getApplicantPhone(item?: TenantRegistrationItem | null): string {
    return item?.phoneNumber || '';
  }

  getOrgPhone(item?: TenantRegistrationItem | null): string {
    return item?.institutionContactPhone || item?.phoneNumber || '';
  }

  getPrimaryContactPhone(item?: TenantRegistrationItem | null): string {
    return item?.phoneNumber || item?.institutionContactPhone || '';
  }

  setOutreachTemplate(template: 'payment' | 'discount' | 'reminder'): void {
    this.activeOutreachTemplate.set(template);
    const item = this.selectedRegistration();
    if (item) {
      this.customOutreachText.set(this.getOutreachMessage(item, template));
    }
    this.isEditingOutreachMessage.set(false);
  }

  getOutreachMessage(item?: TenantRegistrationItem | null, template?: 'payment' | 'discount' | 'reminder'): string {
    if (!item) return '';
    const tmpl = template || this.activeOutreachTemplate();
    const orgName = item.institutionName || 'your organization';
    const planName = item.packageName || 'Lexora Subscription';
    const amount = (item.finalApprovedAmount ?? item.totalCalculatedAmount);

    if (tmpl === 'payment') {
      return `Hello ${item.fullName || 'Admin'},\n\nGreetings from *Lexora Support*! 👋\n\nWe have received your registration for *${orgName}* on the *${planName}* plan.\n\n📌 *Total Payable Amount:* ₹${amount}\n\nTo verify and instantly activate your Lexora account, *please share your payment confirmation screenshot / transaction slip* here.\n\nOnce verified, your account will be activated immediately.\n\nThank you,\n*Lexora Support Team*`;
    } else if (tmpl === 'discount') {
      return `Hello ${item.fullName || 'Admin'},\n\nRegarding your registration for *${orgName}*, your final approved subscription amount is *₹${amount}*.\n\nKindly complete the payment and share the transaction screenshot here for quick activation.\n\nBest regards,\n*Lexora Support Team*`;
    } else {
      return `Hello ${item.fullName || 'Admin'},\n\nThis is a friendly follow-up regarding your pending registration for *${orgName}* on Lexora.\n\nPlease share your payment screenshot or let us know if you need any assistance.\n\n*Lexora Support Team*`;
    }
  }

  getCurrentOutreachText(item?: TenantRegistrationItem | null): string {
    if (this.customOutreachText()) {
      return this.customOutreachText();
    }
    return this.getOutreachMessage(item);
  }

  getWhatsAppLaunchUrl(item?: TenantRegistrationItem | null): string {
    if (!item) return '';
    const phone = this.cleanPhoneNumber(this.getPrimaryContactPhone(item));
    if (!phone) return '';
    const msg = this.getCurrentOutreachText(item);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  getWhatsAppUrl(item?: TenantRegistrationItem | null, template: 'payment' | 'discount' | 'reminder' = 'payment'): string {
    if (!item) return '';
    const phone = this.cleanPhoneNumber(this.getPrimaryContactPhone(item));
    if (!phone) return '';
    const msg = this.getOutreachMessage(item, template);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  getMailtoUrl(item?: TenantRegistrationItem | null): string {
    if (!item || !item.email) return '';
    const orgName = item.institutionName || 'your organization';
    const planName = item.packageName || 'Lexora';
    const amount = (item.finalApprovedAmount ?? item.totalCalculatedAmount);

    const subject = encodeURIComponent(`Payment Verification & Account Activation - ${orgName}`);
    const body = encodeURIComponent(`Hello ${item.fullName},\n\nWe have received your registration for ${orgName} on Lexora (${planName} Plan).\n\nTotal Payable Amount: Rs. ${amount}\n\nKindly reply to this email with your payment confirmation screenshot / transaction receipt to complete your account activation.\n\nFor instant support or to share the slip on WhatsApp, feel free to contact us:\nWhatsApp / Phone: +91 9992823909 / +91 9468118737\n\nBest regards,\nLexora Support Team`);

    return `mailto:${item.email}?subject=${subject}&body=${body}`;
  }

  copyToClipboard(text?: string | null, label: string = 'text'): void {
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.copiedText.set(label);
    this.toast.success(`${label} copied to clipboard`);
    setTimeout(() => this.copiedText.set(null), 2000);
  }

  openReviewModal(item: TenantRegistrationItem): void {
    this.selectedRegistration.set(item);
    this.formFinalAmount.set(item.finalApprovedAmount ?? item.totalCalculatedAmount);
    this.formRemarks.set(item.adminRemarks || '');
    this.rejectReason.set('');
    this.activeOutreachTemplate.set('payment');
    this.isEditingOutreachMessage.set(false);
    this.customOutreachText.set(this.getOutreachMessage(item, 'payment'));
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedRegistration.set(null);
  }

  setQuickRemark(remark: string): void {
    this.formRemarks.set(remark);
  }

  approveRegistration(): void {
    const item = this.selectedRegistration();
    if (!item) return;

    this.isSubmitting.set(true);
    const request: ApproveTenantRegistrationRequest = {
      finalAmount: this.formFinalAmount() ?? item.totalCalculatedAmount,
      remarks: this.formRemarks().trim() || undefined,
    };

    this.adminService.approveTenantRegistration(item.userId, request).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.toast.success(`Registration approved for ${updated.fullName || updated.email}`);
        this.updateLocalItem(updated);
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.message || 'Failed to approve registration.');
      },
    });
  }

  rejectRegistration(): void {
    const item = this.selectedRegistration();
    if (!item) return;

    const reason = this.formRemarks().trim() || this.rejectReason().trim();
    if (!reason) {
      this.toast.error('Please enter a rejection reason / remarks for the user.');
      return;
    }

    this.isSubmitting.set(true);
    const request: RejectTenantRegistrationRequest = {
      reason,
    };

    this.adminService.rejectTenantRegistration(item.userId, request).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.toast.info(`Registration rejected for ${updated.fullName || updated.email}`);
        this.updateLocalItem(updated);
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.message || 'Failed to reject registration.');
      },
    });
  }

  private updateLocalItem(updated: TenantRegistrationItem): void {
    const list = this.registrations().map((r) =>
      r.userId === updated.userId ? updated : r
    );
    this.registrations.set(list);
  }
}
