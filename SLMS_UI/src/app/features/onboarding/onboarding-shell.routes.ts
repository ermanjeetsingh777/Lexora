import { Routes } from '@angular/router';

export const onBoardingRoutes: Routes = [
    {
        path: 'institution',
        loadComponent: () => import('./pages/on-boarding-institution/on-boarding-institution').then((m) => m.OnBoardingInstitution),
    },
    {
        path: 'branch',
        loadComponent: () => import('./pages/on-boarding-branch/on-boarding-branch').then((m) => m.OnBoardingBranch),
    },
    {
        path: 'library',
        loadComponent: () => import('./pages/on-boarding-library/on-boarding-library').then((m) => m.OnBoardingLibrary),
    }

];

