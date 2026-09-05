/**
 * Feature-wise route catalog for Lexora E2E.
 * Grouped to mirror sidebar + app.routes.ts modules/components.
 */
export const e2eCredentials = {
  email: process.env.E2E_EMAIL ?? 'institution@slms.com',
  password: process.env.E2E_PASSWORD ?? 'Demo@12345',
  superAdminEmail: process.env.E2E_SUPER_EMAIL ?? 'superadmin@slms.com',
  superAdminPassword: process.env.E2E_SUPER_PASSWORD ?? 'SuperAdmin@123',
};

export type FeatureRoute = {
  path: string;
  name: string;
  /** Optional CSS/role hint that should appear when page is healthy */
  expectVisible?: string;
};

export type FeatureModule = {
  id: string;
  title: string;
  routes: FeatureRoute[];
};

/** Public (no-auth) marketing + auth pages */
export const publicFeatureModules: FeatureModule[] = [
  {
    id: 'landing',
    title: 'Landing & marketing',
    routes: [
      { path: '/', name: 'Landing home', expectVisible: 'body' },
      { path: '/features', name: 'Features page' },
      { path: '/prices', name: 'Pricing page' },
      { path: '/terms', name: 'Terms of service' },
      { path: '/policies', name: 'Policies hub' },
      { path: '/privacy-policy', name: 'Privacy policy' },
      { path: '/cookie-policy', name: 'Cookie policy' },
      { path: '/data-processing', name: 'Data processing' },
      { path: '/acceptable-use', name: 'Acceptable use' },
      { path: '/security-policy', name: 'Security policy' },
      { path: '/refund-policy', name: 'Refund policy' },
    ],
  },
  {
    id: 'auth-public',
    title: 'Auth (public)',
    routes: [
      { path: '/login', name: 'Login', expectVisible: '#email' },
      { path: '/register', name: 'Register' },
      { path: '/forgot-password', name: 'Forgot password' },
      { path: '/reset-password', name: 'Reset password' },
      { path: '/verify-otp', name: 'Verify OTP' },
      { path: '/unauthorized', name: 'Unauthorized' },
      { path: '/pending-approval', name: 'Pending approval' },
    ],
  },
  {
    id: 'kiosk',
    title: 'Attendance kiosk (public)',
    routes: [
      { path: '/kiosk/attendance/library', name: 'Library QR kiosk' },
      { path: '/kiosk/attendance/member', name: 'Member QR kiosk' },
    ],
  },
];

/** Authenticated feature modules — all components / sub-routes */
export const authenticatedFeatureModules: FeatureModule[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    routes: [
      { path: '/dashboard', name: 'Overview', expectVisible: 'main' },
      { path: '/dashboard/analytics', name: 'Analytics' },
      { path: '/dashboard/occupancy', name: 'Occupancy' },
      { path: '/dashboard/revenue', name: 'Revenue' },
      { path: '/dashboard/attendance', name: 'Attendance insights' },
      { path: '/dashboard/subscriptions', name: 'Subscriptions insights' },
      { path: '/dashboard/notifications', name: 'Notifications' },
      { path: '/dashboard/activity', name: 'Activity feed' },
    ],
  },
  {
    id: 'institutions',
    title: 'Institutions',
    routes: [
      { path: '/institutions', name: 'Institutions list', expectVisible: 'main' },
      { path: '/institutions/create', name: 'Create institution' },
      // Dynamic: /institutions/:id + tabs + addbranch/addlibrary/members — see entity-details.spec.ts
    ],
  },
  {
    id: 'branches',
    title: 'Branches',
    routes: [
      { path: '/branches', name: 'Branches list', expectVisible: 'main' },
      { path: '/branches/create', name: 'Create branch' },
      // Dynamic: /branches/:id tabs + edit/addlibrary/members — see entity-details.spec.ts
    ],
  },
  {
    id: 'libraries',
    title: 'Libraries',
    routes: [
      { path: '/libraries', name: 'Libraries list', expectVisible: 'main' },
      { path: '/libraries/create', name: 'Create library' },
      // Dynamic: /libraries/:id tabs + edit/members — see entity-details.spec.ts
    ],
  },
  {
    id: 'members',
    title: 'Members',
    routes: [
      { path: '/members', name: 'Members list', expectVisible: 'main' },
      { path: '/members/create', name: 'Create member form' },
      { path: '/members/bulk-upload', name: 'Bulk upload members' },
      // Dynamic: /members/:id tabs + edit — see entity-details.spec.ts
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    routes: [
      { path: '/attendance', name: 'Overview', expectVisible: 'main' },
      { path: '/attendance/calendar', name: 'Calendar' },
      { path: '/attendance/live', name: 'Live feed' },
      { path: '/attendance/records', name: 'Records / export' },
      { path: '/attendance/scanner', name: 'QR scanner' },
    ],
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    routes: [{ path: '/subscriptions', name: 'Package subscriptions', expectVisible: 'main' }],
  },
  {
    id: 'books',
    title: 'Books',
    routes: [{ path: '/books', name: 'Books catalogue', expectVisible: 'main' }],
  },
  {
    id: 'admin',
    title: 'Admin',
    routes: [
      { path: '/users', name: 'Users list' },
      { path: '/roles', name: 'Roles list' },
      { path: '/admin/approvals', name: 'Tenant / customer approvals' },
    ],
  },
  {
    id: 'profile',
    title: 'Profile & settings',
    routes: [
      { path: '/profile', name: 'Profile', expectVisible: 'main' },
      { path: '/settings', name: 'Settings redirect → profile' },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    routes: [
      { path: '/support', name: 'Support centre', expectVisible: 'main' },
      { path: '/support/status', name: 'Support status' },
    ],
  },
];

/** Flat lists (backward compatible with older specs) */
export const publicRoutes = publicFeatureModules.flatMap((m) => m.routes);
export const authenticatedRoutes = authenticatedFeatureModules.flatMap((m) => m.routes);
export const kioskRoutes = publicFeatureModules.find((m) => m.id === 'kiosk')!.routes;

/** Sidebar primary links — feature-wise (matches sidebar.component.ts) */
export const sidebarFeatureLinks: FeatureRoute[] = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/members', name: 'Members' },
  { path: '/attendance', name: 'Attendance overview' },
  { path: '/attendance/scanner', name: 'Attendance scanner' },
  { path: '/institutions', name: 'Institutions' },
  { path: '/branches', name: 'Branches' },
  { path: '/libraries', name: 'Libraries' },
  { path: '/subscriptions', name: 'Subscriptions' },
  { path: '/books', name: 'Books' },
  { path: '/users', name: 'Users' },
  { path: '/admin/approvals', name: 'Approvals' },
  { path: '/roles', name: 'Roles' },
  { path: '/profile', name: 'Profile' },
  { path: '/support', name: 'Support' },
];
