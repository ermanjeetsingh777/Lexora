import { Directive, ElementRef, inject } from '@angular/core';

const INPUT_CLASSES =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'.split(
    ' ',
  );

/** Applies the shadcn/ui `Input` look to a native `<input>` or `<textarea>`. */
@Directive({
  selector: 'input[appInput], textarea[appInput]',
  standalone: true,
})
export class InputDirective {
  constructor() {
    inject(ElementRef<HTMLElement>).nativeElement.classList.add(...INPUT_CLASSES);
  }
}
