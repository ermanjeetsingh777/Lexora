import { Routes } from '@angular/router';

export const nonAuthRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./no-auth-layout').then(m => m.NoAuthLayout),
        children: [
            {
                path: '',
                loadComponent: () => import('../../features/landing/landing-home-page').then((m) => m.LandingHomePage),
            },
            {
                path: 'features',
                loadComponent: () => import('../../features/feature/feature').then((m) => m.Feature),
            },
            {
                path: 'prices',
                loadComponent: () => import('../../features/prices/prices').then((m) => m.Prices),
            },
            {
                path: 'terms',
                loadComponent: () => import('../../features/term-of-service/term-of-service').then((m) => m.TermOfService),
            },
            {
                path: 'policies',
                loadComponent: () => import('../../features/policy/policy-hub').then((m) => m.PolicyHub),
            },
            {
                path: 'privacy-policy',
                loadComponent: () => import('../../features/policy/policy').then((m) => m.Policy),
                data: { policySlug: 'privacy' },
            },
            {
                path: 'cookie-policy',
                loadComponent: () => import('../../features/policy/policy').then((m) => m.Policy),
                data: { policySlug: 'cookie' },
            },
            {
                path: 'data-processing',
                loadComponent: () => import('../../features/policy/policy').then((m) => m.Policy),
                data: { policySlug: 'data-processing' },
            },
            {
                path: 'acceptable-use',
                loadComponent: () => import('../../features/policy/policy').then((m) => m.Policy),
                data: { policySlug: 'acceptable-use' },
            },
            {
                path: 'security-policy',
                loadComponent: () => import('../../features/policy/policy').then((m) => m.Policy),
                data: { policySlug: 'security' },
            },
            {
                path: 'refund-policy',
                loadComponent: () => import('../../features/policy/policy').then((m) => m.Policy),
                data: { policySlug: 'refund' },
            },
        ]
    }
];
