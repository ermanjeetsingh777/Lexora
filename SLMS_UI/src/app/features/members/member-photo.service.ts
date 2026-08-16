import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { ApiService } from '@core/services/api.service';

@Injectable({ providedIn: 'root' })
export class MemberPhotoService {
  private readonly httpApi = inject(ApiService);
  private readonly cache = new Map<string, string>();
  private readonly inflight = new Map<string, Observable<string | null>>();

  getPhotoUrl(memberId: string, hasPhoto: boolean): Observable<string | null> {
    if (!hasPhoto || !memberId) {
      return of(null);
    }

    const cached = this.cache.get(memberId);
    if (cached) {
      return of(cached);
    }

    const pending = this.inflight.get(memberId);
    if (pending) {
      return pending;
    }

    const request = this.httpApi.download(`members/${memberId}/photo`).pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        this.cache.set(memberId, url);
        return url;
      }),
      catchError(() => of(null)),
      tap(() => this.inflight.delete(memberId)),
      shareReplay(1),
    );

    this.inflight.set(memberId, request);
    return request;
  }
}
