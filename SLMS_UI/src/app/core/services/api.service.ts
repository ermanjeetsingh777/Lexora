import { HttpClient, HttpContext, HttpEvent, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { RequestOptions } from '@core/models/RequestOptions';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    get<T>(endpoint: string, options?: RequestOptions): Observable<APIResponseModel<T>> {
        return this.http.get<APIResponseModel<T>>(
            this.buildUrl(endpoint),
            {
                params: this.buildParams(options?.params),
                headers: options?.headers,
                context: options?.context,
            }
        );
    }

    getById<T>(endpoint: string, id: string | number): Observable<APIResponseModel<T>> {
        return this.http.get<APIResponseModel<T>>(
            this.buildUrl(`${endpoint}/${id}`)
        );
    }

    post<T>(endpoint: string, body: unknown): Observable<APIResponseModel<T>> {
        return this.http.post<APIResponseModel<T>>(
            this.buildUrl(endpoint),
            body
        );
    }

    put<T>(endpoint: string, id: string | number, body: unknown): Observable<APIResponseModel<T>> {
        return this.http.put<APIResponseModel<T>>(
            this.buildUrl(`${endpoint}/${id}`),
            body
        );
    }

    patch<T>(endpoint: string, body: unknown): Observable<APIResponseModel<T>> {
        return this.http.patch<APIResponseModel<T>>(
            this.buildUrl(endpoint),
            body
        );
    }

    delete<T>(endpoint: string, id: string | number): Observable<APIResponseModel<T>> {
        return this.http.delete<APIResponseModel<T>>(
            this.buildUrl(`${endpoint}/${id}`)
        );
    }

    upload<T>(endpoint: string, file: File, fieldName = 'file'): Observable<APIResponseModel<T>> {
        const formData = new FormData();

        formData.append(fieldName, file);

        return this.http.post<APIResponseModel<T>>(
            this.buildUrl(endpoint),
            formData
        );
    }

    uploadMany<T>(endpoint: string, files: File[], fieldName = 'files'): Observable<APIResponseModel<T>> {
        const formData = new FormData();

        files.forEach(file => {
            formData.append(fieldName, file);
        });

        return this.http.post<APIResponseModel<T>>(
            this.buildUrl(endpoint),
            formData
        );
    }

    uploadWithProgress(endpoint: string, file: File, fieldName = 'file'): Observable<HttpEvent<any>> {
        const formData = new FormData();

        formData.append(fieldName, file);

        return this.http.post(
            this.buildUrl(endpoint),
            formData,
            {
                reportProgress: true,
                observe: 'events',
            }
        );
    }

    deleteByPath<T>(endpoint: string): Observable<APIResponseModel<T>> {
        return this.http.delete<APIResponseModel<T>>(this.buildUrl(endpoint));
    }

    download(endpoint: string): Observable<Blob> {
        return this.http.get(
            this.buildUrl(endpoint),
            {
                responseType: 'blob',
            }
        );
    }

    downloadFile(endpoint: string): Observable<HttpResponse<Blob>> {
        return this.http.get(
            this.buildUrl(endpoint),
            {
                responseType: 'blob',
                observe: 'response',
            }
        );
    }

    private buildUrl(endpoint: string): string {
        return `${this.apiUrl}/${endpoint}`;
    }

    private buildParams(params?: Record<string, any>): HttpParams {
        let httpParams = new HttpParams();

        if (!params) {
            return httpParams;
        }

        Object.entries(params).forEach(([key, value]) => {
            if (
                value !== null &&
                value !== undefined &&
                value !== ''
            ) {
                httpParams = httpParams.set(
                    key,
                    String(value)
                );
            }
        }
        );

        return httpParams;
    }
}