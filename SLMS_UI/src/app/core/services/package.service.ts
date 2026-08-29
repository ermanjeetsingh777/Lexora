import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PackageCatalogItem } from '@core/models/package-subscription.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PackageService {
  private readonly api = inject(ApiService);

  getActivePackages(): Observable<PackageCatalogItem[]> {
    return this.api.get<PackageCatalogItem[]>('packages').pipe(map((response) => response.data ?? []));
  }

  getAllPackages(): Observable<PackageCatalogItem[]> {
    return this.api.get<PackageCatalogItem[]>('packages/all').pipe(map((response) => response.data ?? []));
  }

  getPackageById(id: string): Observable<PackageCatalogItem | null> {
    return this.api.get<PackageCatalogItem>(`packages/${id}`).pipe(map((response) => response.data ?? null));
  }

  createPackage(payload: Partial<PackageCatalogItem>): Observable<PackageCatalogItem> {
    return this.api.post<PackageCatalogItem>('packages', payload).pipe(map((response) => response.data!));
  }

  updatePackage(id: string, payload: Partial<PackageCatalogItem>): Observable<PackageCatalogItem> {
    return this.api.put<PackageCatalogItem>('packages', id, payload).pipe(map((response) => response.data!));
  }

  deletePackage(id: string): Observable<unknown> {
    return this.api.delete<unknown>('packages', id).pipe(map((response) => response.data));
  }
}
