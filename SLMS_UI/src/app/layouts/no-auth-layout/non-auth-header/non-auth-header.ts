import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorageService } from '@core/services/storage.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-non-auth-header',
  imports: [AppIconComponent, RouterLink],
  templateUrl: './non-auth-header.html',
  styleUrl: './non-auth-header.css',
})
export class NonAuthHeader {
  protected readonly storageService = inject(StorageService);
}
