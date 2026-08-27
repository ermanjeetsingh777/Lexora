import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { APIResponseModel } from '@core/models/APIResponseModel';
import { ChangePasswordRequest, UpdateProfileRequest, UserProfile } from '@core/models/profile.models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);

  getProfile(): Observable<APIResponseModel<UserProfile>> {
    return this.api.get<UserProfile>('auth/profile');
  }

  updateProfile(body: UpdateProfileRequest): Observable<APIResponseModel<UserProfile>> {
    return this.api.patch<UserProfile>('auth/profile', body);
  }

  changePassword(body: ChangePasswordRequest): Observable<APIResponseModel<{ message: string }>> {
    return this.api.post<{ message: string }>('auth/change-password', body);
  }
}
