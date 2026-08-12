import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MemberPlanResponse } from '@core/models/MemberRequest';
import { CommonService } from '@core/services/common.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { LucideDownload } from '@lucide/angular';
import { GlassCardComponent } from "@shared/components/page-header/page-header.component";
import { StatusBadgeComponent } from "@shared/components/status-badge/status-badge.component";

@Component({
  selector: 'app-member-payments-component',
  imports: [GlassCardComponent, DatePipe, StatusBadgeComponent, LucideDownload],
  templateUrl: './member-payments-component.html',
  styleUrl: './member-payments-component.css',
})
export class MemberPaymentsComponent {
  readonly commonService = inject(CommonService);
  readonly plans = input<MemberPlanResponse[]>();
  private readonly whatsapp = inject(WhatsAppService);
  readonly view = input<'plans' | 'payments' | string>();

  paymentSuccess() {

    this.whatsapp.paymentSuccess(
      '9876543210',
      'Sumit Kumar',
      1500,
      'Premium Plan',
      '31-Dec-2026', 'sfdgsdfg'
    );

  }
}
