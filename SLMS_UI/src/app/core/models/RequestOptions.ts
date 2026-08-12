import { HttpContext, HttpHeaders } from "@angular/common/http";

export interface RequestOptions {
    params?: Record<string, any>;
    headers?: HttpHeaders;
    context?: HttpContext;
}