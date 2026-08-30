import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';
import { AddonService } from '@core/services/addon.service';
import { PackageSubscriptionService } from '@core/services/package-subscription.service';
import { ToastService } from '@core/services/toast.service';
import {
  ApproveTenantRegistrationRequest,
  RejectTenantRegistrationRequest,
  TenantRegistrationItem,
} from '@core/models/tenant-registration.models';
import {
  ApproveAddonRequest,
  ApproveSubscriptionRequest,
  PackageSubscriptionItem,
  RejectAddonRequest,
  RejectSubscriptionRequest,
  UserAddonItem,
} from '@core/models/package-subscription.models';
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
  LucideLayers,
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
    LucideLayers,
    LucideMail,
    LucideMessageCircle,
    LucideMessageSquare,
    LucidePhone,
    LucideRefreshCw,
    LucideSearch,
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
  private readonly addonService = inject(AddonService);
  private readonly subscriptionService = inject(PackageSubscriptionService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);

  // Top-level Section Switcher: 'tenants' | 'addons' | 'plans'
  readonly activeSection = signal<'tenants' | 'addons' | 'plans'>('tenants');

  // Tenant Registrations State
  readonly registrations = signal<TenantRegistrationItem[]>([]);
  readonly activeTab = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');
  readonly searchQuery = signal('');

  // Selected item for tenant modal
  readonly selectedRegistration = signal<TenantRegistrationItem | null>(null);
  readonly modalOpen = signal(false);
  readonly formFinalAmount = signal<number | null>(null);
  readonly formRemarks = signal<string>('');
  readonly rejectReason = signal<string>('');
  readonly copiedText = signal<string | null>(null);

  // Outreach Template State for Tenant
  readonly activeOutreachTemplate = signal<'payment' | 'discount' | 'reminder'>('payment');
  readonly isEditingOutreachMessage = signal(false);
  readonly customOutreachText = signal('');

  // Add-on Capacity Requests State
  readonly addonRequests = signal<UserAddonItem[]>([]);
  readonly addonTab = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');
  readonly selectedAddonRequest = signal<UserAddonItem | null>(null);
  readonly addonModalOpen = signal(false);
  readonly formAddonFinalAmount = signal<number | null>(null);
  readonly formAddonRemarks = signal<string>('');
  readonly addonRejectReason = signal<string>('');
  readonly activeAddonOutreachTemplate = signal<'payment' | 'discount' | 'reminder'>('payment');
  readonly isEditingAddonOutreach = signal(false);
  readonly customAddonOutreachText = signal('');

  // Plan Renew & Upgrade Requests State
  readonly planRequests = signal<PackageSubscriptionItem[]>([]);
  readonly planTab = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');
  readonly selectedPlanRequest = signal<PackageSubscriptionItem | null>(null);
  readonly planModalOpen = signal(false);
  readonly formPlanFinalAmount = signal<number | null>(null);
  readonly formPlanRemarks = signal<string>('');
  readonly planRejectReason = signal<string>('');
  readonly activePlanOutreachTemplate = signal<'payment' | 'discount' | 'reminder'>('payment');
  readonly isEditingPlanOutreach = signal(false);
  readonly customPlanOutreachText = signal('');

  // Computed counts for Tenants
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

  // Computed counts for Addons
  readonly totalAddonCount = computed(() => this.addonRequests().length);
  readonly pendingAddonCount = computed(() =>
    this.addonRequests().filter((a) => !a.approvalStatus || a.approvalStatus.toLowerCase() === 'pending' || (!a.isActive && a.approvalStatus?.toLowerCase() !== 'rejected')).length
  );
  readonly approvedAddonCount = computed(() =>
    this.addonRequests().filter((a) => a.approvalStatus?.toLowerCase() === 'approved' || a.isActive).length
  );
  readonly rejectedAddonCount = computed(() =>
    this.addonRequests().filter((a) => a.approvalStatus?.toLowerCase() === 'rejected').length
  );

  // Computed counts for Plans
  readonly totalPlanCount = computed(() => this.planRequests().length);
  readonly pendingPlanCount = computed(() =>
    this.planRequests().filter((p) => p.approvalStatus?.toLowerCase() === 'pending').length
  );
  readonly approvedPlanCount = computed(() =>
    this.planRequests().filter((p) => p.approvalStatus?.toLowerCase() === 'approved').length
  );
  readonly rejectedPlanCount = computed(() =>
    this.planRequests().filter((p) => p.approvalStatus?.toLowerCase() === 'rejected').length
  );

  // Filtered Tenant list
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

  // Filtered Addon Requests list
  readonly filteredAddonRequests = computed(() => {
    let list = this.addonRequests();
    const tab = this.addonTab();
    if (tab === 'pending') {
      list = list.filter((a) => !a.approvalStatus || a.approvalStatus.toLowerCase() === 'pending' || (!a.isActive && a.approvalStatus?.toLowerCase() !== 'rejected'));
    } else if (tab === 'approved') {
      list = list.filter((a) => a.approvalStatus?.toLowerCase() === 'approved' || a.isActive);
    } else if (tab === 'rejected') {
      list = list.filter((a) => a.approvalStatus?.toLowerCase() === 'rejected');
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(
        (a) =>
          (a.userFullName && a.userFullName.toLowerCase().includes(query)) ||
          (a.userEmail && a.userEmail.toLowerCase().includes(query)) ||
          (a.institutionName && a.institutionName.toLowerCase().includes(query)) ||
          (a.addonName && a.addonName.toLowerCase().includes(query)) ||
          (a.resourceType && a.resourceType.toLowerCase().includes(query))
      );
    }

    return list;
  });

  // Filtered Plan Requests list
  readonly filteredPlanRequests = computed(() => {
    let list = this.planRequests();
    const tab = this.planTab();
    if (tab !== 'all') {
      list = list.filter((p) => p.approvalStatus?.toLowerCase() === tab);
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(
        (p) =>
          (p.userName && p.userName.toLowerCase().includes(query)) ||
          (p.userEmail && p.userEmail.toLowerCase().includes(query)) ||
          (p.institutionName && p.institutionName.toLowerCase().includes(query)) ||
          (p.packageName && p.packageName.toLowerCase().includes(query)) ||
          (p.requestType && p.requestType.toLowerCase().includes(query))
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadRegistrations();
    this.loadAddonRequests();
    this.loadPlanRequests();
  }

  setSection(section: 'tenants' | 'addons' | 'plans'): void {
    this.activeSection.set(section);
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

  loadAddonRequests(): void {
    this.addonService.getAddonRequests().subscribe({
      next: (data) => {
        this.addonRequests.set(data);
      },
      error: () => {},
    });
  }

  loadPlanRequests(): void {
    this.subscriptionService.getAllSubscriptionRequests().subscribe({
      next: (data) => {
        this.planRequests.set(data);
      },
      error: () => {},
    });
  }

  setTab(tab: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.activeTab.set(tab);
  }

  setAddonTab(tab: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.addonTab.set(tab);
  }

  setPlanTab(tab: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.planTab.set(tab);
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

  isAddonItemPending(item?: UserAddonItem | null): boolean {
    if (!item) return false;
    return !item.approvalStatus || item.approvalStatus.toLowerCase() === 'pending' || (!item.isActive && item.approvalStatus.toLowerCase() !== 'rejected');
  }

  isAddonItemApproved(item?: UserAddonItem | null): boolean {
    if (!item) return false;
    return item.approvalStatus?.toLowerCase() === 'approved' || item.isActive;
  }

  isAddonItemRejected(item?: UserAddonItem | null): boolean {
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

  // Addon Outreach Helpers
  setAddonOutreachTemplate(template: 'payment' | 'discount' | 'reminder'): void {
    this.activeAddonOutreachTemplate.set(template);
    const item = this.selectedAddonRequest();
    if (item) {
      this.customAddonOutreachText.set(this.getAddonOutreachMessage(item, template));
    }
    this.isEditingAddonOutreach.set(false);
  }

  getAddonOutreachMessage(item?: UserAddonItem | null, template?: 'payment' | 'discount' | 'reminder'): string {
    if (!item) return '';
    const tmpl = template || this.activeAddonOutreachTemplate();
    const orgName = item.institutionName || 'your organization';
    const addonName = item.addonName || 'Capacity Add-on';
    const amount = (item.finalApprovedAmount ?? item.amountPaid);
    const extra = `+${item.totalExtraQuantity} ${item.resourceType}`;

    if (tmpl === 'payment') {
      return `Hello ${item.userFullName || 'Admin'},\n\nGreetings from *Lexora Support*! 👋\n\nWe received your Capacity Add-on request for *${orgName}*:\n\n⚡ *Add-on:* ${addonName} (${extra})\n💰 *Total Payable Amount:* ₹${amount}\n\nTo activate this extra capacity for your organization, *please share your payment confirmation screenshot / transaction slip* here.\n\nOnce received, we will activate the quota immediately.\n\nThank you,\n*Lexora Support Team*`;
    } else if (tmpl === 'discount') {
      return `Hello ${item.userFullName || 'Admin'},\n\nRegarding your Add-on request for *${orgName}*, the approved amount is *₹${amount}*.\n\nKindly share the payment slip once done for instant quota activation.\n\nBest regards,\n*Lexora Support Team*`;
    } else {
      return `Hello ${item.userFullName || 'Admin'},\n\nThis is a friendly follow-up regarding your pending Add-on request (${addonName}) for *${orgName}*.\n\nPlease share your payment slip or let us know if you have any questions.\n\n*Lexora Support Team*`;
    }
  }

  getCurrentAddonOutreachText(item?: UserAddonItem | null): string {
    if (this.customAddonOutreachText()) {
      return this.customAddonOutreachText();
    }
    return this.getAddonOutreachMessage(item);
  }

  getWhatsAppAddonLaunchUrl(item?: UserAddonItem | null): string {
    if (!item || !item.userPhone) return '';
    const phone = this.cleanPhoneNumber(item.userPhone);
    if (!phone) return '';
    const msg = this.getCurrentAddonOutreachText(item);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  getMailtoAddonUrl(item?: UserAddonItem | null): string {
    if (!item || !item.userEmail) return '';
    const orgName = item.institutionName || 'your organization';
    const amount = (item.finalApprovedAmount ?? item.amountPaid);
    const subject = encodeURIComponent(`Capacity Add-on Payment Verification - ${orgName}`);
    const body = encodeURIComponent(`Hello ${item.userFullName},\n\nWe have received your Capacity Add-on request for ${orgName} (+${item.totalExtraQuantity} ${item.resourceType}).\n\nPayable Amount: Rs. ${amount}\n\nKindly reply to this email or share your payment screenshot on WhatsApp to activate this extra capacity.\n\nWhatsApp: +91 9992823909 / +91 9468118737\n\nBest regards,\nLexora Support Team`);

    return `mailto:${item.userEmail}?subject=${subject}&body=${body}`;
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

  // Add-on Request Actions
  openAddonReviewModal(item: UserAddonItem): void {
    this.selectedAddonRequest.set(item);
    this.formAddonFinalAmount.set(item.finalApprovedAmount ?? item.amountPaid);
    this.formAddonRemarks.set(item.adminRemarks || '');
    this.addonRejectReason.set('');
    this.activeAddonOutreachTemplate.set('payment');
    this.isEditingAddonOutreach.set(false);
    this.customAddonOutreachText.set(this.getAddonOutreachMessage(item, 'payment'));
    this.addonModalOpen.set(true);
  }

  closeAddonModal(): void {
    this.addonModalOpen.set(false);
    this.selectedAddonRequest.set(null);
  }

  setQuickAddonRemark(remark: string): void {
    this.formAddonRemarks.set(remark);
  }

  approveAddonRequest(): void {
    const item = this.selectedAddonRequest();
    if (!item) return;

    this.isSubmitting.set(true);
    const payload: ApproveAddonRequest = {
      finalAmount: this.formAddonFinalAmount() ?? item.amountPaid,
      remarks: this.formAddonRemarks().trim() || undefined,
    };

    this.addonService.approveAddonRequest(item.id, payload).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.toast.success(`Add-on approved & capacity activated for ${updated.userFullName || updated.userEmail}!`);
        this.updateLocalAddonItem(updated);
        this.closeAddonModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message || 'Failed to approve add-on request.');
      },
    });
  }

  rejectAddonRequest(): void {
    const item = this.selectedAddonRequest();
    if (!item) return;

    const reason = this.formAddonRemarks().trim() || this.addonRejectReason().trim();
    if (!reason) {
      this.toast.error('Please enter a rejection reason / remarks.');
      return;
    }

    this.isSubmitting.set(true);
    const payload: RejectAddonRequest = {
      reason,
    };

    this.addonService.rejectAddonRequest(item.id, payload).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.toast.info(`Add-on request declined for ${updated.userFullName || updated.userEmail}`);
        this.updateLocalAddonItem(updated);
        this.closeAddonModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message || 'Failed to reject add-on request.');
      },
    });
  }

  private updateLocalAddonItem(updated: UserAddonItem): void {
    const list = this.addonRequests().map((a) => (a.id === updated.id ? updated : a));
    this.addonRequests.set(list);
  }

  // Plan Request Helpers & Actions
  isPlanItemPending(item?: PackageSubscriptionItem | null): boolean {
    if (!item) return false;
    return !item.approvalStatus || item.approvalStatus.toLowerCase() === 'pending';
  }

  isPlanItemApproved(item?: PackageSubscriptionItem | null): boolean {
    if (!item) return false;
    return item.approvalStatus?.toLowerCase() === 'approved';
  }

  isPlanItemRejected(item?: PackageSubscriptionItem | null): boolean {
    if (!item) return false;
    return item.approvalStatus?.toLowerCase() === 'rejected';
  }

  setPlanOutreachTemplate(template: 'payment' | 'discount' | 'reminder'): void {
    this.activePlanOutreachTemplate.set(template);
    const item = this.selectedPlanRequest();
    if (item) {
      this.customPlanOutreachText.set(this.getPlanOutreachMessage(item, template));
    }
    this.isEditingPlanOutreach.set(false);
  }

  getPlanOutreachMessage(item?: PackageSubscriptionItem | null, template?: 'payment' | 'discount' | 'reminder'): string {
    if (!item) return '';
    const tmpl = template || this.activePlanOutreachTemplate();
    const userName = item.userName || item.userEmail || 'Admin';
    const orgName = item.institutionName || 'your organization';
    const planName = item.packageName || 'Package';
    const type = item.requestType || 'Plan';
    const amount = (item.finalApprovedAmount ?? item.amountPaid);

    if (tmpl === 'payment') {
      return `Hello ${userName},\n\nGreetings from *Lexora Support*! 👋\n\nWe received your request to *${type}* to the *${planName}* plan for *${orgName}*.\n\n📌 *Payable Amount:* ₹${amount}\n\nTo complete your subscription activation, *please share your payment confirmation screenshot / UTR slip* here.\n\nThank you,\n*Lexora Support Team*`;
    } else if (tmpl === 'discount') {
      return `Hello ${userName},\n\nRegarding your *${type}* request for *${orgName}*, your approved amount for *${planName}* is *₹${amount}*.\n\nKindly send the payment confirmation screenshot for instant activation.\n\nBest regards,\n*Lexora Support Team*`;
    } else {
      return `Hello ${userName},\n\nFollow-up regarding your pending *${type}* request for *${planName}* (*${orgName}*).\n\nPlease send your payment screenshot to activate uninterrupted access.\n\n*Lexora Support Team*`;
    }
  }

  getCurrentPlanOutreachText(item?: PackageSubscriptionItem | null): string {
    if (this.customPlanOutreachText()) {
      return this.customPlanOutreachText();
    }
    return this.getPlanOutreachMessage(item);
  }

  getWhatsAppPlanLaunchUrl(item?: PackageSubscriptionItem | null): string {
    if (!item) return '';
    const phone = this.cleanPhoneNumber(item.userPhone || '');
    if (!phone) return '';
    const msg = this.getCurrentPlanOutreachText(item);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  getMailtoPlanUrl(item?: PackageSubscriptionItem | null): string {
    if (!item || !item.userEmail) return '';
    const orgName = item.institutionName || 'your organization';
    const planName = item.packageName || 'Package';
    const type = item.requestType || 'Plan';
    const amount = (item.finalApprovedAmount ?? item.amountPaid);
    const subject = encodeURIComponent(`Lexora ${type} Request Verification: ${planName} - ${orgName}`);
    const body = encodeURIComponent(this.getCurrentPlanOutreachText(item));
    return `mailto:${item.userEmail}?subject=${subject}&body=${body}`;
  }

  openPlanReviewModal(item: PackageSubscriptionItem): void {
    this.selectedPlanRequest.set(item);
    this.formPlanFinalAmount.set(item.finalApprovedAmount ?? item.amountPaid);
    this.formPlanRemarks.set(item.adminRemarks || '');
    this.planRejectReason.set('');
    this.activePlanOutreachTemplate.set('payment');
    this.isEditingPlanOutreach.set(false);
    this.customPlanOutreachText.set(this.getPlanOutreachMessage(item, 'payment'));
    this.planModalOpen.set(true);
  }

  closePlanModal(): void {
    this.planModalOpen.set(false);
    this.selectedPlanRequest.set(null);
  }

  setQuickPlanRemark(remark: string): void {
    this.formPlanRemarks.set(remark);
  }

  approvePlanRequest(): void {
    const item = this.selectedPlanRequest();
    if (!item) return;

    this.isSubmitting.set(true);
    const payload: ApproveSubscriptionRequest = {
      finalApprovedAmount: this.formPlanFinalAmount() ?? item.amountPaid,
      adminRemarks: this.formPlanRemarks().trim() || undefined,
    };

    this.subscriptionService.approveSubscriptionRequest(item.id, payload).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.toast.success(`Plan request approved & activated for ${updated.userName || updated.userEmail}!`);
        this.updateLocalPlanItem(updated);
        this.closePlanModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message || 'Failed to approve plan request.');
      },
    });
  }

  rejectPlanRequest(): void {
    const item = this.selectedPlanRequest();
    if (!item) return;

    const reason = this.formPlanRemarks().trim() || this.planRejectReason().trim();
    if (!reason) {
      this.toast.error('Please enter a rejection reason / remarks.');
      return;
    }

    this.isSubmitting.set(true);
    const payload: RejectSubscriptionRequest = {
      adminRemarks: reason,
    };

    this.subscriptionService.rejectSubscriptionRequest(item.id, payload).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.toast.info(`Plan request rejected for ${updated.userName || updated.userEmail}`);
        this.updateLocalPlanItem(updated);
        this.closePlanModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message || 'Failed to reject plan request.');
      },
    });
  }

  private updateLocalPlanItem(updated: PackageSubscriptionItem): void {
    const list = this.planRequests().map((p) => (p.id === updated.id ? updated : p));
    this.planRequests.set(list);
  }
}
