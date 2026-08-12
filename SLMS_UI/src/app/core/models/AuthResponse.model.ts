import { OnboardingSteps, UserTypes } from "@core/enums/OnbardingSteps";

export interface AuthResponse {
    accessToken: string;
    accessTokenExpiresAtUtc: string;
    refreshToken: string;
    refreshTokenExpiresAtUtc: string;
    requiresTwoFactor: boolean;
    userId: string;
    user: CurrentUser;
}

export interface CurrentUser {
    id: string;
    email: string;
    userName: string;
    fullName: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
    onboardingStep: OnboardingSteps;
    usertype : UserTypes;
    createdAtUtc: string;
    updatedAtUtc: string;
    roles: string[];
    permissions: number[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  packageId: string;
  userType: UserTypes;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}