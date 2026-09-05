import { Component, input } from '@angular/core';
import { SeoFaqItem } from '@core/data/seo-aeo.content';

/**
 * Visible FAQ block for AEO — answer engines prefer on-page Q&A that matches FAQPage JSON-LD.
 */
@Component({
  selector: 'app-seo-faq',
  standalone: true,
  template: `
    <section class="seo-faq mx-auto max-w-7xl px-4 py-10 md:px-6" aria-labelledby="seo-faq-heading">
      <div class="mx-auto max-w-3xl">
        <p
          class="seo-answer-summary text-sm leading-relaxed text-[var(--muted-foreground)] md:text-base"
          data-aeo-answer
        >
          {{ answerSummary() }}
        </p>

        <h2 id="seo-faq-heading" class="mt-8 text-2xl font-semibold tracking-tight md:text-3xl">
          {{ heading() }}
        </h2>
        <p class="mt-2 text-sm text-[var(--muted-foreground)]">
          Straight answers about Lexora for search and AI assistants.
        </p>

        <div class="mt-6 space-y-3">
          @for (item of faqs(); track item.question) {
            <details
              class="group rounded-xl border border-[var(--border)] bg-[var(--card)]/30 px-4 py-3 open:bg-[var(--card)]/50"
            >
              <summary
                class="cursor-pointer list-none font-medium text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden"
              >
                <span class="flex items-start justify-between gap-3">
                  <span>{{ item.question }}</span>
                  <span
                    class="mt-0.5 shrink-0 text-[var(--muted-foreground)] transition group-open:rotate-45"
                    aria-hidden="true"
                    >+</span
                  >
                </span>
              </summary>
              <p class="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]" data-aeo-answer>
                {{ item.answer }}
              </p>
            </details>
          }
        </div>
      </div>
    </section>
  `,
})
export class SeoFaqComponent {
  readonly faqs = input.required<SeoFaqItem[]>();
  readonly answerSummary = input.required<string>();
  readonly heading = input('Frequently asked questions');
}
