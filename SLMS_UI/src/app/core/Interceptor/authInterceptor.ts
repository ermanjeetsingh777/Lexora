import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '@core/services/storage.service';

const EXCLUDED_URLS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh-token',
    '/auth/forgot-password',
    '/auth/reset-password'
];

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {

    const storage = inject(StorageService);

    // Skip public endpoints
    if (EXCLUDED_URLS.some(url => req.url.includes(url))) {
        return next(req);
    }

    const token = storage.token();

    if (!token) {
        return next(req);
    }

    const clonedRequest = req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`,
        },
    });

    return next(clonedRequest);
};