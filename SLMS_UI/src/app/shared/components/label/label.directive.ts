import { Directive, ElementRef, inject } from '@angular/core';

const LABEL_CLASSES =
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'.split(' ');

/** Applies the shadcn/ui `Label` look to a native `<label>`. */
@Directive({
  selector: 'label[appLabel]',
  standalone: true,
})
export class LabelDirective {
  constructor() {
    inject(ElementRef<HTMLElement>).nativeElement.classList.add(...LABEL_CLASSES);
  }
}
