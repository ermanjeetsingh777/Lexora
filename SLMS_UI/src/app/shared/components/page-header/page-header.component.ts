import { Component, input } from '@angular/core';
import { AppIconComponent } from "../app-icon/app-icon.component";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
      <div class="space-y-1">
        @if (eyebrow()) {
          <p class="label-mono flex items-center gap-1.5">
            @if (isBack()) {
              <a class="table-cursor cursorPointer inline-flex" [routerLink]="backLink()!" [queryParams]="backQueryParams()">
                <app-icon name="arrow-left" [size]="14"></app-icon>
              </a>
            }
            {{ eyebrow() }}
          </p>
        }
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{{ title() }}</h1>
        @if (description()) {
          <p class="max-w-2xl text-sm text-[var(--muted-foreground)]">{{ description() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
  imports: [AppIconComponent, RouterLink],
})
export class PageHeaderComponent {
  readonly eyebrow = input<string>();
  readonly isBack = input<boolean>(false);
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly backLink = input<string | readonly unknown[]>();
  readonly backQueryParams = input<Record<string, string | number | boolean | null | undefined>>();
}

@Component({
  selector: 'app-section-header',
  standalone: true,
  template: `
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold tracking-tight">{{ title() }}</h2>
        @if (description()) {
          <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">{{ description() }}</p>
        }
      </div>
      <ng-content select="[actions]" />
    </div>
  `,
})
export class SectionHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}

@Component({
  selector: 'app-glass-card',
  standalone: true,
  template: `<div class="glass-card rounded-xl border glass shadow-elegant p-4"><ng-content /></div>`,
})
export class GlassCardComponent { }
