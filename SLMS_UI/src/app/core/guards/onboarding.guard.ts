import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OnboardingSteps } from '@core/enums/OnbardingSteps';
import { CommonService } from '@core/services/common.service';
import { StorageService } from '@core/services/storage.service';

export const onboardingGuard: CanActivateFn = (route, state) => {
    const storage = inject(StorageService);
    const commonService = inject(CommonService);
    const router = inject(Router);

    const publicRoutes = [
        '/login',
        '/register',
        // '/forgot-password',
        // '/reset-password',
        // '/verify-email'
    ];

    const currentUrl = state.url.split('?')[0];

    if (!storage.isAuthenticated()) {
        storage.clear();
        return (publicRoutes.includes(currentUrl)) ? true : router.createUrlTree(['/login']);
    }

    const user = storage.user();

    if (!user) {
        return router.createUrlTree(['/login']);
    }

    const onboardingStep: OnboardingSteps = user.onboardingStep ?? OnboardingSteps.Registered;
    const config = commonService.onboardingConfig[onboardingStep] ?? { route: '/dashboard', message: '' };
    // Already on the correct page? Don't redirect.
    if (state.url === config.route) {
        return true;
    }
    return router.createUrlTree([config.route]);

};