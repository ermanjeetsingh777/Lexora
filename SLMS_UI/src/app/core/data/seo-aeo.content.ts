/** Shared SEO / GEO / AEO content for public marketing pages. */

export interface SeoFaqItem {
  question: string;
  answer: string;
}

/** Direct answers answer engines (Google AI Overviews, Perplexity, ChatGPT) can cite. */
export const LEXORA_ANSWER_SUMMARY =
  'Lexora is a cloud SaaS for smart library and seat management. Institutions run multi-branch libraries with real-time seat layouts, QR attendance, book circulation, member subscriptions, billing, and analytics from one multi-tenant platform at uniappx.in.';

export const LEXORA_HOME_FAQS: SeoFaqItem[] = [
  {
    question: 'What is Lexora?',
    answer:
      'Lexora is a multi-tenant smart library and seat management platform. It helps institutions manage branches, libraries, seats, QR attendance, books, members, subscriptions, and analytics in one web app.',
  },
  {
    question: 'Who should use Lexora?',
    answer:
      'Lexora is built for reading rooms, coaching libraries, college libraries, and multi-branch institutions that need seat allocation, attendance tracking, member billing, and operational analytics.',
  },
  {
    question: 'Does Lexora support multi-branch libraries?',
    answer:
      'Yes. Lexora supports institution → branch → library hierarchy with tenant isolation, so each location can manage seats, members, and attendance while admins see consolidated reports.',
  },
  {
    question: 'How does QR attendance work in Lexora?',
    answer:
      'Members scan a library or member QR code at a kiosk or phone camera. Lexora records check-in and check-out in real time and links attendance to seats, shifts, and member profiles.',
  },
  {
    question: 'Is Lexora available as a free plan?',
    answer:
      'Lexora offers transparent subscription packages, including entry options with zero setup friction. Current plans and pricing are listed on the Prices page at uniappx.in/prices.',
  },
  {
    question: 'Where can I sign up for Lexora?',
    answer:
      'Register at https://uniappx.in/register or visit https://uniappx.in for product overview, features, and pricing. Support is available at support@uniappx.in.',
  },
];

export const LEXORA_FEATURES_FAQS: SeoFaqItem[] = [
  {
    question: 'What are the main Lexora modules?',
    answer:
      'Core modules include institutions and branches, visual seat and shift allocation, QR attendance kiosks, book catalog and circulation, member self-service, subscriptions and billing, notifications, and real-time analytics.',
  },
  {
    question: 'Can Lexora manage book circulation?',
    answer:
      'Yes. Lexora includes digital cataloging and physical book circulation workflows so libraries can track titles, issues, returns, and related member activity alongside seat operations.',
  },
];

export const LEXORA_PRICING_FAQS: SeoFaqItem[] = [
  {
    question: 'How much does Lexora cost?',
    answer:
      'Lexora uses flexible SaaS subscriptions for single libraries and multi-branch institutions. Plans typically start with an affordable entry package; live prices and feature comparison are on https://uniappx.in/prices.',
  },
  {
    question: 'Are there setup fees for Lexora?',
    answer:
      'Lexora is designed for instant onboarding with minimal setup friction. Check the current package cards on the pricing page for included features and any add-ons.',
  },
];

export const LEXORA_DEFAULT_KEYWORDS = [
  'library management system',
  'smart library software',
  'seat management system',
  'multi branch library software',
  'library attendance QR code',
  'reading room management software',
  'library billing SaaS',
  'Lexora',
  'uniappx',
];
