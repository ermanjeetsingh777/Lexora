import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonService } from '@core/services/common.service';
import { MemberPhotoService } from '@features/members/member-photo.service';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
};

@Component({
  selector: 'app-member-avatar',
  standalone: true,
  host: { class: 'inline-flex shrink-0' },
  template: `
    @if (photoUrl()) {
      <img
        [src]="photoUrl()!"
        [alt]="name()"
        [class]="sizeClass() + ' rounded-full object-cover border shrink-0'"
      />
    } @else {
      <span
        [class]="sizeClass() + ' rounded-full flex items-center justify-center text-white font-medium shrink-0'"
        [style.background]="commonService.avatarBg(hue())"
      >
        {{ commonService.initials(name()) }}
      </span>
    }
  `,
})
export class MemberAvatarComponent {
  readonly memberId = input.required<string>();
  readonly hasPhoto = input(false);
  readonly name = input('');
  readonly hue = input(200);
  readonly size = input<AvatarSize>('md');

  readonly commonService = inject(CommonService);
  private readonly photoService = inject(MemberPhotoService);

  readonly photoUrl = signal<string | null>(null);
  
  readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);

  constructor() {
    effect((onCleanup) => {
      const id = this.memberId();
      const hasPhoto = this.hasPhoto();

      if (!hasPhoto) {
        this.photoUrl.set(null);
        return;
      }

      const sub = this.photoService.getPhotoUrl(id, true).subscribe((url) => this.photoUrl.set(url));
      onCleanup(() => sub.unsubscribe());
    });
  }
}
