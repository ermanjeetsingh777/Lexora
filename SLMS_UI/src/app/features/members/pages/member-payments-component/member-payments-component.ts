import { AppDatePipe } from '@core/pipes/app-date.pipes';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MemberPlanResponse } from '@core/models/MemberRequest';
import { CommonService } from '@core/services/common.service';
import { ToastService } from '@core/services/toast.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { LucideDownload, LucideMail, LucideMessageCircle, LucideShare2 } from '@lucide/angular';
import { GlassCardComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import {
  buildMemberPlanShareMessage,
  downloadMemberPlansPdf,
  MemberPlanShareContext,
  shareMemberPlanEmail,
} from '../../member-plan-export.util';

@Component({
  selector: 'app-member-payments-component',
  imports: [GlassCardComponent, AppDatePipe, StatusBadgeComponent, LucideDownload, LucideMail, LucideMessageCircle, LucideShare2],
  templateUrl: './member-payments-component.html',
  styleUrl: './member-payments-component.css',
})
export class MemberPaymentsComponent {
  readonly commonService = inject(CommonService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly toast = inject(ToastService);

  readonly plans = input<MemberPlanResponse[]>([]);
  readonly view = input<'plans' | 'payments' | string>();

  readonly memberName = input.required<string>();
  readonly memberEmail = input<string | null>(null);
  readonly memberPhone = input<string | null>(null);
  readonly membershipNo = input<string | null>(null);
  readonly institution = input.required<string>();
  readonly branch = input.required<string>();
  readonly library = input.required<string>();
  readonly shift = input<string | null>(null);

  readonly shareMenuOpen = signal<string | null>(null);

  readonly hasPhone = computed(() => !!this.memberPhone()?.trim());
  readonly hasEmail = computed(() => !!this.memberEmail()?.trim());
  readonly hasPlans = computed(() => (this.plans()?.length ?? 0) > 0);

  private shareContext(): MemberPlanShareContext {
    return {
      memberName: this.memberName(),
      memberEmail: this.memberEmail() ?? null,
      memberPhone: this.memberPhone() ?? null,
      membershipNo: this.membershipNo() ?? null,
      institution: this.institution(),
      branch: this.branch(),
      library: this.library(),
      shift: this.shift() ?? null,
    };
  }

  toggleShareMenu(planId: string, event: Event): void {
    event.stopPropagation();
    this.shareMenuOpen.update((current) => (current === planId ? null : planId));
  }

  closeShareMenu(): void {
    this.shareMenuOpen.set(null);
  }

  downloadPlan(plan: MemberPlanResponse): void {
    this.closeShareMenu();
    downloadMemberPlansPdf(this.shareContext(), this.plans() ?? [], plan);
    this.toast.success('Payment receipt downloaded.');
  }

  downloadAllPlans(): void {
    const allPlans = this.plans() ?? [];
    if (allPlans.length === 0) {
      this.toast.error('No payment records to download.');
      return;
    }
    downloadMemberPlansPdf(this.shareContext(), allPlans);
    this.toast.success('Payment report downloaded.');
  }

  shareWhatsApp(plan?: MemberPlanResponse): void {
    this.closeShareMenu();
    const phone = this.memberPhone()?.trim();
    if (!phone) {
      this.toast.error('Member phone number is not available.');
      return;
    }
    const allPlans = this.plans() ?? [];
    if (allPlans.length === 0) {
      this.toast.error('No payment records to share.');
      return;
    }
    const message = buildMemberPlanShareMessage(this.shareContext(), allPlans, plan);
    this.whatsapp.send(phone, message);
  }

  shareEmail(plan?: MemberPlanResponse): void {
    this.closeShareMenu();
    const email = this.memberEmail()?.trim();
    if (!email) {
      this.toast.error('Member email is not available.');
      return;
    }
    const allPlans = this.plans() ?? [];
    if (allPlans.length === 0) {
      this.toast.error('No payment records to share.');
      return;
    }
    shareMemberPlanEmail(this.shareContext(), allPlans, plan);
    this.toast.success('Opening email client…');
  }
}
