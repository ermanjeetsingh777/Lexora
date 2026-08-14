import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorageService } from '@core/services/storage.service';

@Component({
  selector: 'app-non-auth-header',
  imports: [RouterLink],
  templateUrl: './non-auth-header.html',
  styleUrl: './non-auth-header.css',
})
export class NonAuthHeader {
  protected readonly storageService = inject(StorageService);
}
