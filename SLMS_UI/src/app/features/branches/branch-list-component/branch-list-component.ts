import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideBuilding2, LucidePlus, LucideSearch, LucideUsers, LucideActivity,
  LucideAlertTriangle, LucideMapPin, LucideArrowUpRight, LucideArrowDownRight,
  LucideBookOpen, LucideClock, LucideShieldCheck,
} from '@lucide/angular';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';

type BranchStatus = 'Active' | 'Maintenance' | 'Closed';
type ViewMode = 'grid' | 'table';

interface EnrichedBranch {
  id: string; name: string; city: string;
  institutionId: string; institutionName: string;
  capacity: number; occupancy: number; occupancyPct: number;
  libraries: number; members: number; status: BranchStatus;
  manager: string; trend: number;
}

const MANAGERS = ['Priya Nair', 'Rohan Kapoor', 'Saanvi Iyer', 'Aarav Sharma', 'Ishita Bose', 'Kabir Khan', 'Diya Verma', 'Vivaan Joshi'];
const STATUS_ROTATION: BranchStatus[] = ['Active', 'Active', 'Active', 'Active', 'Maintenance', 'Active', 'Closed'];

@Component({
  selector: 'app-branch-list-component',
  imports: [
    RouterLink, FormsModule,
    ButtonComponent,  PageHeaderComponent, GlassCardComponent,
    SectionHeaderComponent, StatusBadgeComponent,
    LucideBuilding2, LucidePlus, LucideSearch, LucideUsers, LucideActivity,
    LucideAlertTriangle, LucideMapPin, LucideArrowUpRight, LucideArrowDownRight,
    LucideBookOpen, LucideClock, LucideShieldCheck,
  ],
  templateUrl: './branch-list-component.html',
  styleUrl: './branch-list-component.css',
})
export class BranchListComponent {

  readonly view = signal<ViewMode>('grid');
  readonly query = signal('');
  readonly statusFilter = signal('');

  // readonly all = computed<EnrichedBranch[]>(() =>
  //   this.mockData.branches.map((b, i) => {
  //     const inst = this.mockData.institutions.find((x) => x.id === b.institutionId);
  //     const occPct = Math.min(100, Math.round((b.occupancy / Math.max(1, b.capacity)) * 100 + 25));
  //     return {
  //       id: b.id, name: b.name, city: b.city,
  //       institutionId: b.institutionId, institutionName: inst?.name ?? '—',
  //       capacity: b.capacity,
  //       occupancy: Math.round((b.capacity * occPct) / 100),
  //       occupancyPct: occPct,
  //       libraries: b.libraries, members: b.members,
  //       status: STATUS_ROTATION[i % STATUS_ROTATION.length],
  //       manager: MANAGERS[i % MANAGERS.length],
  //       trend: ((i * 7) % 21) - 8,
  //     };
  //   }),
  // );

  // readonly filtered = computed(() => {
  //   const q = this.query().toLowerCase();
  //   const sf = this.statusFilter();
  //   return this.all().filter((b) => {
  //     if (sf && b.status !== sf) return false;
  //     if (q && ![b.name, b.city, b.institutionName, b.manager].some((v) => v.toLowerCase().includes(q))) return false;
  //     return true;
  //   });
  // });

  // readonly totalCap = computed(() => this.all().reduce((s, b) => s + b.capacity, 0));
  // readonly totalOcc = computed(() => this.all().reduce((s, b) => s + b.occupancy, 0));
  // readonly avgOcc = computed(() => this.all().length ? Math.round(this.all().reduce((s, b) => s + b.occupancyPct, 0) / this.all().length) : 0);
  // readonly nearCap = computed(() => this.all().filter((b) => b.occupancyPct >= 80).length);
  // readonly activeCount = computed(() => this.all().filter((b) => b.status === 'Active').length);
  // readonly totalLibs = computed(() => this.all().reduce((s, b) => s + b.libraries, 0));
  // readonly cityCount = computed(() => new Set(this.all().map((b) => b.city)).size);
}
