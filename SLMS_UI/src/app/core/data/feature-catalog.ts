import { FeatureSection } from '@core/models/FeatureModel';
import { LandingFeature } from '@core/models/LandingFeature';

export const FEATURE_HERO = {
  src: 'assets/features/platform-modules-hero.png',
  alt: 'Lexora platform modules — institutions, branches, libraries, members, and analytics',
};

export function featureModuleImage(moduleId: string): string {
  return `assets/features/${moduleId}.png`;
}

export const FEATURE_CATALOG: FeatureSection[] = [
  {
    id: 'institution-tenant',
    title: 'Institution & Multi-Tenant',
    icon: 'building-2',
    color: 'bg-primary/10 text-primary',
    imageAlt: 'Institution and multi-tenant management',
    features: [
      {
        title: 'Institution Onboarding',
        description: 'Guided setup for new organisations with package selection and tenant provisioning.',
        icon: 'sparkles',
      },
      {
        title: 'Tenant Isolation',
        description: 'Secure data separation across institutions, branches, and libraries.',
        icon: 'shield-check',
      },
      {
        title: 'Institution Overview',
        description: 'Central dashboard for billing, analytics, branches, and governance.',
        icon: 'layout-dashboard',
      },
      {
        title: 'Package Subscriptions',
        description: 'Manage SaaS plans, renewals, and feature entitlements per institution.',
        icon: 'credit-card',
      },
    ],
  },
  {
    id: 'branch-management',
    title: 'Branch Management',
    icon: 'map-pin',
    color: 'bg-indigo-100 text-indigo-700',
    imageAlt: 'Multi-branch library operations',
    features: [
      {
        title: 'Multi-Branch Setup',
        description: 'Create and manage campus or city branches under one institution.',
        icon: 'business',
      },
      {
        title: 'Branch Profiles',
        description: 'Configure contact details, schedules, and operational settings per branch.',
        icon: 'settings',
      },
      {
        title: 'Branch Analytics',
        description: 'Track occupancy, members, and attendance at the branch level.',
        icon: 'bar-chart-3',
      },
      {
        title: 'Consolidated Reporting',
        description: 'Roll up performance across all branches from a single view.',
        icon: 'chart-column-big',
      },
    ],
  },
  {
    id: 'library-management',
    title: 'Library Management',
    icon: 'library',
    color: 'bg-emerald-100 text-emerald-700',
    imageAlt: 'Library setup and seat inventory',
    features: [
      {
        title: 'Library Setup',
        description: 'Create reading halls with capacity, layout, and resource configuration.',
        icon: 'book-open',
      },
      {
        title: 'Seat Inventory',
        description: 'Manage seat counts, assignments, and real-time availability.',
        icon: 'armchair',
      },
      {
        title: 'Weekly Operating Hours',
        description: 'Define open hours and access windows for each library.',
        icon: 'schedule',
      },
      {
        title: 'Library Member Mapping',
        description: 'Assign members to exactly one library within their branch.',
        icon: 'user-check',
      },
    ],
  },
  {
    id: 'member-management',
    title: 'Member Management',
    icon: 'UsersRound',
    color: 'bg-primary/10 text-primary',
    imageAlt: 'Member profiles and onboarding',
    features: [
      {
        title: 'Member Profiles',
        description: 'Full profiles with contacts, guardians, documents, and photos.',
        icon: 'user-round-cog',
      },
      {
        title: 'Bulk Member Upload',
        description: 'Import members in bulk with validation and error reporting.',
        icon: 'download',
      },
      {
        title: 'Member Plans & Fees',
        description: 'Track subscriptions, dues, adjustments, and payment history.',
        icon: 'payments',
      },
      {
        title: 'Search & Status Tracking',
        description: 'Find members by name, ID, or library and monitor active status.',
        icon: 'search',
      },
      {
        title: 'QR Registration',
        description: 'Fast member onboarding via QR-based registration flows.',
        icon: 'qr-code',
      },
    ],
  },
  {
    id: 'seat-shift',
    title: 'Seat & Shift Management',
    icon: 'event_seat',
    color: 'bg-green-100 text-green-700',
    imageAlt: 'Seat maps and shift scheduling',
    features: [
      {
        title: 'Interactive Seat Map',
        description: 'Visual layout of seats and floors across libraries.',
        icon: 'grid_view',
      },
      {
        title: 'Multi-Shift Support',
        description: 'Morning, evening, night, full-day, and 24-hour access shifts.',
        icon: 'schedule',
      },
      {
        title: 'Real-Time Availability',
        description: 'Track occupied, reserved, and available seats live.',
        icon: 'visibility',
      },
      {
        title: 'Fixed vs Floating Seats',
        description: 'Support dedicated seats and flexible floating access.',
        icon: 'compare_arrows',
      },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance Management',
    icon: 'calendar-check',
    color: 'bg-teal-100 text-teal-700',
    imageAlt: 'Attendance tracking and QR check-in',
    features: [
      {
        title: 'Daily Attendance Tracking',
        description: 'Mark check-in/out with date, time, and shift records per member.',
        icon: 'check-circle-2',
      },
      {
        title: 'QR Scanner & Self Check-In',
        description: 'Staff scanner and member self-service attendance via QR tokens.',
        icon: 'qr-code',
      },
      {
        title: 'Public Attendance Kiosk',
        description: 'Dedicated kiosk mode for library and member check-in without login.',
        icon: 'scan-line',
      },
      {
        title: 'Live & Calendar Views',
        description: 'Monitor live presence and browse historical attendance by date.',
        icon: 'calendar_month',
      },
      {
        title: 'Shift-Based Filtering',
        description: 'Filter records by morning, evening, night, or full-day shifts.',
        icon: 'schedule',
      },
      {
        title: 'Attendance Source Tracking',
        description: 'Identify whether attendance was marked by admin or self check-in.',
        icon: 'badge-check',
      },
    ],
  },
  {
    id: 'subscription-billing',
    title: 'Subscription & Billing',
    icon: 'credit-card',
    color: 'bg-purple-100 text-purple-700',
    imageAlt: 'Subscriptions, plans, and billing',
    features: [
      {
        title: 'Member Plan Subscriptions',
        description: 'Automated tracking of plan start, end, and renewal dates.',
        icon: 'event',
      },
      {
        title: 'Fee Due Tracking',
        description: 'Monitor pending payments, adjustments, and overdue balances.',
        icon: 'payments',
      },
      {
        title: 'Payment History',
        description: 'Complete transaction ledger with paid amounts and receipts.',
        icon: 'receipt_long',
      },
      {
        title: 'Fee Receipt Generation',
        description: 'Generate professional receipts and share via email or WhatsApp.',
        icon: 'file-text',
      },
      {
        title: 'Renewal & Upgrades',
        description: 'Upgrade plans or renew subscriptions in a few clicks.',
        icon: 'trending_up',
      },
    ],
  },
  {
    id: 'books-circulation',
    title: 'Books & Circulation',
    icon: 'book-open',
    color: 'bg-cyan-100 text-cyan-700',
    imageAlt: 'Book catalog and circulation',
    features: [
      {
        title: 'Book Catalog',
        description: 'Manage titles, authors, categories, and availability across libraries.',
        icon: 'book-user',
      },
      {
        title: 'Loans & Returns',
        description: 'Issue, track, and close book loans with due dates.',
        icon: 'history',
      },
      {
        title: 'Late Fees & Fines',
        description: 'Automated fine calculation for overdue returns.',
        icon: 'indian-rupee',
      },
      {
        title: 'Reservations & Holds',
        description: 'Reserve books and manage hold queues for members.',
        icon: 'archive',
      },
    ],
  },
  {
    id: 'dashboard-analytics',
    title: 'Dashboard & Analytics',
    icon: 'layout-dashboard',
    color: 'bg-amber-100 text-amber-700',
    isPremium: true,
    imageAlt: 'Dashboard KPIs and analytics',
    features: [
      {
        title: 'Real-Time KPI Dashboard',
        description: 'Overview cards for occupancy, revenue, attendance, and alerts.',
        icon: 'dashboard',
      },
      {
        title: 'Occupancy Analytics',
        description: 'Seat utilisation trends and peak-hour insights.',
        icon: 'chart-column-big',
      },
      {
        title: 'Revenue Insights',
        description: 'Track collections, subscriptions, and payment sources.',
        icon: 'bar-chart-3',
      },
      {
        title: 'Attendance Trends',
        description: 'Daily and shift-wise attendance patterns across branches.',
        icon: 'activity',
      },
      {
        title: 'Activity Feed',
        description: 'Recent actions and system events for operational awareness.',
        icon: 'file-clock',
      },
    ],
  },
  {
    id: 'revenue-reports',
    title: 'Revenue & Reports',
    icon: 'bar_chart',
    color: 'bg-yellow-100 text-yellow-700',
    isPremium: true,
    imageAlt: 'Revenue reports and exports',
    features: [
      {
        title: 'Daily Reports',
        description: 'Summarise daily collections, attendance, and activity.',
        icon: 'summarize',
      },
      {
        title: 'Payment Source Breakdown',
        description: 'Analyse UPI, cash, and other payment channels.',
        icon: 'analytics',
      },
      {
        title: 'Revenue Charts',
        description: 'Visual trends and comparative performance over time.',
        icon: 'show_chart',
      },
      {
        title: 'Export Reports',
        description: 'Download Excel and PDF reports for accounting and audits.',
        icon: 'download',
      },
    ],
  },
  {
    id: 'communication',
    title: 'Communication & Notifications',
    icon: 'bell',
    color: 'bg-pink-100 text-pink-700',
    imageAlt: 'Notifications and alerts',
    features: [
      {
        title: 'In-App Notifications',
        description: 'Alert staff and members about billing, attendance, and updates.',
        icon: 'notifications',
      },
      {
        title: 'Email Notifications',
        description: 'Automated mail for receipts, reminders, and system events.',
        icon: 'mail',
      },
      {
        title: 'Expiry & Fee Reminders',
        description: 'Proactive reminders before plan expiry or payment due dates.',
        icon: 'alarm',
      },
      {
        title: 'Custom Alerts',
        description: 'Targeted notifications for branches, libraries, or member groups.',
        icon: 'bell',
      },
    ],
  },
  {
    id: 'admin-access',
    title: 'Admin & Access Control',
    icon: 'shield',
    color: 'bg-red-100 text-red-700',
    imageAlt: 'Roles, permissions, and audit logs',
    features: [
      {
        title: 'Role-Based Access Control',
        description: 'Granular permissions for every module and action.',
        icon: 'admin_panel_settings',
      },
      {
        title: 'User Management',
        description: 'Invite staff, assign roles, and manage account lifecycle.',
        icon: 'user-plus',
      },
      {
        title: 'Scoped Access',
        description: 'Limit users to specific institutions, branches, or libraries.',
        icon: 'lock',
      },
      {
        title: 'Custom Roles & Cloning',
        description: 'Create tailored roles and clone permissions from existing ones.',
        icon: 'user-cog',
      },
      {
        title: 'Audit Logs',
        description: 'Immutable activity trails for compliance and investigations.',
        icon: 'file-clock',
      },
      {
        title: 'OTP Authentication',
        description: 'Secure phone-based login with verification flows.',
        icon: 'verified_user',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support Centre',
    icon: 'life-buoy',
    color: 'bg-sky-100 text-sky-700',
    imageAlt: 'Support centre and help resources',
    features: [
      {
        title: 'Help & Documentation',
        description: 'In-app guidance and resources for administrators.',
        icon: 'circle-help',
      },
      {
        title: 'Support Tickets',
        description: 'Raise and track issues directly from the platform.',
        icon: 'chat',
      },
      {
        title: 'Service Status',
        description: 'Monitor platform health and incident updates.',
        icon: 'activity',
      },
      {
        title: 'Priority Support',
        description: 'Enterprise plans include faster response and dedicated assistance.',
        icon: 'shield-check',
      },
    ],
  },
];

const LANDING_COLOR_CLASSES = [
  { iconBgClass: 'bg-[var(--primary)]/10', iconTextClass: 'text-[var(--primary)]' },
  { iconBgClass: 'bg-indigo-500/10', iconTextClass: 'text-indigo-500' },
  { iconBgClass: 'bg-emerald-500/10', iconTextClass: 'text-emerald-500' },
  { iconBgClass: 'bg-violet-500/10', iconTextClass: 'text-violet-500' },
  { iconBgClass: 'bg-green-500/10', iconTextClass: 'text-green-500' },
  { iconBgClass: 'bg-teal-500/10', iconTextClass: 'text-teal-500' },
  { iconBgClass: 'bg-purple-500/10', iconTextClass: 'text-purple-500' },
  { iconBgClass: 'bg-cyan-500/10', iconTextClass: 'text-cyan-500' },
  { iconBgClass: 'bg-amber-500/10', iconTextClass: 'text-amber-500' },
  { iconBgClass: 'bg-yellow-500/10', iconTextClass: 'text-yellow-500' },
  { iconBgClass: 'bg-pink-500/10', iconTextClass: 'text-pink-500' },
  { iconBgClass: 'bg-rose-500/10', iconTextClass: 'text-rose-500' },
  { iconBgClass: 'bg-sky-500/10', iconTextClass: 'text-sky-500' },
] as const;

export function countFeatureCatalogModules(catalog: FeatureSection[] = FEATURE_CATALOG): number {
  return catalog.length;
}

export function countFeatureCatalogItems(catalog: FeatureSection[] = FEATURE_CATALOG): number {
  return catalog.reduce((total, section) => total + section.features.length, 0);
}

export function toLandingFeatures(catalog: FeatureSection[] = FEATURE_CATALOG): LandingFeature[] {
  return catalog.map((section, index) => {
    const colors = LANDING_COLOR_CLASSES[index % LANDING_COLOR_CLASSES.length];
    const highlights = section.features.slice(0, 3).map((item) => item.title).join(', ');

    return {
      id: section.id,
      icon: section.icon,
      title: section.title,
      image: section.image ?? featureModuleImage(section.id),
      description: highlights ? `${highlights}, and more.` : section.features[0]?.description ?? '',
      iconBgClass: colors.iconBgClass,
      iconTextClass: colors.iconTextClass,
    };
  });
}
