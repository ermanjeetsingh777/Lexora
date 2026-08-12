import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideBuilding2, LucidePlus, LucideSearch, LucideUsers, LucideLayers,
  LucideIndianRupee, LucideTrendingUp, LucideMapPin, LucideArrowUpRight,
  LucideBell, LucideAlertTriangle, LucideActivity,
} from '@lucide/angular';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';

type TypeFilter = 'All' | 'School' | 'College' | 'Library' | 'CoachingCenter';
const TYPE_FILTERS: TypeFilter[] = ['All', 'School', 'College', 'Library', 'CoachingCenter'];

@Component({
  selector: 'app-institutions-list',
  templateUrl: './institutions-list.html',
  styleUrl: './institutions-list.css',
  standalone: true,
  imports: [
    RouterLink, FormsModule, CommonModule, StatusBadgeComponent,
    ButtonComponent, PageHeaderComponent, GlassCardComponent, LucideBuilding2, LucidePlus, LucideSearch, LucideUsers, LucideLayers,
    LucideIndianRupee, LucideTrendingUp, LucideMapPin, LucideArrowUpRight,
  ],
})
export class InstitutionsListComponent {

  // readonly institutions = this.mockData.institutions;
  // readonly typeFilters = TYPE_FILTERS;
  // readonly selectedInstitutionId = signal<string>(this.institutions[0]?.id ?? '');

  // readonly query = signal('');
  // readonly type = signal<TypeFilter>('All');

  // readonly totals = computed(() => {
  //   const branches = this.institutions.reduce((s, i) => s + i.branches, 0);
  //   const members = this.institutions.reduce((s, i) => s + i.members, 0);
  //   const revenue = this.institutions.reduce((s, i) => s + i.revenueMTD, 0);
  //   const avgOccupancy = this.institutions.reduce((s, i) => s + i.occupancy, 0) / Math.max(this.institutions.length, 1);
  //   return { branches, members, revenue, avgOccupancy };
  // });

  // readonly filtered = computed(() => {
  //   const q = this.query().trim().toLowerCase();
  //   const t = this.type();
  //   return this.institutions.filter((i) => {
  //     if (t !== 'All' && i.type !== t) return false;
  //     if (!q) return true;
  //     return i.name.toLowerCase().includes(q) || i.city.toLowerCase().includes(q) || i.type.toLowerCase().includes(q);
  //   });
  // });

  // setType(t: TypeFilter): void { this.type.set(t); }

  // initials(name: string): string {
  //   return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  // }
}
