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
}
