// Demo dataset for /members. Used to keep the list & detail interactive when
// the backend returns nothing.

export type DemoMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Suspended";
  shift: "Morning" | "Afternoon" | "Evening" | "Night";
  membership: "Basic" | "Plus" | "Pro" | "Annual";
  branch: string;
  library: string;
  seat: string;
  fees_owed: number;
  attendance_rate: number;
  join_date: string;
  plan_expiry: string;
  last_visit: string;
  visits_30d: number;
  avatar_hue: number;
};


const FIRST = ["Aarav","Saanvi","Kabir","Ishaan","Meera","Vihaan","Anaya","Rohan","Aditi","Arjun","Riya","Neha","Dev","Zara","Kiaan","Priya","Yash","Tanvi","Aryan","Nitya","Rehan","Isha","Vivaan","Diya","Karan","Sana","Aman","Nikhil","Pooja","Rahul","Simran","Tara"];
const LAST = ["Sharma","Iyer","Rao","Reddy","Patel","Das","Singh","Menon","Nair","Verma","Kapoor","Bose","Malhotra","Ahmed","Bhat","Joshi","Gupta","Shah","Khanna","Pillai","Qureshi","Chawla","Sethi","Roy"];
const SHIFTS = ["Morning","Afternoon","Evening","Night"] as const;
const STATUSES = ["Active","Active","Active","Active","Active","Inactive","Suspended"] as const;
const BRANCHES = ["Downtown","Riverside","North Park","East Campus"];
const LIBS = ["Central Reading Hall","West Wing Study","Silent Zone","Quiet Loft"];
const PLANS = ["Basic","Plus","Pro","Annual"] as const;

// Spread of expiry offsets (days from today) so the list shows expired,
// expiring-soon and healthy members side by side.
const EXPIRY_OFFSETS = [-62, 42, 5, 120, -9, 18, 2, 75, -1, 240, 6, 33, -25, 90, 7, 150, 12, 3];
// Members joined within the last 14 days read as "New".
const NEW_INDEXES = new Set([3, 11, 22, 30]);

const shiftDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const DEMO_MEMBERS: DemoMember[] = Array.from({ length: 36 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const surname = LAST[(i * 3) % LAST.length];
  const name = `${first} ${surname}`;
  const status = STATUSES[i % STATUSES.length];
  const joinYear = 2022 + (i % 4);
  const joinMonth = ((i * 5) % 12) + 1;
  const joinDay = ((i * 7) % 27) + 1;
  const lastVisitDaysAgo = (i * 3) % 20;
  const lastVisit = new Date();
  lastVisit.setDate(lastVisit.getDate() - lastVisitDaysAgo);
  const isNew = NEW_INDEXES.has(i);
  const joinDate = isNew
    ? shiftDays(-(1 + (i % 13)))
    : `${joinYear}-${joinMonth.toString().padStart(2, "0")}-${joinDay.toString().padStart(2, "0")}`;
  const expiryOffset = isNew ? 30 - (i % 13) : EXPIRY_OFFSETS[i % EXPIRY_OFFSETS.length];
  return {
    id: `demo_mem_${i + 1}`,
    name,
    email: `${first.toLowerCase()}.${LAST[(i * 3) % LAST.length].toLowerCase()}@mail.com`,
    phone: `+91 9${(1000000000 + i * 12345).toString().slice(0, 9)}`,
    status,
    shift: SHIFTS[i % 4],
    membership: PLANS[i % 4],
    branch: BRANCHES[i % BRANCHES.length],
    library: LIBS[i % LIBS.length],
    seat: `${String.fromCharCode(65 + (i % 4))}-${(i % 20) + 1}`,
    fees_owed: (i % 4 === 0 ? 0 : (i * 173) % 5200),
    attendance_rate: 55 + ((i * 11) % 44),
    join_date: joinDate,
    plan_expiry: shiftDays(expiryOffset),
    last_visit: lastVisit.toISOString().slice(0, 10),
    visits_30d: 4 + ((i * 7) % 24),
    avatar_hue: (i * 41) % 360,
  };
});

// ---------------- Membership lifecycle ----------------

export type LifecycleState = "New" | "Active" | "Expiring soon" | "Grace" | "Expired";
export type LifecycleTone = "success" | "warning" | "destructive" | "info" | "muted";

export type Lifecycle = {
  state: LifecycleState;
  tone: LifecycleTone;
  daysLeft: number;
  expiry: string;
  action: string | null;
  relative: string;
  needsAction: boolean;
};

export const LIFECYCLE_OPTS: LifecycleState[] = ["New", "Active", "Expiring soon", "Grace", "Expired"];

const dayDiff = (iso: string) => {
  const target = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export function memberLifecycle(m: {
  plan_expiry?: string;
  join_date?: string;
  fees_owed?: number;
  id?: string;
}): Lifecycle {
  const expiry = (m.id ? getRenewedExpiry(m.id) : null) ?? m.plan_expiry ?? shiftDays(30);
  const daysLeft = dayDiff(expiry);
  const joinedDaysAgo = m.join_date ? -dayDiff(m.join_date) : 999;
  const fees = Number(m.fees_owed ?? 0);

  let state: LifecycleState;
  if (daysLeft < 0 && daysLeft >= -7 && fees === 0) state = "Grace";
  else if (daysLeft < 0) state = "Expired";
  else if (joinedDaysAgo <= 14) state = "New";
  else if (daysLeft <= 7) state = "Expiring soon";
  else state = "Active";

  const action =
    state === "Expired" && fees > 0
      ? "Collect dues & renew"
      : state === "Expired"
        ? "Renew plan"
        : state === "Grace"
          ? "Renew within grace"
          : state === "Expiring soon"
            ? "Send renewal reminder"
            : state === "New"
              ? "Complete onboarding"
              : null;

  const tone: LifecycleTone =
    state === "Expired" ? "destructive"
      : state === "Grace" || state === "Expiring soon" ? "warning"
        : state === "New" ? "info"
          : "success";

  const relative =
    daysLeft === 0 ? "today"
      : daysLeft > 0 ? `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
        : `${Math.abs(daysLeft)} day${daysLeft === -1 ? "" : "s"} ago`;

  return { state, tone, daysLeft, expiry, action, relative, needsAction: action !== null };
}

// ---------------- Local renewals (persisted) ----------------

const RENEW_KEY = "members:renewals:v1";

function readRenewals(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(RENEW_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getRenewedExpiry(id: string): string | null {
  return readRenewals()[id] ?? null;
}

/** Computes the expiry date a renewal would produce, without persisting. */
export function previewRenewal(plan: string): { date: string; months: number } {
  const months = plan === "Annual" ? 12 : 1;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return { date: d.toISOString().slice(0, 10), months };
}

/** Extends the membership by one cycle from today and persists it locally. */
export function renewMember(id: string, plan: string): string {
  const next = previewRenewal(plan).date;

  const all = readRenewals();
  all[id] = next;
  try {
    localStorage.setItem(RENEW_KEY, JSON.stringify(all));
  } catch {}
  window.dispatchEvent(new Event("members:renewals"));
  return next;
}


export function getDemoMember(id: string) {
  return DEMO_MEMBERS.find(m => m.id === id) ?? DEMO_MEMBERS[0];
}

// Deterministic pseudo-random from string
function seed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export type AttendanceDay = { date: string; status: "present" | "absent" | "late" | "holiday"; hours: number };

export function getDemoMemberAttendance(id: string, days = 90): AttendanceDay[] {
  const rnd = seed(id);
  const today = new Date();
  const out: AttendanceDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dow = d.getDay();
    const r = rnd();
    let status: AttendanceDay["status"]; let hours = 0;
    if (dow === 0) { status = "holiday"; }
    else if (r < 0.72) { status = "present"; hours = 3 + Math.floor(rnd() * 6); }
    else if (r < 0.85) { status = "late"; hours = 2 + Math.floor(rnd() * 4); }
    else { status = "absent"; }
    out.push({ date: d.toISOString().slice(0, 10), status, hours });
  }
  return out;
}

export type DemoPayment = { id: string; date: string; amount: number; method: "Card" | "UPI" | "Cash" | "NetBanking"; status: "Paid" | "Pending" | "Failed" | "Refunded"; invoice: string };

export function getDemoMemberPayments(id: string): DemoPayment[] {
  const rnd = seed(id + "pay");
  const methods = ["Card", "UPI", "Cash", "NetBanking"] as const;
  const statuses = ["Paid","Paid","Paid","Paid","Pending","Failed","Refunded"] as const;
  const out: DemoPayment[] = [];
  const now = new Date();
  const count = 8 + Math.floor(rnd() * 5);
  for (let i = 0; i < count; i++) {
    const d = new Date(now); d.setMonth(now.getMonth() - i);
    out.push({
      id: `inv_${id.slice(-4)}_${i}`,
      invoice: `INV-${2025 - Math.floor(i/12)}-${String(1000 + Math.floor(rnd()*8999)).slice(0,4)}`,
      date: d.toISOString().slice(0, 10),
      amount: 800 + Math.floor(rnd() * 4200),
      method: methods[Math.floor(rnd() * methods.length)],
      status: statuses[Math.floor(rnd() * statuses.length)],
    });
  }
  return out;
}

export type ActivityEvent = { id: string; ts: string; type: "payment" | "attendance" | "plan" | "seat" | "note"; title: string; description?: string };

export function getDemoMemberActivity(id: string): ActivityEvent[] {
  const rnd = seed(id + "act");
  const templates: Array<Omit<ActivityEvent, "id" | "ts">> = [
    { type: "payment", title: "Payment received", description: "Monthly membership renewal" },
    { type: "attendance", title: "7-day attendance streak", description: "Consistent daily visits" },
    { type: "plan", title: "Plan upgraded", description: "Moved from Basic to Plus" },
    { type: "seat", title: "Seat reassigned", description: "Now at B-14 in Silent Zone" },
    { type: "note", title: "Staff note added", description: "Requested locker access" },
    { type: "attendance", title: "Marked late", description: "Arrived 25 mins after shift start" },
    { type: "payment", title: "Payment reminder sent", description: "Auto-email dispatched" },
    { type: "plan", title: "Add-on: Locker", description: "Locker #12 assigned" },
    { type: "attendance", title: "Missed 2 sessions", description: "Reason: personal leave" },
    { type: "note", title: "ID card reissued", description: "Reported lost on premises" },
    { type: "payment", title: "Refund processed", description: "Partial refund for downtime" },
    { type: "seat", title: "Preferred seat locked", description: "A-3 reserved permanently" },
  ];
  const out: ActivityEvent[] = [];
  const now = Date.now();
  for (let i = 0; i < 12; i++) {
    const t = templates[Math.floor(rnd() * templates.length)];
    const ts = new Date(now - Math.floor(rnd() * 90 * 86400_000)).toISOString();
    out.push({ id: `evt_${i}`, ts, ...t });
  }
  return out.sort((a, b) => b.ts.localeCompare(a.ts));
}

export type Guardian = { name: string; relation: string; phone: string; email: string; address: string; emergency: { name: string; relation: string; phone: string } };

export function getDemoMemberGuardian(id: string): Guardian {
  const m = getDemoMember(id);
  const rnd = seed(id + "g");
  const relations = ["Father", "Mother", "Uncle", "Guardian", "Sibling"];
  const emerRel = ["Sister", "Brother", "Cousin", "Neighbor", "Friend"];
  const surname = m.name.split(" ")[1] ?? "Sharma";
  return {
    name: `${["Rajesh","Sunita","Vikram","Priya","Manoj","Anita"][Math.floor(rnd()*6)]} ${surname}`,
    relation: relations[Math.floor(rnd() * relations.length)],
    phone: `+91 98${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`,
    email: `guardian.${surname.toLowerCase()}@mail.com`,
    address: `${100 + Math.floor(rnd() * 900)}, Sector ${5 + Math.floor(rnd() * 40)}, ${m.branch}`,
    emergency: {
      name: `${["Neha","Rohit","Kavya","Amit","Rhea"][Math.floor(rnd()*5)]} ${surname}`,
      relation: emerRel[Math.floor(rnd() * emerRel.length)],
      phone: `+91 97${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`,
    },
  };
}

export type BorrowedBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  borrowed: string;
  due: string;
  returned?: string;
  status: "Active" | "Returned" | "Overdue";
};

const BOOK_TITLES: Array<[string, string, string]> = [
  ["Deep Work", "Cal Newport", "Productivity"],
  ["Atomic Habits", "James Clear", "Self-help"],
  ["Sapiens", "Y. N. Harari", "History"],
  ["The Pragmatic Programmer", "D. Thomas", "Tech"],
  ["Clean Code", "Robert Martin", "Tech"],
  ["Thinking, Fast and Slow", "D. Kahneman", "Psychology"],
  ["Zero to One", "Peter Thiel", "Business"],
  ["The Almanack of Naval", "Eric Jorgenson", "Philosophy"],
  ["Meditations", "Marcus Aurelius", "Philosophy"],
  ["Educated", "Tara Westover", "Memoir"],
  ["A Brief History of Time", "S. Hawking", "Science"],
  ["Range", "David Epstein", "Psychology"],
  ["Ikigai", "H. García", "Self-help"],
  ["Man's Search for Meaning", "V. Frankl", "Psychology"],
];

export function getDemoMemberBooks(id: string): BorrowedBook[] {
  const rnd = seed(id + "books");
  const count = 4 + Math.floor(rnd() * 6);
  const out: BorrowedBook[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const [title, author, category] = BOOK_TITLES[Math.floor(rnd() * BOOK_TITLES.length)];
    const borrowedDaysAgo = 3 + Math.floor(rnd() * 120);
    const borrowed = new Date(now); borrowed.setDate(now.getDate() - borrowedDaysAgo);
    const due = new Date(borrowed); due.setDate(borrowed.getDate() + 14);
    let status: BorrowedBook["status"] = "Returned";
    let returned: string | undefined = new Date(due.getTime() - Math.floor(rnd() * 5) * 86400000).toISOString().slice(0, 10);
    if (i < 2) {
      status = due.getTime() < now.getTime() ? "Overdue" : "Active";
      returned = undefined;
    }
    out.push({
      id: `bk_${id.slice(-4)}_${i}`,
      title, author, category,
      borrowed: borrowed.toISOString().slice(0, 10),
      due: due.toISOString().slice(0, 10),
      returned, status,
    });
  }
  return out.sort((a, b) => b.borrowed.localeCompare(a.borrowed));
}

export type MemberInsights = {
  daysAsMember: number;
  monthlyFee: number;
  lifetimeSpend: number;
  nextRenewal: string;
  favoriteShift: string;
  favoriteCategory: string;
  punctualityScore: number;
};

export function getDemoMemberInsights(id: string): MemberInsights {
  const m = getDemoMember(id);
  const rnd = seed(id + "ins");
  const priceMap = { Basic: 799, Plus: 1499, Pro: 2499, Annual: 1999 } as const;
  const monthly = priceMap[m.membership];
  const joined = new Date(m.join_date);
  const days = Math.max(1, Math.floor((Date.now() - joined.getTime()) / 86400000));
  const renewal = new Date(); renewal.setDate(renewal.getDate() + 5 + Math.floor(rnd() * 25));
  const cats = ["Productivity", "Tech", "Philosophy", "Psychology", "Science", "Business"];
  return {
    daysAsMember: days,
    monthlyFee: monthly,
    lifetimeSpend: monthly * Math.max(1, Math.floor(days / 30)),
    nextRenewal: renewal.toISOString().slice(0, 10),
    favoriteShift: m.shift,
    favoriteCategory: cats[Math.floor(rnd() * cats.length)],
    punctualityScore: 70 + Math.floor(rnd() * 28),
  };
}
