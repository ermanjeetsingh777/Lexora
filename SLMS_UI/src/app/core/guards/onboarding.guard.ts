import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OnboardingSteps } from '@core/enums/OnbardingSteps';
import { CommonService } from '@core/services/common.service';
import { StorageService } from '@core/services/storage.service';

function requiredOnboardingRoute(
    step: OnboardingSteps,
    commonService: CommonService,
): string {
    const config = commonService.onboardingConfig[step];
    if (config?.route) {
        return config.route;
    }

    switch (step) {
        case OnboardingSteps.Institute:
            return '/onboarding/branch';
        case OnboardingSteps.Branch:
            return '/onboarding/library';
        case OnboardingSteps.Library:
            return '/onboarding/library';
        case OnboardingSteps.PendingApproval:
        case OnboardingSteps.Rejected:
            return '/pending-approval';
        default:
            return '/onboarding/institution';
    }
}

/** Blocks authenticated app routes until onboarding is completed. Use after authGuard. */
export const onboardingCompleteGuard: CanActivateFn = (_route, _state) => {
    const storage = inject(StorageService);
    const commonService = inject(CommonService);
    const router = inject(Router);

    const user = storage.user();
    if (!user) {
        return true;
    }

    const onboardingStep = user.onboardingStep ?? OnboardingSteps.Registered;
    if (onboardingStep === OnboardingSteps.Completed) {
        return true;
    }

    return router.createUrlTree([requiredOnboardingRoute(onboardingStep, commonService)]);
};

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
    const requiredRoute = onboardingStep === OnboardingSteps.Completed
        ? '/dashboard'
        : requiredOnboardingRoute(onboardingStep, commonService);

    if (currentUrl === requiredRoute) {
        return true;
    }

    return router.createUrlTree([requiredRoute]);
};