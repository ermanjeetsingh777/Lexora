import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { onboardingCompleteGuard, onboardingGuard } from '@core/guards/onboarding.guard';
import { permissionGuard } from '@core/guards/permission.guard';
import { PermissionKey } from '@core/constants/permissions';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./layouts/no-auth-layout/no-auth-layout.routes').then((m) => m.nonAuthRoutes),
    },
    // --- Guest-only authentication flow ---
    {
        path: 'login',
        canActivate: [onboardingGuard],
        loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: 'register',
        canActivate: [onboardingGuard],
        loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
    },
    {
        path: 'verify-otp',
        loadComponent: () => import('./features/auth/verify-otp/verify-otp.component').then((m) => m.VerifyOtpComponent),
    },
    {
        path: 'unauthorized',
        loadComponent: () => import('./features/auth/unauthorized/unauthorized.component').then((m) => m.UnauthorizedComponent),
    },
    // Public attendance kiosk (no login)
    {
        path: 'kiosk/attendance/library',
        loadComponent: () => import('./features/attendance/kiosk/library-kiosk.component').then((m) => m.LibraryKioskComponent),
    },
    {
        path: 'kiosk/attendance/member',
        loadComponent: () => import('./features/attendance/kiosk/member-kiosk.component').then((m) => m.MemberKioskComponent),
    },
    {
        path: 'onboarding',
        canActivate: [onboardingGuard],
        loadComponent: () => import('./features/onboarding/onboarding-shell').then((m) => m.OnboardingShell),
        loadChildren: () => import('./features/onboarding/onboarding-shell.routes').then((m) => m.onBoardingRoutes),
    },
    // --- Authenticated area ---
    {
        path: '',
        canActivate: [authGuard, onboardingCompleteGuard],
        loadComponent: () => import('./layouts/app-shell/app-shell.component').then((m) => m.AppShellComponent),
        children: [
            // --- Dashboard ---
            {
                path: 'dashboard',
                canActivate: [permissionGuard],
                data: { permission: PermissionKey.DashboardView },
                loadComponent: () => import('./features/dashboard/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
                children: [
                    { path: '', loadComponent: () => import('./features/dashboard/dashboard-overview.component').then((m) => m.DashboardOverviewComponent) },
                    { path: 'analytics', loadComponent: () => import('./features/dashboard/dashboard-analytics.component').then((m) => m.DashboardAnalyticsComponent) },
                    { path: 'occupancy', loadComponent: () => import('./features/dashboard/dashboard-occupancy.component').then((m) => m.DashboardOccupancyComponent) },
                    { path: 'revenue', loadComponent: () => import('./features/dashboard/dashboard-revenue.component').then((m) => m.DashboardRevenueComponent) },
                    { path: 'attendance', loadComponent: () => import('./features/dashboard/dashboard-attendance.component').then((m) => m.DashboardAttendanceComponent) },
                    { path: 'subscriptions', loadComponent: () => import('./features/dashboard/dashboard-subscriptions.component').then((m) => m.DashboardSubscriptionsComponent) },
                    { path: 'notifications', loadComponent: () => import('./features/dashboard/dashboard-notifications.component').then((m) => m.DashboardNotificationsComponent) },
                    { path: 'activity', loadComponent: () => import('./features/dashboard/dashboard-activity.component').then((m) => m.DashboardActivityComponent) },
                ],
            },

            // --- Members ---
            {
                path: 'members',
                children: [
                    { path: '', loadComponent: () => import('./features/members/members-list-component/members-list-component').then((m) => m.MembersListComponent) },
                    { path: 'create', loadComponent: () => import('./features/members/create-member-component/create-member-component').then((m) => m.CreateMemberComponent) },
                    { path: 'bulk-upload', loadComponent: () => import('./features/members/bulk-upload-members-component/bulk-upload-members-component').then((m) => m.BulkUploadMembersComponent) },
                    { path: ':memberId/edit', loadComponent: () => import('./features/members/edit-member-component/edit-member-component').then((m) => m.EditMemberComponent) },
                    { path: ':memberId', loadComponent: () => import('./features/members/member-details-component/member-details-component').then((m) => m.MemberDetailsComponent) },
                ],
            },

            // --- Institutions ---
            {
                path: 'institutions',
                children: [
                    { path: '', loadComponent: () => import('./features/institutions/institutions-list/institutions-list').then((m) => m.InstitutionsListComponent) },
                    { path: 'create', loadComponent: () => import('./features/institutions/institution-create/institution-create').then((m) => m.InstitutionCreate) },
                    { path: ':institutionId/branches/:branchId/edit', loadComponent: () => import('./features/branches/branch-edit/branch-edit').then((m) => m.BranchEdit) },
                    { path: ':institutionId/branches/:branchId/members/create', loadComponent: () => import('./features/members/create-member-component/create-member-component').then((m) => m.CreateMemberComponent) },
                    { path: ':institutionId/branches/:branchId/members/:memberId/edit', loadComponent: () => import('./features/members/edit-member-component/edit-member-component').then((m) => m.EditMemberComponent) },
                    { path: ':institutionId/branches/:branchId/members/:memberId', loadComponent: () => import('./features/members/member-details-component/member-details-component').then((m) => m.MemberDetailsComponent) },
                    { path: ':institutionId/branches/:branchId/libraries/:libraryId', loadComponent: () => import('./features/libraries/library-detail-component/library-detail.component').then((m) => m.LibraryDetailComponent) },
                    { path: ':institutionId/branches/:branchId', loadComponent: () => import('./features/branches/branch-detail-component/branch-detail.component').then((m) => m.BranchDetailComponent) },
                    { path: ':institutionId/members/create', loadComponent: () => import('./features/members/create-member-component/create-member-component').then((m) => m.CreateMemberComponent) },
                    { path: ':institutionId/members/:memberId/edit', loadComponent: () => import('./features/members/edit-member-component/edit-member-component').then((m) => m.EditMemberComponent) },
                    { path: ':institutionId/members/:memberId', loadComponent: () => import('./features/members/member-details-component/member-details-component').then((m) => m.MemberDetailsComponent) },
                    { path: ':institutionId/addbranch', loadComponent: () => import('./features/branches/branch-create/branch-create').then((m) => m.BranchCreate) },
                    { path: ':institutionId/addlibrary', loadComponent: () => import('./features/libraries/create-library/create-library').then((m) => m.CreateLibrary) },
                    { path: ':institutionId', loadComponent: () => import('./features/institutions/institution-detail/institution-detail.component').then((m) => m.InstitutionDetailComponent) },
                ],
            },

            // --- Branches ---
            {
                path: 'branches',
                children: [
                    { path: '', loadComponent: () => import('./features/branches/branch-list-component/branch-list-component').then((m) => m.BranchListComponent) },
                    { path: 'create', loadComponent: () => import('./features/branches/branch-create/branch-create').then((m) => m.BranchCreate) },
                    { path: ':branchId/edit', loadComponent: () => import('./features/branches/branch-edit/branch-edit').then((m) => m.BranchEdit) },
                    { path: ':branchId/members/create', loadComponent: () => import('./features/members/create-member-component/create-member-component').then((m) => m.CreateMemberComponent) },
                    { path: ':branchId/members/:memberId/edit', loadComponent: () => import('./features/members/edit-member-component/edit-member-component').then((m) => m.EditMemberComponent) },
                    { path: ':branchId/members/:memberId', loadComponent: () => import('./features/members/member-details-component/member-details-component').then((m) => m.MemberDetailsComponent) },
                    { path: ':branchId/libraries/:libraryId', loadComponent: () => import('./features/libraries/library-detail-component/library-detail.component').then((m) => m.LibraryDetailComponent) },
                    { path: ':branchId/addlibrary', loadComponent: () => import('./features/libraries/create-library/create-library').then((m) => m.CreateLibrary) },
                    { path: ':branchId', loadComponent: () => import('./features/branches/branch-detail-component/branch-detail.component').then((m) => m.BranchDetailComponent) },
                ],
            },

            // --- Libraries ---
            {
                path: 'libraries',
                children: [
                    { path: '', loadComponent: () => import('./features/libraries/library-list-component/library-list-component').then((m) => m.LibraryListComponent) },
                    { path: 'create', loadComponent: () => import('./features/libraries/create-library/create-library').then((m) => m.CreateLibrary) },
                    { path: ':libraryId/edit', loadComponent: () => import('./features/libraries/library-edit/library-edit').then((m) => m.LibraryEdit) },
                    { path: ':libraryId/members/create', loadComponent: () => import('./features/members/create-member-component/create-member-component').then((m) => m.CreateMemberComponent) },
                    { path: ':libraryId/members/:memberId/edit', loadComponent: () => import('./features/members/edit-member-component/edit-member-component').then((m) => m.EditMemberComponent) },
                    { path: ':libraryId/members/:memberId', loadComponent: () => import('./features/members/member-details-component/member-details-component').then((m) => m.MemberDetailsComponent) },
                    { path: ':libraryId', loadComponent: () => import('./features/libraries/library-detail-component/library-detail.component').then((m) => m.LibraryDetailComponent) },
                ],
            },

            // --- Subscriptions ---
            {
                path: 'subscriptions',
                canActivate: [permissionGuard],
                data: { permission: PermissionKey.SubscriptionsView },
                loadComponent: () => import('./features/subscriptions/subscriptions.component').then((m) => m.SubscriptionsComponent),
            },

            // --- Attendance ---
            {
                path: 'attendance',
                canActivate: [permissionGuard],
                data: { permission: PermissionKey.AttendanceView },
                loadComponent: () => import('./features/attendance/attendance-shell/attendance-shell.component').then((m) => m.AttendanceShellComponent),
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/attendance/attendance-overview/attendance-overview.component').then((m) => m.AttendanceOverviewComponent),
                    },
                    {
                        path: 'calendar',
                        loadComponent: () => import('./features/attendance/attendance-calendar/attendance-calendar.component').then((m) => m.AttendanceCalendarComponent),
                    },
                    {
                        path: 'live',
                        loadComponent: () => import('./features/attendance/attendance-live/attendance-live.component').then((m) => m.AttendanceLiveComponent),
                    },
                    {
                        path: 'records',
                        canActivate: [permissionGuard],
                        data: { permission: PermissionKey.AttendanceList },
                        loadComponent: () => import('./features/attendance/attendance-records/attendance-records.component').then((m) => m.AttendanceRecordsComponent),
                    },
                    {
                        path: 'scanner',
                        canActivate: [permissionGuard],
                        data: { permission: PermissionKey.AttendanceScannerUse },
                        loadComponent: () => import('./features/attendance/attendance-scanner/attendance-scanner.component').then((m) => m.AttendanceScannerComponent),
                    },
                ],
            },

            // --- Books ---
            {
                path: 'books',
                loadComponent: () => import('./features/books/books-list-component/books-list.component').then((m) => m.BooksListComponent),
            },

            // --- Users (Admin) ---
            {
                path: 'users',
                canActivate: [permissionGuard],
                data: { permission: PermissionKey.UsersList },
                loadComponent: () => import('./features/admin/users-list/users-list.component').then((m) => m.UsersListComponent),
            },

            // --- Roles (Admin) ---
            {
                path: 'roles',
                canActivate: [permissionGuard],
                data: { permission: PermissionKey.RolesList },
                loadComponent: () => import('./features/admin/roles-list/roles-list.component').then((m) => m.RolesListComponent),
            },

            // --- Profile ---
            {
                path: 'profile',
                loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
            },
            { path: 'settings', redirectTo: 'profile', pathMatch: 'full' },
            { path: 'settings/profile', redirectTo: 'profile', pathMatch: 'full' },

            // --- Support ---
            {
                path: 'support',
                loadComponent: () => import('./features/support/support-centre.component').then((m) => m.SupportCentreComponent),
            },
            {
                path: 'support/status',
                loadComponent: () => import('./features/support/support-status.component').then((m) => m.SupportStatusComponent),
            },
        ],
    },

    { path: '**', redirectTo: 'dashboard' },
];
