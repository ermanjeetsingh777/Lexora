import { inject, Injectable } from "@angular/core";
import { OnboardingSteps } from "@core/enums/OnbardingSteps";
import { Location } from '@angular/common';
import { MemberPlanType, PAY_STATUS_CLASSES, PLAN_CLASSES, Shift } from "@core/constType";

@Injectable({
    providedIn: 'root',
})
export class CommonService {
    private readonly location = inject(Location);

    readonly shifts: Shift[] = ['Morning', 'Afternoon', 'Evening', 'Night', 'General', 'Full'];

    readonly onboardingConfig: Record<OnboardingSteps, { route: string; message?: string }> = {
        [OnboardingSteps.Registered]: {
            route: '/onboarding/institution',
            message: 'Welcome back! Please complete your institution setup.'
        },
        [OnboardingSteps.Institute]: {
            route: '/onboarding/branch',
            message: 'Welcome back! Continue by adding your branch.'
        },
        [OnboardingSteps.Branch]: {
            route: '/onboarding/library',
            message: 'Welcome back! Complete your library setup.'
        },
        [OnboardingSteps.Completed]: {
            route: '/dashboard',
            message: ''
        },
        [OnboardingSteps.Library]: {
            route: "",
            message: ''
        }
    };

    // readonly onboardingMessages = {
    //     institutionCreated: 'Institution created successfully! Now add your first branch.',
    //     branchCreated: 'Branch created successfully! Next, create your library.',
    //     libraryCreated: 'Library created successfully! Your setup is complete.',
    // };

    readonly onboardingMessages = {
        institutionCreated: 'Institution created successfully! Now add the first branch for this institution.',
        branchCreated: 'Branch created successfully! Now add the first library for this branch.',
        libraryCreated: 'Library created successfully! Your organization setup is complete.',
    };

    planClasses(plan: MemberPlanType): string {
        return PLAN_CLASSES[plan] ?? PLAN_CLASSES['Monthly'];
    }

    attendanceBarClass(rate: number): string {
        return rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-rose-500';
    }

    initials(name?: string | null): string {
        const value = name?.trim();
        if (!value) return '?';
        return value
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    avatarBg(hue: number): string {
        return `hsl(${hue} 60% 45%)`;
    }

    payStatusClasses(s: string): string { return PAY_STATUS_CLASSES[s] ?? ''; }

    goBack(): void {
        this.location.back();
    }

    sendWhatsApp(phone: string, message: string): void {
        const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

}