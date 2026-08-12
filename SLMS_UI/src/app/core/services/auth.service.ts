import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthUser, PERMISSIONS, Role, SEED_USERS, SeededUser } from '../models/auth.model';
import { environment } from '@env/environment';
import { BehaviorSubject, catchError, finalize, firstValueFrom, map, Observable, of, shareReplay, switchMap, tap, throwError, timer } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { ApiService } from './api.service';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { AuthResponse, LoginRequest, RefreshTokenRequest, RegisterRequest } from '@core/models/AuthResponse.model';
import { Router } from '@angular/router';

const STORAGE_KEY = 'mock-auth-session';
const USERS_KEY = 'mock-auth-users';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly httpApi = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private refreshInProgress = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  // constructor() {
  //   this.restoreSession();
  // }

  login(request: LoginRequest): Observable<APIResponseModel<AuthResponse>> {
    return this.httpApi.post<AuthResponse>('auth/login', request).pipe(
      map(response => response),
      tap(auth => {
         if (auth.data && auth.success) {
          this.storage.saveAuthentication(auth.data);
          // this.scheduleRefresh();
        }
      })
    );
  }

  register(request: RegisterRequest): Observable<APIResponseModel<AuthResponse>> {
    return this.httpApi.post<AuthResponse>('auth/register', request).pipe(
      map(response => response),
      tap(auth => {
        if (auth.data && auth.success) {
          this.storage.saveAuthentication(auth.data);
          this.scheduleRefresh();
        }
      })
    );
  }

  restoreSession(): void {
    if (!this.storage.getToken()) { return; }

    if (this.storage.isRefreshTokenExpired()) {
      this.logout();
      return;
    }

    if (this.storage.isAccessTokenExpired()) {
      this.refreshToken().subscribe();
      return;
    }
    this.scheduleRefresh();
  }

  logout(): void {
    this.storage.clear();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<AuthResponse | APIResponseModel<AuthResponse>> {

    if (this.refreshInProgress) {
      return this.refreshSubject.pipe(
        switchMap(token => {
          if (!token) {
            return throwError(() => new Error('Refresh failed'));
          }
          return of({ accessToken: token } as AuthResponse);
        })
      );
    }

    this.refreshInProgress = true;
    const request: RefreshTokenRequest = {
      accessToken: this.storage.getToken()!,
      refreshToken: this.storage.getRefreshToken()!
    };

    return this.httpApi.post<APIResponseModel<AuthResponse>>('auth/refresh', request).pipe(
      map(response => response.data),
      tap(auth => {
        this.storage.saveAuthentication(auth.data);
        this.refreshSubject.next(auth.data.accessToken);
        this.scheduleRefresh();
      }),
      finalize(() => { this.refreshInProgress = false; }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      }),
      shareReplay(1)
    );

  }

  // Auto Refresh
  scheduleRefresh(): void {
    const minutes = this.storage.getRemainingMinutes();
    if (minutes <= 1) { return; }

    timer((minutes - 1) * 60000)
      .pipe(
        switchMap(() => this.refreshToken())
      ).subscribe();
  }

  // Current User
  currentUser() {
    return this.storage.user;
  }

  // Authenticated
  isAuthenticated(): boolean {
    return this.storage.isAuthenticated();
  }

  // Token
  getToken(): string | null {
    return this.storage.getToken();
  }

  //role
  hasRole(role: string): boolean {
    return this.storage.hasRole(role);
  }

  hasPermission(permission: number): boolean {
    return false;
    // return this.storage.hasPermission(permission);
  }



  // async loginAs(role: Role): Promise<void> {
  //   const seed = SEED_USERS.find((u) => u.role === role);
  //   if (!seed) throw new Error('Unknown role');
  //   await this.login(seed.email, seed.password);
  // }

  // async sendOtp(email: string): Promise<void> {
  //   if (!email.includes('@')) throw new Error('Enter a valid email');
  //   if (environment.mockApi) {
  //     sessionStorage.setItem('slms_otp_email', email);
  //     return;
  //   }

  //   await firstValueFrom(this.http.post(`${this.baseUrl}/send-otp`, { email }));
  // }

  // async verifyOtp(email: string, code: string): Promise<AuthUser> {
  //   if (code.length !== 6) throw new Error('Enter the 6-digit code');
  //   if (environment.mockApi) {

  //     if (code !== environment.MOCK_OTP) throw new Error('Invalid code — demo uses 123456');

  //     if (!this.user()) {
  //       throw new Error('User not found');
  //     }
  //     const { ...currentUser } = this.user();
  //     this.storage.setToken('mock-jwt-token');
  //     this.storage.setRefreshToken('mock-refresh-token');
  //     this.storage.setUser(currentUser);

  //     return currentUser;
  //   }

  //   const response = await firstValueFrom(this.http.post<LoginResponse>(`${this.baseUrl}/verify-otp`, { email, code }));

  //   this.storage.setToken(response.accessToken);
  //   this.storage.setUser(response.user);
  //   return response.user;
  // }

  // async resetPassword(email: string, token: string, password: string): Promise<void> {
  //   if (password.length < 6) throw new Error('Password must be at least 6 characters');
  //   if (!token) throw new Error('Invalid or expired token');

  //   if (environment.mockApi) { return; }

  //   await firstValueFrom(this.http.post(`${this.baseUrl}/reset-password`, { email, token, password }));
  // }

  // hasRole(role: Role): boolean {
  //   return this.userSignal()?.role === role;
  // }

  // hasAnyRole(roles: Role[]): boolean {
  //   const u = this.userSignal();
  //   return !!u && roles.includes(u.role);
  // }

  // hasPermission(permission: string): boolean {
  //   const u = this.userSignal();
  //   if (!u) return false;
  //   const list = PERMISSIONS[u.role] ?? [];
  //   return list.includes('*') || list.includes(permission);
  // }

  // private loadUsers(): SeededUser[] {
  //   try {
  //     const raw = localStorage.getItem(USERS_KEY);
  //     if (!raw) {
  //       localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  //       return SEED_USERS;
  //     }
  //     return JSON.parse(raw) as SeededUser[];
  //   } catch {
  //     return SEED_USERS;
  //   }
  // }

  // private saveUsers(users: SeededUser[]): void {
  //   localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // }

  // private loadSession(): AuthUser | null {
  //   try {
  //     const raw = localStorage.getItem(STORAGE_KEY);
  //     return raw ? (JSON.parse(raw) as AuthUser) : null;
  //   } catch {
  //     return null;
  //   }
  // }

  // private saveSession(user: AuthUser | null): void {
  //   if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  //   else localStorage.removeItem(STORAGE_KEY);
  // }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
