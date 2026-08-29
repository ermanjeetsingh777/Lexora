import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type LogoTheme = 'auto' | 'light' | 'dark';
export type LogoLayout = 'horizontal' | 'stacked' | 'mark-only';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-logo.component.html',
  styleUrl: './app-logo.component.css',
})
export class AppLogoComponent {
  /** Size preset or pixel dimension */
  readonly size = input<LogoSize>('md');

  /** Layout alignment: horizontal (standard), stacked (centered mark above text), mark-only */
  readonly layout = input<LogoLayout>('horizontal');

  /** Show 'Lexora' text alongside/below emblem */
  readonly showText = input<boolean>(true);

  /** Show 'SMART LIBRARY MANAGEMENT SYSTEM' subtitle */
  readonly showSubtitle = input<boolean>(false);

  /** Theme mode for text coloring ('auto' adapts to dark/light CSS variables) */
  readonly theme = input<LogoTheme>('auto');

  /** Link target when clicked (e.g. '/' or '/dashboard') */
  readonly linkTo = input<string | null>(null);

  /** Custom extra CSS classes */
  readonly customClass = input<string>('');

  /** Numeric pixel dimensions for mark */
  readonly pixelSize = computed(() => {
    const s = this.size();
    if (typeof s === 'number') return s;
    switch (s) {
      case 'xs':
        return 26;
      case 'sm':
        return 34;
      case 'md':
        return 42;
      case 'lg':
        return 52;
      case 'xl':
        return 68;
      default:
        return 42;
    }
  });

  readonly fontSizeClass = computed(() => {
    const s = this.size();
    if (typeof s === 'number') {
      if (s <= 26) return 'text-xs tracking-wider';
      if (s <= 34) return 'text-sm font-bold tracking-wider';
      if (s <= 42) return 'text-base font-extrabold tracking-widest';
      if (s <= 52) return 'text-xl font-extrabold tracking-widest';
      return 'text-2xl font-black tracking-widest';
    }
    switch (s) {
      case 'xs':
        return 'text-xs tracking-wider';
      case 'sm':
        return 'text-sm font-bold tracking-wider';
      case 'md':
        return 'text-base font-extrabold tracking-widest';
      case 'lg':
        return 'text-xl font-extrabold tracking-widest';
      case 'xl':
        return 'text-2xl font-black tracking-widest';
      default:
        return 'text-base font-extrabold tracking-widest';
    }
  });

  readonly subtitleSizeClass = computed(() => {
    const s = this.size();
    if (typeof s === 'number') {
      if (s <= 34) return 'text-[8px] tracking-wider';
      if (s <= 46) return 'text-[9px] tracking-widest';
      return 'text-[10px] tracking-widest';
    }
    switch (s) {
      case 'xs':
      case 'sm':
        return 'text-[8px] tracking-wider';
      case 'md':
        return 'text-[9px] tracking-widest';
      case 'lg':
      case 'xl':
        return 'text-[10px] tracking-widest';
      default:
        return 'text-[9px] tracking-widest';
    }
  });
}
