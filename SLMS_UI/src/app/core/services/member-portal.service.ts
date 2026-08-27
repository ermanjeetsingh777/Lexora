import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { catchError, map, Observable, of, tap } from 'rxjs';

interface CurrentMemberResponse {
  memberId: string;
}

@Injectable({ providedIn: 'root' })
export class MemberPortalService {
  private readonly api = inject(ApiService);

  readonly memberId = signal<string | null>(null);

  resolveMemberId(force = false): Observable<string | null> {
    if (!force && this.memberId()) {
      return of(this.memberId());
    }

    return this.api.get<CurrentMemberResponse>('members/me').pipe(
      map((response) => response.data?.memberId ?? null),
      tap((id) => this.memberId.set(id)),
      catchError(() => {
        this.memberId.set(null);
        return of(null);
      }),
    );
  }

  clear(): void {
    this.memberId.set(null);
  }
}
