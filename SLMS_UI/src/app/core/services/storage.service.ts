import { Injectable, signal, computed } from '@angular/core';
import { AuthUser } from '@core/models/auth.model';
import { AuthResponse, CurrentUser } from '@core/models/AuthResponse.model';
import { environment } from '@env/environment';

@Injectable({
    providedIn: 'root',
})
export class StorageService {

    private readonly TOKEN_KEY = environment.TOKEN_KEY;
    private readonly REFRESH_TOKEN_KEY = environment.REFRESH_TOKEN_KEY;
    private readonly USER_KEY = environment.USER_KEY;
    private readonly TENANT_KEY = environment.TENANT_KEY;
    private readonly ACCESS_TOKEN_EXPIRES_KEY = environment.ACCESS_TOKEN_EXPIRES_KEY;
    private readonly REFRESH_TOKEN_EXPIRES_KEY = environment.REFRESH_TOKEN_EXPIRES_KEY;

    // Signals
    private readonly _token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
    private readonly _refreshToken = signal<string | null>(localStorage.getItem(this.REFRESH_TOKEN_KEY));
    private readonly _user = signal<CurrentUser | null>(this.loadUser());
    private readonly _tenant = signal<string | null>(localStorage.getItem(this.TENANT_KEY));
    readonly accessTokenExpiry = computed(() => this._accessTokenExpiry());
    readonly refreshTokenExpiry = computed(() => this._refreshTokenExpiry());

    // Public Signals
    readonly token = computed(() => this._token());
    readonly refreshToken = computed(() => this._refreshToken());
    readonly user = computed(() => this._user());
    readonly tenant = computed(() => this._tenant());
    readonly  isAuthenticated = computed(() => { return (!!this._token() && !this.isAccessTokenExpired()); });

    readonly fullName = computed(() => {
        const user = this._user();
        if (!user) { return ''; }
        return `${user.userName}`;
    });

    readonly role = computed(() => this._user()?.roles ?? null);

    saveAuthentication(auth: AuthResponse): void {
        this.setToken(auth.accessToken);
        this.setRefreshToken(auth.refreshToken);
        this.setAccessTokenExpiry(auth.accessTokenExpiresAtUtc);
        this.setRefreshTokenExpiry(auth.refreshTokenExpiresAtUtc);
        this.setUser(auth.user);
    }

    setToken(token: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);
        this._token.set(token);
    }

    getToken(): string | null {
        return this._token();
    }

    setRefreshToken(refreshToken: string): void {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        this._refreshToken.set(refreshToken);
    }

    getRefreshToken(): string | null {
        return this._refreshToken();
    }

    setUser(user: CurrentUser): void {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this._user.set(user);
    }

    getUser(): CurrentUser | null {
        return this._user();
    }

    setTenant(tenantCode: string): void {
        localStorage.setItem(this.TENANT_KEY, tenantCode);
        this._tenant.set(tenantCode);
    }

    getTenant(): string | null {
        return this._tenant();
    }

    hasRole(role: string): boolean {
        return this._user()?.roles.includes(role) ?? false;
    }

    updateUser(partial: Partial<AuthUser>): void {
        const current = this._user();
        if (!current) { return; }
        const updated = { ...current, ...partial };
        this.setUser(updated);
    }

    private readonly _accessTokenExpiry = signal<Date | null>(
        this.loadDate(this.ACCESS_TOKEN_EXPIRES_KEY)
    );

    private readonly _refreshTokenExpiry = signal<Date | null>(
        this.loadDate(this.REFRESH_TOKEN_EXPIRES_KEY)
    );

    clear(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.TENANT_KEY);
        this._token.set(null);
        this._refreshToken.set(null);
        this._user.set(null);
        this._tenant.set(null);
    }

    private loadUser(): CurrentUser | null {
        const user = localStorage.getItem(this.USER_KEY);
        if (!user) {
            return null;
        }

        try {
            return JSON.parse(user);
        } catch {
            return null;
        }
    }

    setAccessTokenExpiry(expiry: string | Date): void {

        const date = new Date(expiry);
        localStorage.setItem(
            this.ACCESS_TOKEN_EXPIRES_KEY,
            date.toISOString()
        );
        this._accessTokenExpiry.set(date);

    }

    setRefreshTokenExpiry(expiry: string | Date): void {

        const date = new Date(expiry);
        localStorage.setItem(
            this.REFRESH_TOKEN_EXPIRES_KEY,
            date.toISOString()
        );
        this._refreshTokenExpiry.set(date);

    }

    private loadDate(key: string): Date | null {
        const value = localStorage.getItem(key);
        if (!value) { return null; }
        return new Date(value);
    }

    isAccessTokenExpired(): boolean {
        const expiry = this._accessTokenExpiry();
        if (!expiry) { return true; }
        return new Date() >= expiry;
    }

    isRefreshTokenExpired(): boolean {
        const expiry = this._refreshTokenExpiry();
        if (!expiry) { return true; }
        return new Date() >= expiry;
    }

    getRemainingMinutes(): number {
        const expiry = this._accessTokenExpiry();
        if (!expiry) { return 0; }
        return Math.floor((expiry.getTime() - Date.now()) / 60000);
    }

    // hasPermission(permission: number): boolean {
    //     return this._user()?.permissions.includes(permission) ?? false;
    // }
}