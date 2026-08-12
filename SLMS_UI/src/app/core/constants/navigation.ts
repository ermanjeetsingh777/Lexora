/** Mirrors Lovable `app-sidebar.tsx` nav groups */
export interface NavItem {
  title: string;
  route: string;
  icon: string;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const SIDEBAR_NAV: NavGroup[] = [
  {
    label: 'Workspace',
    items: [{ title: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' }],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Members', route: '/members', icon: 'users' },
      { title: 'Students', route: '/students', icon: 'graduation-cap' },
      { title: 'Teachers', route: '/teachers', icon: 'book-user' },
      { title: 'Seats', route: '/seats', icon: 'armchair' },
      { title: 'Attendance', route: '/attendance', icon: 'calendar-check' },
      { title: 'Scanner', route: '/attendance/scanner', icon: 'qr-code' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { title: 'Institutions', route: '/institutions', icon: 'building-2' },
      { title: 'Branches', route: '/branches', icon: 'building-2' },
      { title: 'Libraries', route: '/libraries', icon: 'library' },
      { title: 'Subscriptions', route: '/subscriptions', icon: 'layers' },
      { title: 'Payments', route: '/payments', icon: 'credit-card' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { title: 'Reports', route: '/reports', icon: 'bar-chart-3' },
      { title: 'Notifications', route: '/notifications', icon: 'bell' },
    ],
  },
  {
    label: 'Library',
    items: [{ title: 'Books', route: '/books', icon: 'book-open' }],
  },
  {
    label: 'Admin',
    items: [
      { title: 'Users', route: '/users', icon: 'user-cog' },
      { title: 'Roles', route: '/roles', icon: 'shield' },
      { title: 'Settings', route: '/settings', icon: 'settings' },
      { title: 'Support', route: '/support', icon: 'life-buoy' },
    ],
  },
];

export const DASHBOARD_TABS = [
  { label: 'Overview', path: '/dashboard' },
  { label: 'Analytics', path: '/dashboard/analytics' },
  { label: 'Occupancy', path: '/dashboard/occupancy' },
  { label: 'Revenue', path: '/dashboard/revenue' },
  { label: 'Attendance', path: '/dashboard/attendance' },
  { label: 'Subscriptions', path: '/dashboard/subscriptions' },
  { label: 'Notifications', path: '/dashboard/notifications' },
  { label: 'Activity', path: '/dashboard/activity' },
];
