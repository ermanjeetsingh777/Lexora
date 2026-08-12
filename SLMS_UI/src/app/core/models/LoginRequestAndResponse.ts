import { AuthUser } from "./auth.model";

export interface LoginRequest {
    email: string;
    password: string;
    tenantCode?: string;
}

export interface RegisterRequest {
    fullName: string;
    email: string;
    password: string;
    institutionName?: string;
    institutionType?: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}