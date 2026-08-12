import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingFeature } from '@core/models/LandingFeature';
import { StorageService } from '@core/services/storage.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-landing-home-page',
  imports: [CommonModule, RouterLink, AppIconComponent],
  templateUrl: './landing-home-page.html',
  styleUrl: './landing-home-page.css',
})
export class LandingHomePage {
  protected readonly storageService = inject(StorageService);

  protected features= signal<LandingFeature[]>([
    {
      icon: 'user-round',
      title: 'Smart Seat Allocation',
      description:
        'Optimize occupancy with intelligent rules and real-time availability.',
      iconBgClass: 'bg-[var(--primary)]/10',
      iconTextClass: 'text-[var(--primary)]',
    },
    {
      icon: 'calendar-check',
      title: 'Real-Time Attendance',
      description:
        'Track check-in/out instantly across every branch.',
      iconBgClass: 'bg-indigo-500/10',
      iconTextClass: 'text-indigo-500',
    },
    {
      icon: 'building-2',
      title: 'Multi-Branch Management',
      description:
        'Manage institutions, branches, and libraries with tenant isolation.',
      iconBgClass: 'bg-emerald-500/10',
      iconTextClass: 'text-emerald-500',
    },
    {
      icon: 'credit-card',
      title: 'Subscription Billing',
      description:
        'Plans, invoices, and billing cycles—automated and accurate.',
      iconBgClass: 'bg-cyan-500/10',
      iconTextClass: 'text-cyan-500',
    },
    {
      icon: 'qr-code',
      title: 'QR Check-in',
      description:
        'Fast scanning for staff and students, with audit trails.',
      iconBgClass: 'bg-violet-500/10',
      iconTextClass: 'text-violet-500',
    },
    {
      icon: 'bar-chart-3',
      title: 'Revenue Analytics',
      description:
        'Understand performance with gradient dashboards and KPIs.',
      iconBgClass: 'bg-amber-500/10',
      iconTextClass: 'text-amber-500',
    },
    {
      icon: 'shield',
      title: 'Role-Based Access',
      description:
        'Secure collaboration with RBAC and scoped permissions.',
      iconBgClass: 'bg-rose-500/10',
      iconTextClass: 'text-rose-500',
    },
    {
      icon: 'bell',
      title: 'Notification System',
      description:
        'Alerts for attendance anomalies, billing events, and updates.',
      iconBgClass: 'bg-sky-500/10',
      iconTextClass: 'text-sky-500',
    },
    {
      icon: 'box',
      title: 'Inventory Management',
      description:
        'Track resources and maintain availability across libraries.',
      iconBgClass: 'bg-lime-500/10',
      iconTextClass: 'text-lime-500',
    },
    {
      icon: 'file-clock',
      title: 'Audit Logs',
      description:
        'Immutable activity trails for compliance and investigations.',
      iconBgClass: 'bg-fuchsia-500/10',
      iconTextClass: 'text-fuchsia-500',
    },
    {
      icon: 'book-open',
      title: 'Book Management',
      description:
        'Track books, availability, and renew across all branches.',
      iconBgClass: 'bg-cyan-500/10',
      iconTextClass: 'text-cyan-500',
    },
    {
      icon: 'book-open',
      title: 'Fee Receipt Generation',
      description:
        'Generate professional fee receipts instantly and deliver them seamlessly via WhatsApp or email notifications.',
      iconBgClass: 'bg-orange-500/10',
      iconTextClass: 'text-orange-500',
    },
  ]);
}

