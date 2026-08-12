import { Component, signal } from '@angular/core';
import { FeatureSection } from '@core/models/FeatureModel';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-feature',
  imports: [AppIconComponent],
  templateUrl: './feature.html',
  styleUrl: './feature.css',
})
export class Feature {
  protected featureSections = signal<FeatureSection[]>([
  // 🔵 Student Management
  {
    id: 'student-management',
    title: 'Student Management',
    icon: 'UsersRound',
    color: 'bg-primary/10 text-primary',
    features: [
      {
        title: 'QR Code-Based Registration',
        description: 'Students can quickly register by scanning a QR code.',
        icon: 'qr-code',
      },
      {
        title: 'Student Profiles & History',
        description: 'Track subscriptions, payments, and activity.',
        icon: 'user-round-cog',
      },
      {
        title: 'Approval Workflow',
        description: 'Approve or reject registrations easily.',
        icon: 'check_circle',
      },
      {
        title: 'Search & Filter Students',
        description: 'Find students by name, phone, or status.',
        icon: 'search',
      },
      {
        title: 'Student Status Tracking',
        description: 'Monitor active, pending, and inactive users.',
        icon: 'visibility',
      },
    ],
  },

  // 🟢 Seat & Shift Management
  {
    id: 'seat-management',
    title: 'Seat & Shift Management',
    icon: 'event_seat',
    color: 'bg-green-100 text-green-700',
    features: [
      {
        title: 'Interactive Seat Map',
        description: 'Visual layout of seats and floors.',
        icon: 'grid_view',
      },
      {
        title: 'Multi-Shift Support',
        description: 'Morning, evening, night, full-day shifts.',
        icon: 'schedule',
      },
      {
        title: 'Real-time Seat Availability',
        description: 'Track occupied and available seats.',
        icon: 'visibility',
      },
      {
        title: 'Seat Booking System',
        description: 'Assign seats based on subscriptions.',
        icon: 'event_available',
      },
      {
        title: 'Floating vs Fixed Seats',
        description: 'Support flexible and fixed seating.',
        icon: 'settings',
      },
    ],
  },

  // 🟣 Subscription Management
  {
    id: 'subscription',
    title: 'Subscription Management',
    icon: 'subscriptions',
    color: 'bg-purple-100 text-purple-700',
    features: [
      {
        title: 'Automated Subscription Tracking',
        description: 'Track start and end dates automatically.',
        icon: 'event',
      },
      {
        title: 'Expiry Alerts & Reminders',
        description: 'Notify users before expiry.',
        icon: 'notifications',
      },
      {
        title: 'Fee Due Tracking',
        description: 'Monitor pending payments.',
        icon: 'payments',
      },
      {
        title: 'Payment History',
        description: 'View all transactions easily.',
        icon: 'receipt_long',
      },
      {
        title: 'Renewal & Upgrade Options',
        description: 'Upgrade or renew plans instantly.',
        icon: 'trending_up',
      },
    ],
  },

  // 🟡 Revenue & Reports (Premium)
  {
    id: 'revenue',
    title: 'Revenue & Reports',
    icon: 'bar_chart',
    color: 'bg-yellow-100 text-yellow-700',
    isPremium: true,
    features: [
      {
        title: 'Dashboard Overview',
        description: 'Real-time stats and alerts.',
        icon: 'dashboard',
      },
      {
        title: 'Daily Reports',
        description: 'Track daily activity and collections.',
        icon: 'summarize',
      },
      {
        title: 'Revenue Tracking',
        description: 'Monitor income streams.',
        icon: 'payments',
      },
      {
        title: 'Payment Source Breakdown',
        description: 'Analyze UPI, cash, etc.',
        icon: 'analytics',
      },
      {
        title: 'Revenue Charts',
        description: 'Visual trends and insights.',
        icon: 'show_chart',
      },
      {
        title: 'Export Reports',
        description: 'Export Excel & PDF reports.',
        icon: 'download',
      },
    ],
  },

  // 🔵 Multi-Branch Management (Premium)
  {
    id: 'multi-branch',
    title: 'Multi-Branch Management',
    icon: 'business',
    color: 'bg-indigo-100 text-indigo-700',
    isPremium: true,
    features: [
      {
        title: 'Centralized Dashboard',
        description: 'Manage all branches in one place.',
        icon: 'dashboard',
      },
      {
        title: 'Branch-Specific Settings',
        description: 'Customize each branch.',
        icon: 'settings',
      },
      {
        title: 'Consolidated Reporting',
        description: 'View overall performance.',
        icon: 'bar_chart',
      },
    ],
  },

  // 🌸 Communication
  {
    id: 'communication',
    title: 'Communication & Notifications',
    icon: 'chat',
    color: 'bg-pink-100 text-pink-700',
    features: [
      {
        title: 'In-app Messaging',
        description: 'Send updates to students.',
        icon: 'chat',
      },
      {
        title: 'Custom Notifications',
        description: 'Send personalized alerts.',
        icon: 'notifications_active',
      },
      {
        title: 'Automated Reminders',
        description: 'Auto reminders for fees & expiry.',
        icon: 'alarm',
      },
    ],
  },

  // 🔴 Security
  {
    id: 'security',
    title: 'Security & Access',
    icon: 'shield',
    color: 'bg-red-100 text-red-700',
    features: [
      {
        title: 'OTP Authentication',
        description: 'Secure login with phone OTP.',
        icon: 'verified_user',
      },
      {
        title: 'Role-Based Access',
        description: 'Control user permissions.',
        icon: 'admin_panel_settings',
      },
      {
        title: 'Secure Data Storage',
        description: 'Encrypted cloud storage.',
        icon: 'lock',
      },
    ],
  },

  {
    id: 'attendance',
    title: 'Attendance Management',
    icon: 'fact_check',
    color: 'bg-teal-100 text-teal-700',
    features: [
      {
        title: 'Daily Attendance Tracking',
        description:
          'Mark attendance instantly with one-click and track date & time records for each student.',
        icon: 'task_alt',
      },
      {
        title: 'Shift-Based Filtering',
        description:
          'Filter attendance by shift — Morning, Evening, Night, Full Day, or 24-hour access.',
        icon: 'schedule',
      },
      {
        title: 'Fixed vs Floating Students',
        description:
          'Manage attendance separately for fixed-seat and floating-seat students with dedicated views.',
        icon: 'compare_arrows',
      },
      {
        title: 'Search & Sort Records',
        description:
          'Quickly find students by name, member ID, or seat number and sort records efficiently.',
        icon: 'search',
      },
      {
        title: 'Attendance Source Tracking',
        description: 'Identify whether attendance was marked by admin or via student self check-in.',
        icon: 'verified',
      },
      {
        title: 'Date-wise Attendance Logs',
        description: 'Access attendance history by selecting any date using a calendar-based view.',
        icon: 'calendar_month',
      },
    ],
  },
]);
}
