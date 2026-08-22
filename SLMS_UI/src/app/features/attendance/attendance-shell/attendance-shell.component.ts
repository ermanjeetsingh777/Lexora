import { Component, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AttendanceFilterService } from '../attendance-filter.service';

@Component({
  selector: 'app-attendance-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './attendance-shell.component.html',
  styleUrl: './attendance-shell.component.css',
})
export class AttendanceShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly filters = inject(AttendanceFilterService);

  readonly tabs = [
    { label: 'Overview', link: '/attendance' },
    { label: 'Calendar', link: '/attendance/calendar' },
    { label: 'Live', link: '/attendance/live' },
    { label: 'Records', link: '/attendance/records' },
    { label: 'Scanner', link: '/attendance/scanner' },
  ];

  readonly libraryOptions = computed(() => this.filters.libraries());

  ngOnInit(): void {
    const queryLibraryId = this.route.snapshot.queryParamMap.get('libraryId') ?? '';
    if (queryLibraryId) {
      this.filters.setLibraryId(queryLibraryId);
    }
    this.filters.loadLibraries();
  }

  onLibraryChange(value: string): void {
    this.filters.setLibraryId(value);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { libraryId: value || null },
      queryParamsHandling: 'merge',
    });
  }
}
