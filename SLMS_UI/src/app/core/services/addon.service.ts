import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AddonCatalogItem, PurchaseAddonRequest, UserAddonItem } from '@core/models/package-subscription.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AddonService {
  private readonly api = inject(ApiService);

  getActiveAddons(): Observable<AddonCatalogItem[]> {
    return this.api.get<AddonCatalogItem[]>('addons').pipe(map((res) => res.data ?? []));
  }

  getAllAddons(): Observable<AddonCatalogItem[]> {
    return this.api.get<AddonCatalogItem[]>('addons/all').pipe(map((res) => res.data ?? []));
  }

  getAddonById(id: string): Observable<AddonCatalogItem | null> {
    return this.api.get<AddonCatalogItem>(`addons/${id}`).pipe(map((res) => res.data ?? null));
  }

  createAddon(payload: Partial<AddonCatalogItem>): Observable<AddonCatalogItem> {
    return this.api.post<AddonCatalogItem>('addons', payload).pipe(map((res) => res.data!));
  }

  updateAddon(id: string, payload: Partial<AddonCatalogItem>): Observable<AddonCatalogItem> {
    return this.api.put<AddonCatalogItem>('addons', id, payload).pipe(map((res) => res.data!));
  }

  deleteAddon(id: string): Observable<unknown> {
    return this.api.delete<unknown>('addons', id).pipe(map((res) => res.data));
  }

  purchaseAddon(payload: PurchaseAddonRequest): Observable<UserAddonItem> {
    return this.api.post<UserAddonItem>('addons/purchase', payload).pipe(map((res) => res.data!));
  }

  getMyAddons(): Observable<UserAddonItem[]> {
    return this.api.get<UserAddonItem[]>('addons/my-addons').pipe(map((res) => res.data ?? []));
  }
}
