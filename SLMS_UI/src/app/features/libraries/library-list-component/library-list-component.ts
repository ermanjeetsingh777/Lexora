import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideBookOpen, LucidePlus, LucideSearch, LucideMapPin,
  LucideUsers, LucideActivity,
} from '@lucide/angular';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-library-list-component',
  imports: [
    RouterLink, FormsModule,
    ButtonComponent, PageHeaderComponent, GlassCardComponent,
    SectionHeaderComponent, StatusBadgeComponent,
    LucideBookOpen, LucidePlus, LucideSearch, LucideMapPin, LucideUsers, LucideActivity,
  ],
  templateUrl: './library-list-component.html',
  styleUrl: './library-list-component.css',
})
export class LibraryListComponent {
 
}
