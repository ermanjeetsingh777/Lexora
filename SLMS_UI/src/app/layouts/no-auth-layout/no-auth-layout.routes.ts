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
                path: 'privacy-policy',
                loadComponent: () => import('../../features/policy/policy').then((m) => m.Policy),
            },
        ]
    }
];
