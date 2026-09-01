export const APP_NAME = 'Lexora';
export const APP_TAGLINE = 'Smart Library Management System';

export interface PolicyTrustCard {
  icon: string;
  title: string;
  description: string;
}

export interface PolicyCard {
  title: string;
  body: string;
}

export interface PolicySection {
  id: string;
  title: string;
  icon: string;
  kind: 'paragraph' | 'cards' | 'list' | 'highlight';
  paragraphs?: string[];
  items?: string[];
  cards?: PolicyCard[];
}

export interface PolicyDocument {
  id: string;
  slug: string;
  route: string;
  title: string;
  badge: string;
  description: string;
  updatedAt: string;
  tags: string[];
  promiseTitle: string;
  promiseDescription: string;
  trustCards: PolicyTrustCard[];
  sections: PolicySection[];
  contactEmail: string;
}

export const POLICY_CONTACT_EMAIL = 'support@uniappx.in';

export const POLICY_CATALOG: PolicyDocument[] = [
  {
    id: 'privacy',
    slug: 'privacy',
    route: '/privacy-policy',
    title: 'Privacy Policy',
    badge: 'Privacy & Data Protection',
    description:
      `${APP_NAME} is committed to protecting institutions, staff, and members across multi-tenant library networks. This policy explains what we collect, how we use it, and the choices available to you.`,
    updatedAt: 'August 2026',
    tags: ['GDPR aligned', 'Tenant isolation', 'No data selling'],
    promiseTitle: 'Privacy Promise',
    promiseDescription:
      `We never sell personal data. Access is role-scoped, activity is auditable, and institutional records remain under your control within ${APP_NAME}.`,
    trustCards: [
      { icon: 'shield-check', title: 'Protected Data', description: 'Encryption in transit and at rest with secure cloud infrastructure.' },
      { icon: 'eye-off', title: 'No Data Selling', description: 'Personal and institutional data is never sold to third parties.' },
      { icon: 'database', title: 'Data Ownership', description: 'Institutions retain ownership of members, attendance, and billing records.' },
      { icon: 'users', title: 'Scoped Access', description: 'RBAC limits staff to assigned institutions, branches, and libraries.' },
    ],
    sections: [
      {
        id: 'collection',
        title: 'Information We Collect',
        icon: 'database',
        kind: 'cards',
        cards: [
          { title: 'Institution & tenant data', body: 'Organisation profile, branches, libraries, subscription packages, and billing contacts.' },
          { title: 'Member records', body: 'Profiles, contacts, guardians, documents, photos, library mapping, and plan details.' },
          { title: 'Operational data', body: 'Attendance, seat allocation, shifts, book loans, fines, and audit activity logs.' },
          { title: 'Account & usage data', body: 'Staff accounts, roles, permissions, authentication events, and support interactions.' },
        ],
      },
      {
        id: 'usage',
        title: 'How We Use Information',
        icon: 'settings',
        kind: 'list',
        items: [
          'Provide and operate the platform across institutions, branches, and libraries.',
          'Process subscriptions, member plans, fee receipts, and billing workflows.',
          'Enable attendance tracking, QR check-in, kiosk flows, and reporting.',
          'Send service, security, and billing notifications you configure.',
          'Improve reliability, performance, and product experience.',
          'Meet legal, compliance, and contractual obligations.',
        ],
      },
      {
        id: 'sharing',
        title: 'When We Share Information',
        icon: 'users',
        kind: 'paragraph',
        paragraphs: [
          `We do not sell personal information. We may share limited data with infrastructure providers, payment processors, and communication services strictly to operate ${APP_NAME}, and only under contractual confidentiality and security obligations.`,
          'Institution administrators control which staff can access member and operational records through role-based permissions.',
        ],
      },
      {
        id: 'security',
        title: 'Security & Protection',
        icon: 'shield',
        kind: 'highlight',
        paragraphs: [
          'We apply encryption, authenticated access, scoped permissions, audit logging, monitoring, and secure development practices to protect against unauthorized access, disclosure, or misuse.',
        ],
      },
      {
        id: 'retention',
        title: 'Data Retention',
        icon: 'archive',
        kind: 'paragraph',
        paragraphs: [
          'We retain information for as long as needed to provide the service, satisfy legal requirements, resolve disputes, and enforce agreements. Upon valid deletion requests or account termination, data is deleted or anonymized according to our retention schedule.',
        ],
      },
      {
        id: 'rights',
        title: 'Your Rights',
        icon: 'badge-check',
        kind: 'list',
        items: [
          'Access personal information held about you or your institution.',
          'Correct inaccurate or incomplete records.',
          'Export data where supported by your plan and role.',
          'Request deletion subject to legal and contractual limits.',
          'Object to or restrict certain processing where applicable law allows.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies & Similar Technologies',
        icon: 'cookie',
        kind: 'paragraph',
        paragraphs: [
          'We use essential cookies for authentication and session management. Optional analytics cookies help us understand product usage. See our Cookie Policy for details and choices.',
        ],
      },
    ],
    contactEmail: POLICY_CONTACT_EMAIL,
  },
  {
    id: 'cookie',
    slug: 'cookie',
    route: '/cookie-policy',
    title: 'Cookie Policy',
    badge: 'Cookies & Preferences',
    description:
      `This policy describes how ${APP_NAME} uses cookies and similar technologies on our web application, marketing site, and authenticated workspace.`,
    updatedAt: 'August 2026',
    tags: ['Essential cookies', 'Analytics optional', 'Session security'],
    promiseTitle: 'Transparent Usage',
    promiseDescription:
      'We use the minimum cookies required for secure login and platform operation. Non-essential cookies are limited and documented below.',
    trustCards: [
      { icon: 'lock', title: 'Session Security', description: 'Authentication cookies protect signed-in staff sessions.' },
      { icon: 'settings', title: 'Preferences', description: 'Theme and UI preferences may be stored locally or in cookies.' },
      { icon: 'activity', title: 'Performance', description: 'Analytics help us improve speed and reliability.' },
      { icon: 'shield-check', title: 'No Ad Tracking', description: 'We do not use cookies to sell or profile users for advertising.' },
    ],
    sections: [
      {
        id: 'what',
        title: 'What Are Cookies?',
        icon: 'cookie',
        kind: 'paragraph',
        paragraphs: [
          'Cookies are small text files stored on your device. They help websites remember login state, preferences, and aggregated usage patterns.',
        ],
      },
      {
        id: 'types',
        title: 'Cookies We Use',
        icon: 'layers',
        kind: 'cards',
        cards: [
          { title: 'Strictly necessary', body: 'Required for login, session continuity, security, and load balancing.' },
          { title: 'Functional', body: 'Remember interface preferences such as theme, sidebar state, or locale.' },
          { title: 'Analytics', body: 'Help us measure feature adoption, errors, and performance trends in aggregate.' },
        ],
      },
      {
        id: 'manage',
        title: 'Managing Cookies',
        icon: 'settings',
        kind: 'list',
        items: [
          'You can block or delete cookies through your browser settings.',
          'Disabling essential cookies may prevent login or core platform features from working.',
          'Where required by law, we will request consent before enabling non-essential analytics cookies.',
        ],
      },
    ],
    contactEmail: POLICY_CONTACT_EMAIL,
  },
  {
    id: 'data-processing',
    slug: 'data-processing',
    route: '/data-processing',
    title: 'Data Processing Agreement',
    badge: 'Institutional Data Processing',
    description:
      `This agreement describes how ${APP_NAME} processes personal data on behalf of institutions using our multi-tenant library management platform.`,
    updatedAt: 'August 2026',
    tags: ['Processor role', 'Tenant isolation', 'Subprocessors listed'],
    promiseTitle: 'Institution Control',
    promiseDescription:
      'Institutions are the data controller for member and operational records. Lexora acts as a processor and follows documented instructions and security controls.',
    trustCards: [
      { icon: 'building-2', title: 'Controller / Processor', description: 'Institutions control member data; Lexora processes it to deliver the service.' },
      { icon: 'shield', title: 'Purpose Limitation', description: 'Data is used only to provide contracted platform features.' },
      { icon: 'file-clock', title: 'Auditability', description: 'Administrative actions can be traced through audit logs.' },
      { icon: 'download', title: 'Export & Return', description: 'Data export and return options are available on supported plans.' },
    ],
    sections: [
      {
        id: 'scope',
        title: 'Scope of Processing',
        icon: 'database',
        kind: 'cards',
        cards: [
          { title: 'Subjects', body: 'Members, guardians, institution staff, and authorized administrators.' },
          { title: 'Categories', body: 'Identity, contact, attendance, billing, documents, and usage metadata.' },
          { title: 'Activities', body: 'Storage, retrieval, reporting, notifications, backups, and support assistance.' },
          { title: 'Duration', body: 'For the subscription term and any legally required retention period thereafter.' },
        ],
      },
      {
        id: 'obligations',
        title: 'Processor Obligations',
        icon: 'badge-check',
        kind: 'list',
        items: [
          'Process personal data only on documented instructions from the institution.',
          'Ensure personnel with access are bound by confidentiality obligations.',
          'Implement appropriate technical and organizational security measures.',
          'Assist institutions with data subject requests where technically feasible.',
          'Notify institutions without undue delay upon becoming aware of a personal data breach.',
        ],
      },
      {
        id: 'subprocessors',
        title: 'Subprocessors',
        icon: 'layers',
        kind: 'paragraph',
        paragraphs: [
          'We may engage vetted cloud hosting, email, payment, and monitoring providers to operate the platform. A current subprocessor list is available on request and institutions will be notified of material changes.',
        ],
      },
      {
        id: 'transfers',
        title: 'International Transfers',
        icon: 'map-pin',
        kind: 'paragraph',
        paragraphs: [
          'Where data is processed outside the institution\'s region, we apply appropriate safeguards such as standard contractual clauses or equivalent mechanisms required by applicable law.',
        ],
      },
    ],
    contactEmail: POLICY_CONTACT_EMAIL,
  },
  {
    id: 'acceptable-use',
    slug: 'acceptable-use',
    route: '/acceptable-use',
    title: 'Acceptable Use Policy',
    badge: 'Platform Usage Rules',
    description:
      `This policy sets acceptable use requirements for institutions, administrators, and staff accessing ${APP_NAME}.`,
    updatedAt: 'August 2026',
    tags: ['Fair use', 'Security', 'Compliance'],
    promiseTitle: 'Safe Platform Use',
    promiseDescription:
      'These rules protect institutions, members, and platform integrity while enabling legitimate library operations.',
    trustCards: [
      { icon: 'shield-check', title: 'Authorized Access', description: 'Use credentials only for approved institutional purposes.' },
      { icon: 'users', title: 'Member Privacy', description: 'Access member records only when your role requires it.' },
      { icon: 'qr-code', title: 'QR & Kiosk Integrity', description: 'Do not misuse attendance tokens or kiosk endpoints.' },
      { icon: 'alert-circle', title: 'Report Abuse', description: 'Report suspected misuse or security incidents promptly.' },
    ],
    sections: [
      {
        id: 'permitted',
        title: 'Permitted Use',
        icon: 'check-circle-2',
        kind: 'list',
        items: [
          'Manage institutions, branches, libraries, members, attendance, books, and billing within your subscription.',
          'Assign roles and permissions according to institutional policies.',
          'Export reports and records you are authorized to access.',
          'Use QR, scanner, and kiosk features for legitimate attendance workflows.',
        ],
      },
      {
        id: 'prohibited',
        title: 'Prohibited Use',
        icon: 'triangle-alert',
        kind: 'list',
        items: [
          'Unauthorized access to another tenant\'s data or accounts.',
          'Sharing credentials or bypassing role-based access controls.',
          'Uploading unlawful, harmful, or infringing content.',
          'Reverse engineering, scraping, or attempting to disrupt platform operations.',
          'Using the service to spam members or send unsolicited marketing without consent.',
          'Collecting or exporting member data beyond authorized institutional purposes.',
        ],
      },
      {
        id: 'enforcement',
        title: 'Enforcement',
        icon: 'shield',
        kind: 'highlight',
        paragraphs: [
          'Violations may result in suspension, restricted access, or termination of service. We may investigate abuse reports and cooperate with institutions or authorities where required by law.',
        ],
      },
    ],
    contactEmail: 'support@uniappx.in',
  },
  {
    id: 'security',
    slug: 'security',
    route: '/security-policy',
    title: 'Security Policy',
    badge: 'Platform Security',
    description:
      `This policy summarizes the security measures ${APP_NAME} applies to protect institutional and member data across the platform.`,
    updatedAt: 'August 2026',
    tags: ['RBAC', 'Encryption', 'Monitoring'],
    promiseTitle: 'Security by Design',
    promiseDescription:
      'Security controls are embedded in authentication, authorization, tenant isolation, logging, and operational monitoring.',
    trustCards: [
      { icon: 'verified_user', title: 'Authentication', description: 'Secure login flows including OTP verification where enabled.' },
      { icon: 'admin_panel_settings', title: 'Authorization', description: 'Granular permissions with institution, branch, and library scoping.' },
      { icon: 'file-clock', title: 'Audit Logs', description: 'Administrative actions recorded for accountability.' },
      { icon: 'refresh-cw', title: 'Continuity', description: 'Backups and recovery processes support business continuity.' },
    ],
    sections: [
      {
        id: 'controls',
        title: 'Technical Controls',
        icon: 'shield-check',
        kind: 'cards',
        cards: [
          { title: 'Encryption', body: 'TLS for data in transit and encryption for sensitive data at rest.' },
          { title: 'Tenant isolation', body: 'Logical separation of institution data across the multi-tenant architecture.' },
          { title: 'Access management', body: 'Role-based access, least privilege, and scoped user assignments.' },
          { title: 'Monitoring', body: 'Logging, alerting, and review of security-relevant events.' },
        ],
      },
      {
        id: 'org',
        title: 'Organizational Controls',
        icon: 'users',
        kind: 'list',
        items: [
          'Security awareness for personnel with production access.',
          'Change management and review for critical system updates.',
          'Vendor assessment for infrastructure and subprocessors.',
          'Incident response procedures with institution notification where required.',
        ],
      },
      {
        id: 'customer',
        title: 'Customer Responsibilities',
        icon: 'user-cog',
        kind: 'list',
        items: [
          'Maintain strong passwords and protect staff credentials.',
          'Assign roles according to least-privilege principles.',
          'Review audit logs and deactivate unused accounts promptly.',
          'Ensure lawful basis and consent when collecting member personal data.',
        ],
      },
    ],
    contactEmail: 'support@uniappx.in',
  },
  {
    id: 'refund',
    slug: 'refund',
    route: '/refund-policy',
    title: 'Refund & Billing Policy',
    badge: 'Subscriptions & Billing',
    description:
      `This policy explains billing cycles, trials, renewals, and refund handling for ${APP_NAME} subscription packages.`,
    updatedAt: 'August 2026',
    tags: ['Transparent billing', 'Trial terms', 'Renewals'],
    promiseTitle: 'Clear Billing',
    promiseDescription:
      'Subscription charges, plan features, and renewal terms are shown before purchase. Institutions can manage plans from the subscriptions area.',
    trustCards: [
      { icon: 'credit-card', title: 'Plan Visibility', description: 'Package features and limits are displayed before checkout.' },
      { icon: 'event', title: 'Billing Cycles', description: 'Monthly and annual plans billed according to selected duration.' },
      { icon: 'sparkles', title: 'Trials', description: 'Trial access terms are shown on eligible packages.' },
      { icon: 'receipt_long', title: 'Invoices', description: 'Billing records available for institution administrators.' },
    ],
    sections: [
      {
        id: 'billing',
        title: 'Billing & Renewals',
        icon: 'credit-card',
        kind: 'paragraph',
        paragraphs: [
          'Paid subscriptions renew automatically at the end of each billing period unless cancelled before the renewal date. Pricing and included features are determined by the selected package at the time of purchase.',
        ],
      },
      {
        id: 'trials',
        title: 'Free Trials',
        icon: 'sparkles',
        kind: 'paragraph',
        paragraphs: [
          'Where offered, trial access provides time-limited use of selected features. At trial end, continued access requires conversion to a paid plan or downgrade to an eligible free tier if available.',
        ],
      },
      {
        id: 'refunds',
        title: 'Refunds',
        icon: 'indian-rupee',
        kind: 'list',
        items: [
          'Fees are generally non-refundable except where required by applicable law.',
          'Billing errors reported within 30 days will be reviewed and corrected where confirmed.',
          'Downgrades take effect at the next billing cycle unless otherwise stated.',
          'Contact support with invoice details for billing disputes or exceptional refund requests.',
        ],
      },
      {
        id: 'taxes',
        title: 'Taxes & Invoices',
        icon: 'file-text',
        kind: 'paragraph',
        paragraphs: [
          'Prices may exclude applicable taxes unless stated otherwise. Tax invoices are issued according to institutional billing details on file.',
        ],
      },
    ],
    contactEmail: 'support@uniappx.in',
  },
];

export function getPolicyBySlug(slug: string): PolicyDocument | undefined {
  return POLICY_CATALOG.find((policy) => policy.slug === slug);
}

export function getOtherPolicies(currentSlug: string): PolicyDocument[] {
  return POLICY_CATALOG.filter((policy) => policy.slug !== currentSlug);
}
