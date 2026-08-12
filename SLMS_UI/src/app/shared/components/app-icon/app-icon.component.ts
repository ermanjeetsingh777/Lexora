import { Component, computed, input } from '@angular/core';
import { LayoutDashboard, type IconNode } from 'lucide';
import { ICON_REGISTRY } from './icon.registry';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0"
      aria-hidden="true"
    >
      @for (node of nodes(); track $index) {
        @switch (node[0]) {
          @case ('path') {
            <path [attr.d]="attr(node, 'd')" />
          }
          @case ('circle') {
            <circle [attr.cx]="attr(node, 'cx')" [attr.cy]="attr(node, 'cy')" [attr.r]="attr(node, 'r')" />
          }
          @case ('line') {
            <line
              [attr.x1]="attr(node, 'x1')"
              [attr.y1]="attr(node, 'y1')"
              [attr.x2]="attr(node, 'x2')"
              [attr.y2]="attr(node, 'y2')"
            />
          }
          @case ('rect') {
            <rect
              [attr.x]="attr(node, 'x')"
              [attr.y]="attr(node, 'y')"
              [attr.width]="attr(node, 'width')"
              [attr.height]="attr(node, 'height')"
              [attr.rx]="attr(node, 'rx')"
              [attr.ry]="attr(node, 'ry')"
            />
          }
          @case ('polyline') {
            <polyline [attr.points]="attr(node, 'points')" />
          }
          @case ('polygon') {
            <polygon [attr.points]="attr(node, 'points')" />
          }
          @case ('ellipse') {
            <ellipse [attr.cx]="attr(node, 'cx')" [attr.cy]="attr(node, 'cy')" [attr.rx]="attr(node, 'rx')" [attr.ry]="attr(node, 'ry')" />
          }
        }
      }
    </svg>
  `,
})
export class AppIconComponent {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly strokeWidth = input(2);

  readonly nodes = computed((): IconNode => {
    return ICON_REGISTRY[this.name()] ?? LayoutDashboard;
  });

  attr(node: [string, Record<string, string | number | undefined>], key: string): string | number | undefined {
    return node[1][key];
  }
}
