// Client-side support store: tickets, drafts, subscriptions, articles, incidents.
// Persisted to localStorage; reactive via useSyncExternalStore.
import { useSyncExternalStore } from "react";

export type TicketStatus = "Open" | "Pending" | "Resolved" | "Closed";
export type TicketPriority = "Low" | "Normal" | "High" | "Urgent";
export type TicketCategory =
  | "Account"
  | "Billing"
  | "Technical"
  | "Feature request"
  | "Hardware"
  | "Other";

export type TicketAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

export type TicketMessage = {
  id: string;
  author: string;
  role: "Member" | "Agent" | "System";
  body: string;
  at: number;
  attachments?: TicketAttachment[];
};

export type InternalNote = {
  id: string;
  author: string;
  body: string;
  at: number;
};

export type StatusTransition = {
  id: string;
  from?: TicketStatus;
  to: TicketStatus;
  by: string;
  at: number;
};

export type Ticket = {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  area?: string;
  requester: { name: string; email: string };
  assignee?: string;
  channel: "Email" | "Portal" | "Phone" | "Chat";
  tags: string[];
  createdAt: number;
  updatedAt: number;
  messages: TicketMessage[];
  notes: InternalNote[];
  transitions: StatusTransition[];
  slaDueAt: number;
  linkedArticle?: string;
};

export type TicketDraft = {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  area: string;
  description: string;
  attachments: TicketAttachment[];
  updatedAt: number;
};

export type Article = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  body: string;
  views: number;
  updatedAt: number;
};

export type IncidentUpdate = {
  id: string;
  phase: "Investigating" | "Identified" | "Monitoring" | "Resolved";
  body: string;
  at: number;
};

export type Incident = {
  id: string;
  title: string;
  severity: "minor" | "major" | "critical" | "maintenance";
  status: "Investigating" | "Identified" | "Monitoring" | "Resolved" | "Scheduled";
  components: string[];
  startedAt: number;
  resolvedAt?: number;
  updates: IncidentUpdate[];
};

export type ComponentHealth = {
  name: string;
  description: string;
  status: "Operational" | "Degraded" | "Partial Outage" | "Major Outage" | "Maintenance";
  responseMs: number;
  uptime90: number[]; // 0..1 per day, 90 entries
};

export type Subscription = {
  channel: "email" | "sms" | "webhook";
  target: string;
  components: string[]; // component names or ["all"]
  createdAt: number;
};

const K_TICKETS = "smartlibrary.support.tickets.v1";
const K_DRAFTS = "smartlibrary.support.drafts.v1";
const K_SUBS = "smartlibrary.support.subs.v1";

// ---------- seeds ----------

const now = Date.now();
const day = 86400_000;
const hour = 3600_000;

const seedArticles: Article[] = [
  {
    id: "a1",
    title: "How do I assign seats to members?",
    category: "Seats",
    tags: ["seats", "members", "allocation"],
    views: 1240,
    updatedAt: now - 12 * day,
    body: "Open Seats → Layout, click a seat to open the drawer, then use the Assign button to search members by name or ID. Bulk assignment is available from the Members table via the Actions menu.",
  },
  {
    id: "a2",
    title: "Setting up QR check-in on your kiosk",
    category: "Hardware",
    tags: ["qr", "hardware", "attendance", "kiosk"],
    views: 984,
    updatedAt: now - 22 * day,
    body: "Install the SmartLibrary Kiosk app on any iPad or Android tablet, sign in with a device token from Settings → API keys, and pair the kiosk to a branch. QR badges print from the Members detail page.",
  },
  {
    id: "a3",
    title: "Configuring shift schedules",
    category: "Operations",
    tags: ["shifts", "attendance", "schedule"],
    views: 726,
    updatedAt: now - 32 * day,
    body: "Shifts live under Attendance → Shifts. Create weekly templates with grace periods, break windows, and overflow behavior. Assign templates to branches or individual members.",
  },
  {
    id: "a4",
    title: "Importing bulk members from CSV",
    category: "Data",
    tags: ["import", "csv", "members", "bulk"],
    views: 612,
    updatedAt: now - 40 * day,
    body: "Use the Members → Import wizard. Download the template CSV, fill in required columns (name, email, plan), and upload. The wizard previews rows and reports validation errors before commit.",
  },
  {
    id: "a5",
    title: "Subscription and billing setup",
    category: "Billing",
    tags: ["billing", "stripe", "subscription", "invoice"],
    views: 508,
    updatedAt: now - 44 * day,
    body: "Enable billing under Settings → Institution → Billing. Connect Stripe, choose default plans, and configure tax rates. Invoices generate on the 1st of each month and are emailed automatically.",
  },
  {
    id: "a6",
    title: "Configuring WhatsApp and SMS alerts",
    category: "Notifications",
    tags: ["notifications", "whatsapp", "sms", "alerts"],
    views: 421,
    updatedAt: now - 48 * day,
    body: "Add a provider under Settings → Notifications → Channels. Twilio and Gupshup are supported out of the box. Choose which topics (attendance, billing, seat allocation) route to which channel.",
  },
  {
    id: "a7",
    title: "Resetting a member's password",
    category: "Account",
    tags: ["password", "reset", "account", "auth"],
    views: 390,
    updatedAt: now - 6 * day,
    body: "Open the member detail drawer and click Send reset link. The member receives an email with a one-time link valid for 24 hours. Bulk reset is available from the Members table.",
  },
  {
    id: "a8",
    title: "Enabling two-factor authentication",
    category: "Account",
    tags: ["2fa", "security", "mfa", "auth"],
    views: 355,
    updatedAt: now - 3 * day,
    body: "Go to Settings → Security → Two-factor authentication. Admins can enforce 2FA org-wide. Members enroll with any TOTP app (Authy, Google Authenticator, 1Password).",
  },
  {
    id: "a9",
    title: "Troubleshooting: QR scanner not reading badges",
    category: "Hardware",
    tags: ["qr", "scanner", "troubleshooting", "hardware"],
    views: 288,
    updatedAt: now - 9 * day,
    body: "Clean the scanner lens, ensure the kiosk device firmware is up to date, and reprint the badge if the QR contrast is low. If the issue persists, factory reset the scanner from Hardware settings.",
  },
  {
    id: "a10",
    title: "Understanding your invoice",
    category: "Billing",
    tags: ["invoice", "billing", "line items"],
    views: 260,
    updatedAt: now - 5 * day,
    body: "Each invoice shows a subtotal by branch, taxes, credits, and any manual adjustments. Line items link back to the underlying subscription or one-off charge for full traceability.",
  },
  {
    id: "a11",
    title: "Requesting a new feature",
    category: "Feature request",
    tags: ["feature", "roadmap", "feedback"],
    views: 190,
    updatedAt: now - 60 * day,
    body: "Submit ideas through Support → New ticket with the Feature request category. Product review happens every two weeks; you'll get a status update within a sprint.",
  },
  {
    id: "a12",
    title: "Exporting attendance for payroll",
    category: "Data",
    tags: ["export", "attendance", "payroll", "csv"],
    views: 175,
    updatedAt: now - 15 * day,
    body: "Attendance → Reports → Export payroll produces a per-member CSV with total hours, late minutes, and branch breakdown, filterable by shift template.",
  },
];

function uptime(base = 0.995, drops: Record<number, number> = {}): number[] {
  const out: number[] = [];
  for (let i = 0; i < 90; i++) out.push(drops[i] ?? base + Math.random() * 0.005);
  return out.map((v) => Math.min(1, Math.max(0, v)));
}

const seedComponents: ComponentHealth[] = [
  { name: "API", description: "REST + tRPC gateway", status: "Operational", responseMs: 118, uptime90: uptime(0.999) },
  { name: "Web app", description: "Admin & member portal", status: "Operational", responseMs: 142, uptime90: uptime(0.998, { 12: 0.82, 41: 0.71 }) },
  { name: "Auth", description: "Sign-in, MFA, sessions", status: "Operational", responseMs: 96, uptime90: uptime(0.999) },
  { name: "Billing", description: "Stripe sync & invoicing", status: "Operational", responseMs: 210, uptime90: uptime(0.997, { 3: 0.62 }) },
  { name: "Notifications", description: "Email · SMS · WhatsApp", status: "Degraded", responseMs: 620, uptime90: uptime(0.992, { 0: 0.74, 1: 0.86 }) },
  { name: "Realtime", description: "WebSocket check-ins", status: "Operational", responseMs: 55, uptime90: uptime(0.999) },
  { name: "Storage", description: "Attachments & exports", status: "Operational", responseMs: 87, uptime90: uptime(0.999) },
];

const seedIncidents: Incident[] = [
  {
    id: "inc-042",
    title: "Delayed SMS delivery via Twilio APAC",
    severity: "minor",
    status: "Monitoring",
    components: ["Notifications"],
    startedAt: now - 3 * hour,
    updates: [
      { id: "u1", phase: "Investigating", body: "We're seeing 30–60s delivery delays for SMS destined for APAC numbers.", at: now - 3 * hour },
      { id: "u2", phase: "Identified", body: "Upstream carrier congestion at Twilio Singapore POP. Rerouting through Sydney.", at: now - 2 * hour },
      { id: "u3", phase: "Monitoring", body: "Reroute complete. Latencies back to baseline; monitoring for 2 hours.", at: now - 30 * 60_000 },
    ],
  },
  {
    id: "inc-041",
    title: "Scheduled: Database maintenance & failover drill",
    severity: "maintenance",
    status: "Scheduled",
    components: ["API", "Web app"],
    startedAt: now + 2 * day,
    updates: [
      { id: "u1", phase: "Investigating", body: "60-minute window; expected impact: <30s of read-only mode during failover.", at: now - 2 * day },
    ],
  },
  {
    id: "inc-040",
    title: "Billing invoice PDF generation errors",
    severity: "major",
    status: "Resolved",
    components: ["Billing"],
    startedAt: now - 6 * day,
    resolvedAt: now - 6 * day + 2 * hour,
    updates: [
      { id: "u1", phase: "Investigating", body: "Some invoices failing to render PDFs (5xx from renderer).", at: now - 6 * day },
      { id: "u2", phase: "Identified", body: "Font asset CDN cache miss. Warming caches now.", at: now - 6 * day + 40 * 60_000 },
      { id: "u3", phase: "Resolved", body: "All invoices re-rendered; back-queue drained.", at: now - 6 * day + 2 * hour },
    ],
  },
  {
    id: "inc-039",
    title: "Elevated 5xx on QR check-in endpoint",
    severity: "major",
    status: "Resolved",
    components: ["Realtime", "API"],
    startedAt: now - 21 * day,
    resolvedAt: now - 21 * day + 45 * 60_000,
    updates: [
      { id: "u1", phase: "Investigating", body: "Roughly 4% of check-in requests returning 502.", at: now - 21 * day },
      { id: "u2", phase: "Identified", body: "Bad deploy on the check-in worker; rolling back.", at: now - 21 * day + 15 * 60_000 },
      { id: "u3", phase: "Monitoring", body: "Rollback complete. Error rate < 0.1%.", at: now - 21 * day + 30 * 60_000 },
      { id: "u4", phase: "Resolved", body: "Root cause: race in seat lock cache. Fix queued for next release.", at: now - 21 * day + 45 * 60_000 },
    ],
  },
  {
    id: "inc-038",
    title: "Web app slow initial load in EU",
    severity: "minor",
    status: "Resolved",
    components: ["Web app"],
    startedAt: now - 41 * day,
    resolvedAt: now - 41 * day + 3 * hour,
    updates: [
      { id: "u1", phase: "Investigating", body: "TTFB spikes reported from EU users.", at: now - 41 * day },
      { id: "u2", phase: "Resolved", body: "Purged stale edge cache in FRA & AMS.", at: now - 41 * day + 3 * hour },
    ],
  },
];

// Reactive health/incident state (mutable, in-memory).
let componentsState: ComponentHealth[] = seedComponents.map((c) => ({ ...c, uptime90: [...c.uptime90] }));
let incidentsState: Incident[] = seedIncidents.map((i) => ({ ...i, updates: [...i.updates], components: [...i.components] }));
let lastSyncAt = Date.now();
let monitoringTicks: Record<string, number> = {};

const healthListeners = new Set<() => void>();
const incidentListeners = new Set<() => void>();
const syncListeners = new Set<() => void>();

function notifyHealth() {
  healthListeners.forEach((l) => l());
}
function notifyIncidents() {
  incidentListeners.forEach((l) => l());
}
function notifySync() {
  syncListeners.forEach((l) => l());
}

export function useHealth(): ComponentHealth[] {
  return useSyncExternalStore(
    (cb) => {
      healthListeners.add(cb);
      return () => healthListeners.delete(cb);
    },
    () => componentsState,
    () => componentsState,
  );
}

export function useIncidents(): Incident[] {
  return useSyncExternalStore(
    (cb) => {
      incidentListeners.add(cb);
      return () => incidentListeners.delete(cb);
    },
    () => incidentsState,
    () => incidentsState,
  );
}

export function useLastSync(): number {
  return useSyncExternalStore(
    (cb) => {
      syncListeners.add(cb);
      return () => syncListeners.delete(cb);
    },
    () => lastSyncAt,
    () => lastSyncAt,
  );
}

export type StatusEvent =
  | { kind: "component-changed"; name: string; from: ComponentHealth["status"]; to: ComponentHealth["status"] }
  | { kind: "incident-updated"; incidentId: string; phase: IncidentUpdate["phase"] }
  | { kind: "incident-resolved"; incidentId: string; title: string }
  | { kind: "incident-opened"; incidentId: string; title: string };

type RefreshResult = { events: StatusEvent[]; changed: boolean };

const STATUS_ROTATION: ComponentHealth["status"][] = ["Operational", "Degraded"];
const PHASE_ORDER: IncidentUpdate["phase"][] = ["Investigating", "Identified", "Monitoring", "Resolved"];

function nextPhase(current: IncidentUpdate["phase"]): IncidentUpdate["phase"] {
  const idx = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[Math.min(PHASE_ORDER.length - 1, idx + 1)];
}

function simulatedUptimeSample(status: ComponentHealth["status"]): number {
  switch (status) {
    case "Operational": return 0.998 + Math.random() * 0.002;
    case "Degraded": return 0.94 + Math.random() * 0.04;
    case "Partial Outage": return 0.82 + Math.random() * 0.08;
    case "Major Outage": return 0.4 + Math.random() * 0.3;
    case "Maintenance": return 0.99;
  }
}

/**
 * refreshStatus — simulates a poll cycle by mutating the in-memory health &
 * incident state slightly, then notifying listeners. Returns the events that
 * fired so the caller (UI) can surface toasts.
 */
export function refreshStatus(opts: { simulate?: boolean } = {}): RefreshResult {
  const simulate = opts.simulate ?? true;
  const events: StatusEvent[] = [];
  let healthChanged = false;
  let incidentsChanged = false;

  if (simulate) {
    // 1. Nudge latencies on every tick.
    componentsState = componentsState.map((c) => {
      const drift = Math.round((Math.random() - 0.5) * 20);
      const baseline = c.status === "Operational" ? 120 : c.status === "Degraded" ? 480 : 200;
      const nextMs = Math.max(30, Math.min(1500, c.responseMs + drift + (baseline - c.responseMs) * 0.05));
      return { ...c, responseMs: Math.round(nextMs) };
    });
    healthChanged = true;

    // 2. ~18% chance to flip one component's status (bounded so it recovers).
    if (Math.random() < 0.18) {
      const idx = Math.floor(Math.random() * componentsState.length);
      const target = componentsState[idx];
      const from = target.status;
      const to: ComponentHealth["status"] =
        from === "Operational"
          ? "Degraded"
          : STATUS_ROTATION[0]; // recover to Operational
      if (from !== to) {
        componentsState = componentsState.map((c, i) => (i === idx ? { ...c, status: to } : c));
        events.push({ kind: "component-changed", name: target.name, from, to });
      }
    }

    // 3. Roll a new uptime sample tied to each component's current status,
    //    keeping the 90-day window length constant.
    componentsState = componentsState.map((c) => {
      const nextSeries = [...c.uptime90.slice(1), simulatedUptimeSample(c.status)];
      return { ...c, uptime90: nextSeries };
    });

    // 4. Progress active incidents.
    incidentsState = incidentsState.map((inc) => {
      if (inc.status === "Resolved" || inc.status === "Scheduled") return inc;
      const lastPhase = inc.updates[inc.updates.length - 1]?.phase ?? "Investigating";

      // Track monitoring ticks so incidents in "Monitoring" eventually resolve.
      if (inc.status === "Monitoring") {
        monitoringTicks[inc.id] = (monitoringTicks[inc.id] ?? 0) + 1;
      }

      // ~10% chance to progress the phase, plus deterministic resolve after 3 monitoring ticks.
      const shouldAdvance =
        (inc.status === "Monitoring" && (monitoringTicks[inc.id] ?? 0) >= 3) || Math.random() < 0.1;
      if (!shouldAdvance) return inc;

      const phase = nextPhase(lastPhase);
      const newUpdate: IncidentUpdate = {
        id: `u${inc.updates.length + 1}`,
        phase,
        body: phaseBody(phase, inc.components[0]),
        at: Date.now(),
      };
      incidentsChanged = true;

      if (phase === "Resolved") {
        events.push({ kind: "incident-resolved", incidentId: inc.id, title: inc.title });
        delete monitoringTicks[inc.id];
        return {
          ...inc,
          status: "Resolved",
          resolvedAt: Date.now(),
          updates: [...inc.updates, newUpdate],
        };
      }

      const nextStatus: Incident["status"] =
        phase === "Identified" ? "Identified" : phase === "Monitoring" ? "Monitoring" : "Investigating";
      events.push({ kind: "incident-updated", incidentId: inc.id, phase });
      return { ...inc, status: nextStatus, updates: [...inc.updates, newUpdate] };
    });

    // 5. Small chance to open a new incident against a currently degraded component.
    const activeCount = incidentsState.filter((i) => i.status !== "Resolved" && i.status !== "Scheduled").length;
    if (activeCount === 0 && Math.random() < 0.06) {
      const degraded = componentsState.find((c) => c.status !== "Operational");
      const target = degraded ?? componentsState[Math.floor(Math.random() * componentsState.length)];
      const nextId = `inc-${100 + Math.floor(Math.random() * 900)}`;
      const opener: Incident = {
        id: nextId,
        title: `Elevated latency on ${target.name}`,
        severity: "minor",
        status: "Investigating",
        components: [target.name],
        startedAt: Date.now(),
        updates: [
          {
            id: "u1",
            phase: "Investigating",
            body: `Automated monitors detected elevated response times on ${target.name}. Team is investigating.`,
            at: Date.now(),
          },
        ],
      };
      incidentsState = [opener, ...incidentsState];
      incidentsChanged = true;
      events.push({ kind: "incident-opened", incidentId: opener.id, title: opener.title });
    }
  }

  lastSyncAt = Date.now();
  notifySync();
  if (healthChanged) notifyHealth();
  if (incidentsChanged) notifyIncidents();

  return { events, changed: healthChanged || incidentsChanged };
}

function phaseBody(phase: IncidentUpdate["phase"], component: string): string {
  switch (phase) {
    case "Investigating":
      return `Continuing to investigate reports affecting ${component}.`;
    case "Identified":
      return `Root cause identified on ${component}. Mitigation is being deployed.`;
    case "Monitoring":
      return `Mitigation applied to ${component}. Monitoring metrics to confirm recovery.`;
    case "Resolved":
      return `${component} is fully recovered. Marking this incident as resolved.`;
  }
}

const requesters = [
  { name: "Aarav Sharma", email: "aarav@meridian.edu" },
  { name: "Saanvi Iyer", email: "saanvi@meridian.edu" },
  { name: "Kabir Khan", email: "kabir@brightline.org" },
  { name: "Riya Patel", email: "riya@northpoint.edu" },
  { name: "Mira Chen", email: "mira@northpoint.edu" },
];

function seedTickets(): Ticket[] {
  return [
    {
      id: "TKT-1042",
      subject: "QR scanner intermittently fails at Branch 3",
      category: "Hardware",
      priority: "High",
      status: "Open",
      area: "Attendance",
      requester: requesters[0],
      assignee: "Priya M.",
      channel: "Portal",
      tags: ["hardware", "qr"],
      createdAt: now - 4 * hour,
      updatedAt: now - 40 * 60_000,
      slaDueAt: now + 3 * hour,
      linkedArticle: "a9",
      messages: [
        { id: "m1", author: "Aarav Sharma", role: "Member", body: "Our morning check-in kiosk is missing about 1 in 5 scans. Started yesterday afternoon.", at: now - 4 * hour },
        { id: "m2", author: "System", role: "System", body: "Auto-routed to Hardware queue.", at: now - 4 * hour + 60_000 },
        { id: "m3", author: "Priya M.", role: "Agent", body: "Thanks — can you share the kiosk device ID and firmware version from Settings → Hardware?", at: now - 3 * hour },
      ],
      notes: [
        { id: "n1", author: "Devon R.", body: "Similar report from Northpoint last month — check for firmware 4.2.1.", at: now - 2 * hour },
      ],
      transitions: [
        { id: "t1", to: "Open", by: "System", at: now - 4 * hour },
      ],
    },
    {
      id: "TKT-1041",
      subject: "Invoice total looks off for March",
      category: "Billing",
      priority: "Normal",
      status: "Pending",
      area: "Billing",
      requester: requesters[1],
      assignee: "Devon R.",
      channel: "Email",
      tags: ["billing", "invoice"],
      createdAt: now - 2 * day,
      updatedAt: now - 5 * hour,
      slaDueAt: now + day,
      messages: [
        { id: "m1", author: "Saanvi Iyer", role: "Member", body: "March invoice shows 42 members but we only had 38 active.", at: now - 2 * day },
        { id: "m2", author: "Devon R.", role: "Agent", body: "Looking into this — I'll audit the member events for March.", at: now - 30 * hour },
      ],
      notes: [],
      transitions: [
        { id: "t1", to: "Open", by: "System", at: now - 2 * day },
        { id: "t2", from: "Open", to: "Pending", by: "Devon R.", at: now - 30 * hour },
      ],
    },
    {
      id: "TKT-1040",
      subject: "Feature request: bulk export by branch",
      category: "Feature request",
      priority: "Low",
      status: "Open",
      area: "Reports",
      requester: requesters[2],
      assignee: "Unassigned",
      channel: "Portal",
      tags: ["feature", "export"],
      createdAt: now - 5 * day,
      updatedAt: now - 5 * day,
      slaDueAt: now + 10 * day,
      messages: [
        { id: "m1", author: "Kabir Khan", role: "Member", body: "Would love a per-branch export in the Reports section.", at: now - 5 * day },
      ],
      notes: [],
      transitions: [{ id: "t1", to: "Open", by: "System", at: now - 5 * day }],
    },
    {
      id: "TKT-1039",
      subject: "Can't sign in on mobile",
      category: "Account",
      priority: "Urgent",
      status: "Resolved",
      area: "Auth",
      requester: requesters[3],
      assignee: "Mei L.",
      channel: "Chat",
      tags: ["auth", "mobile"],
      createdAt: now - 6 * day,
      updatedAt: now - 5 * day,
      slaDueAt: now - 5 * day,
      messages: [
        { id: "m1", author: "Riya Patel", role: "Member", body: "Getting 'invalid credentials' on iOS but web works.", at: now - 6 * day },
        { id: "m2", author: "Mei L.", role: "Agent", body: "Reset your session token — try again now?", at: now - 6 * day + hour },
        { id: "m3", author: "Riya Patel", role: "Member", body: "That did it, thanks!", at: now - 5 * day - hour },
      ],
      notes: [],
      transitions: [
        { id: "t1", to: "Open", by: "System", at: now - 6 * day },
        { id: "t2", from: "Open", to: "Resolved", by: "Mei L.", at: now - 5 * day - hour },
      ],
    },
  ];
}

// ---------- persistence ----------

function loadJSON<T>(key: string, fallback: () => T): T {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      const v = fallback();
      window.localStorage.setItem(key, JSON.stringify(v));
      return v;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

let tickets: Ticket[] = loadJSON(K_TICKETS, seedTickets);
let drafts: TicketDraft[] = loadJSON(K_DRAFTS, () => []);
let subscriptions: Subscription[] = loadJSON(K_SUBS, () => []);

const ticketListeners = new Set<() => void>();
const draftListeners = new Set<() => void>();
const subListeners = new Set<() => void>();

function persistTickets() {
  if (typeof window !== "undefined") window.localStorage.setItem(K_TICKETS, JSON.stringify(tickets));
  ticketListeners.forEach((l) => l());
}
function persistDrafts() {
  if (typeof window !== "undefined") window.localStorage.setItem(K_DRAFTS, JSON.stringify(drafts));
  draftListeners.forEach((l) => l());
}
function persistSubs() {
  if (typeof window !== "undefined") window.localStorage.setItem(K_SUBS, JSON.stringify(subscriptions));
  subListeners.forEach((l) => l());
}

// ---------- ticket ops ----------

export function useTickets(): Ticket[] {
  return useSyncExternalStore(
    (cb) => {
      ticketListeners.add(cb);
      return () => ticketListeners.delete(cb);
    },
    () => tickets,
    () => tickets,
  );
}

export function createTicket(input: {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  area?: string;
  description: string;
  attachments?: TicketAttachment[];
  tags?: string[];
}): Ticket {
  const id = `TKT-${1043 + Math.floor(Math.random() * 900)}`;
  const at = Date.now();
  const requester = { name: "You (admin)", email: "you@meridian.edu" };
  const t: Ticket = {
    id,
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    status: "Open",
    area: input.area,
    requester,
    assignee: "Unassigned",
    channel: "Portal",
    tags: input.tags ?? [],
    createdAt: at,
    updatedAt: at,
    slaDueAt: at + slaHoursFor(input.priority) * hour,
    messages: [
      { id: `${id}-m1`, author: requester.name, role: "Member", body: input.description, at, attachments: input.attachments },
      { id: `${id}-m2`, author: "System", role: "System", body: `Ticket created via portal · ${input.category}`, at: at + 1000 },
    ],
    notes: [],
    transitions: [{ id: `${id}-t1`, to: "Open", by: "System", at }],
  };
  tickets = [t, ...tickets];
  persistTickets();
  return t;
}

function slaHoursFor(p: TicketPriority): number {
  switch (p) {
    case "Urgent": return 2;
    case "High": return 4;
    case "Normal": return 24;
    case "Low": return 72;
  }
}

export function addMessage(ticketId: string, body: string, attachments?: TicketAttachment[], author = "Priya M.", role: TicketMessage["role"] = "Agent") {
  tickets = tickets.map((t) =>
    t.id === ticketId
      ? {
          ...t,
          updatedAt: Date.now(),
          messages: [
            ...t.messages,
            { id: `${ticketId}-m${t.messages.length + 1}`, author, role, body, at: Date.now(), attachments },
          ],
        }
      : t,
  );
  persistTickets();
}

export function addInternalNote(ticketId: string, body: string, author = "Priya M.") {
  tickets = tickets.map((t) =>
    t.id === ticketId
      ? {
          ...t,
          updatedAt: Date.now(),
          notes: [...t.notes, { id: `${ticketId}-n${t.notes.length + 1}`, author, body, at: Date.now() }],
        }
      : t,
  );
  persistTickets();
}

export function setStatus(ticketId: string, next: TicketStatus, by = "Priya M.") {
  tickets = tickets.map((t) => {
    if (t.id !== ticketId) return t;
    if (t.status === next) return t;
    const at = Date.now();
    return {
      ...t,
      status: next,
      updatedAt: at,
      transitions: [
        ...t.transitions,
        { id: `${ticketId}-t${t.transitions.length + 1}`, from: t.status, to: next, by, at },
      ],
      messages: [
        ...t.messages,
        { id: `${ticketId}-m${t.messages.length + 1}`, author: "System", role: "System", body: `${by} changed status to ${next}.`, at: at + 500 },
      ],
    };
  });
  persistTickets();
}

export function setAssignee(ticketId: string, assignee: string) {
  tickets = tickets.map((t) =>
    t.id === ticketId
      ? {
          ...t,
          assignee,
          updatedAt: Date.now(),
          messages: [
            ...t.messages,
            { id: `${ticketId}-m${t.messages.length + 1}`, author: "System", role: "System", body: `Assigned to ${assignee}.`, at: Date.now() },
          ],
        }
      : t,
  );
  persistTickets();
}

export function setPriority(ticketId: string, priority: TicketPriority) {
  tickets = tickets.map((t) => (t.id === ticketId ? { ...t, priority, updatedAt: Date.now() } : t));
  persistTickets();
}

// ---------- drafts ----------

export function useDrafts(): TicketDraft[] {
  return useSyncExternalStore(
    (cb) => {
      draftListeners.add(cb);
      return () => draftListeners.delete(cb);
    },
    () => drafts,
    () => drafts,
  );
}

export function upsertDraft(d: TicketDraft) {
  const existing = drafts.find((x) => x.id === d.id);
  const next = { ...d, updatedAt: Date.now() };
  drafts = existing ? drafts.map((x) => (x.id === d.id ? next : x)) : [next, ...drafts];
  persistDrafts();
}

export function deleteDraft(id: string) {
  drafts = drafts.filter((d) => d.id !== id);
  persistDrafts();
}

// ---------- subscriptions ----------

export function useSubscriptions(): Subscription[] {
  return useSyncExternalStore(
    (cb) => {
      subListeners.add(cb);
      return () => subListeners.delete(cb);
    },
    () => subscriptions,
    () => subscriptions,
  );
}

export function addSubscription(s: Omit<Subscription, "createdAt">) {
  subscriptions = [{ ...s, createdAt: Date.now() }, ...subscriptions];
  persistSubs();
}

export function removeSubscription(target: string) {
  subscriptions = subscriptions.filter((s) => s.target !== target);
  persistSubs();
}

// ---------- utilities ----------

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const suffix = diff >= 0 ? " ago" : " from now";
  if (m < 1) return "just now";
  if (m < 60) return `${m}m${suffix}`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h${suffix}`;
  const d = Math.round(h / 24);
  return `${d}d${suffix}`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export { seedArticles as articles };
