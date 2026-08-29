import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '@env/environment';

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

  /**
   * Update all meta tags, social sharing cards, canonical link, and JSON-LD structured data.
   */
  updateSeo(config: SeoConfig): void {
    const fullTitle = this.buildTitle(config.title);
    const resolvedUrl = this.resolveUrl(config.canonicalUrl, config.path);
    const resolvedImage = this.resolveImageUrl(config.image);
    const keywordsStr = Array.isArray(config.keywords)
      ? config.keywords.join(', ')
      : config.keywords || this.defaultKeywords;

    // 1. Browser Title
    this.titleService.setTitle(fullTitle);

    // 2. Standard Search Meta Tags
    this.updateTag('name', 'description', config.description);
    this.updateTag('name', 'keywords', keywordsStr);
    this.updateTag('name', 'author', config.author || `${this.defaultAppName} Team`);
    this.updateTag(
      'name',
      'robots',
      config.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    this.updateTag(
      'name',
      'googlebot',
      config.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    // 3. Open Graph (Facebook, LinkedIn, Slack, WhatsApp)
    this.updateTag('property', 'og:title', fullTitle);
    this.updateTag('property', 'og:description', config.description);
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

    // 4. Twitter Cards
    this.updateTag('name', 'twitter:card', 'summary_large_image');
    this.updateTag('name', 'twitter:title', fullTitle);
    this.updateTag('name', 'twitter:description', config.description);
    this.updateTag('name', 'twitter:image', resolvedImage);
    this.updateTag('name', 'twitter:image:alt', config.imageAlt || fullTitle);

    // 5. Canonical Link Tag
    this.setCanonicalUrl(resolvedUrl);

    // 6. Structured Data (JSON-LD)
    if (config.structuredData) {
      this.setStructuredData(config.structuredData);
    }
  }

  /**
   * Inject or update JSON-LD Structured Data script tag in document head
   */
  setStructuredData(schema: Record<string, unknown> | Array<Record<string, unknown>>): void {
    if (!this.document) return;

    let scriptTag = this.document.getElementById('seo-structured-data') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = this.document.createElement('script');
      scriptTag.id = 'seo-structured-data';
      scriptTag.type = 'application/ld+json';
      this.document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(schema, null, 2);
  }

  /**
   * Inject or update canonical URL <link rel="canonical"> in head
   */
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

  private readonly defaultKeywords =
    'library management system, smart library software, seat management, multi branch library, library attendance qr code, book catalog circulation, library billing saas, lexora';
}
