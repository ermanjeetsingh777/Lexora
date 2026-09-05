import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '@env/environment';
import {
  LEXORA_DEFAULT_KEYWORDS,
  SeoFaqItem,
} from '@core/data/seo-aeo.content';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string | string[];
  canonicalUrl?: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** AEO: concise citeable answer for AI overviews / answer engines */
  answerSummary?: string;
  /** AEO: FAQ pairs → FAQPage JSON-LD (+ optional visible FAQ UI) */
  faqs?: SeoFaqItem[];
  /** GEO: sameAs / entity links for generative citation */
  sameAs?: string[];
  /** AEO/voice: CSS selectors marked speakable */
  speakableSelectors?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private readonly defaultSiteUrl = environment.siteUrl || 'https://uniappx.in';
  private readonly defaultAppName = environment.appName || 'Lexora';
  private readonly defaultImage = 'assets/landing/landing-hero-3d.png';
  private readonly supportEmail = environment.supportEmail || 'support@uniappx.in';

  /**
   * Update SEO + GEO + AEO signals: title/meta, social cards, canonical,
   * answer-summary tags, FAQ/Speakable JSON-LD, and main structured data.
   */
  updateSeo(config: SeoConfig): void {
    const fullTitle = this.buildTitle(config.title);
    const resolvedUrl = this.resolveUrl(config.canonicalUrl, config.path);
    const resolvedImage = this.resolveImageUrl(config.image);
    const keywordsStr = Array.isArray(config.keywords)
      ? config.keywords.join(', ')
      : config.keywords || LEXORA_DEFAULT_KEYWORDS.join(', ');
    const answerSummary = config.answerSummary?.trim();

    this.titleService.setTitle(fullTitle);

    // --- Classic SEO ---
    this.updateTag('name', 'description', config.description);
    this.updateTag('name', 'keywords', keywordsStr);
    this.updateTag('name', 'author', config.author || `${this.defaultAppName} Team`);
    this.updateTag(
      'name',
      'robots',
      config.noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    this.updateTag(
      'name',
      'googlebot',
      config.noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    // --- GEO / AEO meta (citation-friendly for generative & answer engines) ---
    if (answerSummary) {
      this.updateTag('name', 'abstract', answerSummary);
      this.updateTag('name', 'subject', answerSummary);
      this.updateTag('name', 'DC.title', fullTitle);
      this.updateTag('name', 'DC.description', answerSummary);
      this.updateTag('name', 'DC.subject', keywordsStr);
      this.updateTag('name', 'citation_title', fullTitle);
      this.updateTag('name', 'citation_abstract', answerSummary);
      this.updateTag('name', 'citation_author', config.author || this.defaultAppName);
      this.updateTag('name', 'citation_publication_date', config.publishedTime || '2026-01-01');
    }
    this.updateTag('name', 'application-name', this.defaultAppName);
    this.updateTag('name', 'generator', `${this.defaultAppName} Angular SPA`);
    this.updateTag('name', 'referrer', 'strict-origin-when-cross-origin');
    this.updateTag('name', 'format-detection', 'telephone=yes');
    this.updateTag('name', 'theme-color', '#2563eb');

    // Open Graph
    this.updateTag('property', 'og:title', fullTitle);
    this.updateTag('property', 'og:description', answerSummary || config.description);
    this.updateTag('property', 'og:type', config.type || 'website');
    this.updateTag('property', 'og:url', resolvedUrl);
    this.updateTag('property', 'og:site_name', this.defaultAppName);
    this.updateTag('property', 'og:locale', 'en_US');
    this.updateTag('property', 'og:image', resolvedImage);
    this.updateTag('property', 'og:image:alt', config.imageAlt || fullTitle);
    this.updateTag('property', 'og:image:width', '1200');
    this.updateTag('property', 'og:image:height', '630');

    if (config.publishedTime) {
      this.updateTag('property', 'article:published_time', config.publishedTime);
    }
    if (config.modifiedTime) {
      this.updateTag('property', 'article:modified_time', config.modifiedTime);
    }

    // Twitter
    this.updateTag('name', 'twitter:card', 'summary_large_image');
    this.updateTag('name', 'twitter:title', fullTitle);
    this.updateTag('name', 'twitter:description', answerSummary || config.description);
    this.updateTag('name', 'twitter:image', resolvedImage);
    this.updateTag('name', 'twitter:image:alt', config.imageAlt || fullTitle);

    this.setCanonicalUrl(resolvedUrl);
    this.setAlternateLlmsHint();

    const graphExtras = this.buildAeoGraphExtras(config, resolvedUrl, fullTitle);
    const merged = this.mergeStructuredData(config.structuredData, graphExtras, config.sameAs);
    if (merged) {
      this.setStructuredData(merged, 'seo-structured-data');
    }

    if (config.faqs?.length) {
      this.setStructuredData(this.buildFaqSchema(config.faqs, resolvedUrl), 'seo-faq-structured-data');
    } else {
      this.removeStructuredData('seo-faq-structured-data');
    }
  }

  /** FAQPage JSON-LD for answer engines. */
  buildFaqSchema(faqs: SeoFaqItem[], pageUrl?: string): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      ...(pageUrl ? { url: pageUrl, mainEntityOfPage: pageUrl } : {}),
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
  }

  setStructuredData(
    schema: Record<string, unknown> | Array<Record<string, unknown>>,
    elementId = 'seo-structured-data'
  ): void {
    if (!this.document) return;

    let scriptTag = this.document.getElementById(elementId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = this.document.createElement('script');
      scriptTag.id = elementId;
      scriptTag.type = 'application/ld+json';
      this.document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(schema);
  }

  removeStructuredData(elementId: string): void {
    this.document?.getElementById(elementId)?.remove();
  }

  private buildAeoGraphExtras(
    config: SeoConfig,
    resolvedUrl: string,
    fullTitle: string
  ): Record<string, unknown>[] {
    const extras: Record<string, unknown>[] = [];
    const selectors = config.speakableSelectors?.length
      ? config.speakableSelectors
      : ['.seo-answer-summary', 'h1', '[data-aeo-answer]'];

    extras.push({
      '@type': 'WebPage',
      '@id': `${resolvedUrl}#webpage`,
      url: resolvedUrl,
      name: fullTitle,
      description: config.answerSummary || config.description,
      isPartOf: { '@id': `${this.defaultSiteUrl}/#website` },
      about: { '@id': `${this.defaultSiteUrl}/#software` },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: selectors,
      },
      ...(config.answerSummary
        ? {
            abstract: config.answerSummary,
            text: config.answerSummary,
          }
        : {}),
    });

    return extras;
  }

  private mergeStructuredData(
    structuredData: SeoConfig['structuredData'],
    extras: Record<string, unknown>[],
    sameAs?: string[]
  ): Record<string, unknown> | Array<Record<string, unknown>> | null {
    if (!structuredData && !extras.length) return null;

    const orgPatch =
      sameAs?.length
        ? {
            '@type': 'Organization',
            '@id': `${this.defaultSiteUrl}/#organization`,
            name: this.defaultAppName,
            url: this.defaultSiteUrl,
            email: this.supportEmail,
            sameAs,
          }
        : null;

    if (
      structuredData &&
      !Array.isArray(structuredData) &&
      Array.isArray((structuredData as { '@graph'?: unknown })['@graph'])
    ) {
      const graph = [
        ...((structuredData as { '@graph': Record<string, unknown>[] })['@graph'] || []),
        ...extras,
      ];
      if (orgPatch) {
        const idx = graph.findIndex((n) => n['@type'] === 'Organization');
        if (idx >= 0) {
          graph[idx] = { ...graph[idx], sameAs: sameAs };
        } else {
          graph.unshift(orgPatch);
        }
      }
      return { ...structuredData, '@graph': graph };
    }

    if (structuredData && extras.length) {
      return {
        '@context': 'https://schema.org',
        '@graph': [
          ...(Array.isArray(structuredData) ? structuredData : [structuredData]),
          ...extras,
          ...(orgPatch ? [orgPatch] : []),
        ],
      };
    }

    if (structuredData) return structuredData;

    return {
      '@context': 'https://schema.org',
      '@graph': [...extras, ...(orgPatch ? [orgPatch] : [])],
    };
  }

  /** Hint crawlers that an llms.txt exists (GEO). */
  private setAlternateLlmsHint(): void {
    if (!this.document) return;
    const href = `${this.defaultSiteUrl.replace(/\/$/, '')}/llms.txt`;
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="llms-txt"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'llms-txt');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private setCanonicalUrl(url: string): void {
    if (!this.document) return;

    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private updateTag(attrKey: 'name' | 'property', attrValue: string, content: string): void {
    this.metaService.updateTag({ [attrKey]: attrValue, content });
  }

  private buildTitle(title: string): string {
    if (!title) return `${this.defaultAppName} - Smart Library & Seat Management Platform`;
    if (title.toLowerCase().includes(this.defaultAppName.toLowerCase())) {
      return title;
    }
    return `${title} | ${this.defaultAppName} - Smart Library Management`;
  }

  private resolveUrl(canonicalUrl?: string, path?: string): string {
    if (canonicalUrl) return canonicalUrl;
    const base = this.defaultSiteUrl.replace(/\/$/, '');
    if (path) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${base}${cleanPath}`;
    }
    if (typeof window !== 'undefined' && window.location.pathname) {
      return `${base}${window.location.pathname}`;
    }
    return base;
  }

  private resolveImageUrl(image?: string): string {
    const rawImage = image || this.defaultImage;
    if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
      return rawImage;
    }
    const cleanImage = rawImage.startsWith('/') ? rawImage.slice(1) : rawImage;
    return `${this.defaultSiteUrl.replace(/\/$/, '')}/${cleanImage}`;
  }
}
