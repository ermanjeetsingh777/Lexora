// Centralized typed mock data. Swap to real APIs by replacing this file.

export type SeatStatus = "available" | "occupied" | "reserved" | "maintenance";
export type MemberStatus = "Active" | "Inactive" | "Suspended";
export type Shift = "Morning" | "Afternoon" | "Evening" | "Night";

export interface Institution {
  id: string;
  name: string;
  type: "School" | "College" | "Library" | "CoachingCenter";
  city: string;
  country: string;
  branches: number;
  members: number;
  revenueMTD: number;
  occupancy: number;
  status: "Active" | "Inactive";
}

export interface Branch {
  id: string;
  institutionId: string;
  name: string;
  city: string;
  capacity: number;
  occupancy: number;
  libraries: number;
  members: number;
}

export interface Library {
  id: string;
  branchId: string;
  name: string;
  floor: number;
  capacity: number;
  occupied: number;
  status: "Active" | "Inactive" | "Maintenance";
  operatingStart: string;
  operatingEnd: string;
}


export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  shift: Shift;
  seatNumber: string | null;
  joinDate: string;
  institution: string;
  branch: string;
  library: string;
  plan: string;
  feesOwed: number;
  avatar: string;
}

export interface Seat {
  id: string;
  number: string;
  row: number;
  col: number;
  section: string;
  floor: number;
  status: SeatStatus;
  memberId: string | null;
  memberName: string | null;
  type: "Standard" | "Premium" | "Accessibility";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "destructive";
  timestamp: string;
  read: boolean;
  channel: "InApp" | "Email" | "SMS" | "Push";
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  billingCycle: "Monthly" | "Quarterly" | "Annually";
  price: number;
  features: string[];
  maxMembers: number;
  maxSeats: number;
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  status: "Paid" | "Pending" | "Failed" | "Refunded";
  method: "Card" | "UPI" | "Cash" | "Bank";
  date: string;
  invoiceId: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  copies: number;
  available: number;
  status: "Available" | "LowStock" | "OutOfStock";
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Locked" | "Inactive";
  lastLogin: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: "Open" | "Pending" | "Resolved";
  priority: "Low" | "Medium" | "High";
  updated: string;
  category: string;
}

// --- Generators ---

const FIRST = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Krishna","Ishaan","Rudra","Ananya","Aadhya","Diya","Saanvi","Myra","Aanya","Pari","Anika","Navya","Riya","Kabir","Aryan","Kavya","Ira","Zoya","Zayn","Eshan","Niharika","Tara","Veer"];
const LAST = ["Sharma","Verma","Patel","Iyer","Reddy","Khan","Singh","Kapoor","Gupta","Mehta","Joshi","Bansal","Nair","Pillai","Das","Bose","Roy","Ghosh","Menon","Chowdhury"];

function pick<T>(arr: T[], i: number) { return arr[i % arr.length]; }
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export const institutions: Institution[] = [
  { id: "inst_001", name: "Meridian Institute", type: "College", city: "Bengaluru", country: "India", branches: 4, members: 1280, revenueMTD: 482000, occupancy: 78, status: "Active" },
  { id: "inst_002", name: "Northpoint Academy", type: "CoachingCenter", city: "Mumbai", country: "India", branches: 3, members: 940, revenueMTD: 316500, occupancy: 65, status: "Active" },
  { id: "inst_003", name: "Brightline Library", type: "Library", city: "Delhi", country: "India", branches: 6, members: 2104, revenueMTD: 612300, occupancy: 84, status: "Active" },
  { id: "inst_004", name: "Polaris Study Hub", type: "CoachingCenter", city: "Hyderabad", country: "India", branches: 2, members: 510, revenueMTD: 184200, occupancy: 71, status: "Active" },
  { id: "inst_005", name: "Cascade Learning", type: "School", city: "Pune", country: "India", branches: 5, members: 1620, revenueMTD: 528700, occupancy: 69, status: "Inactive" },
  { id: "inst_006", name: "Aurora Scholars", type: "College", city: "Chennai", country: "India", branches: 3, members: 870, revenueMTD: 298400, occupancy: 73, status: "Active" },
  { id: "inst_007", name: "Sentinel Coaching", type: "CoachingCenter", city: "Kolkata", country: "India", branches: 4, members: 1140, revenueMTD: 365900, occupancy: 81, status: "Active" },
  { id: "inst_008", name: "Lotus Public Library", type: "Library", city: "Jaipur", country: "India", branches: 2, members: 640, revenueMTD: 158200, occupancy: 58, status: "Active" },
  { id: "inst_009", name: "Vega Academy", type: "School", city: "Ahmedabad", country: "India", branches: 3, members: 1020, revenueMTD: 342700, occupancy: 67, status: "Active" },
];

export const branches: Branch[] = institutions.flatMap((inst) =>
  Array.from({ length: inst.branches }, (_, i) => ({
    id: `${inst.id}_br_${i + 1}`,
    institutionId: inst.id,
    name: `${inst.name} — ${["Central","North","South","East","West","Tech Park"][i]} Campus`,
    city: inst.city,
    capacity: 120 + i * 40,
    occupancy: 40 + Math.round(Math.random() * 50),
    libraries: 2 + (i % 3),
    members: 180 + i * 60,
  }))
);

const LIBRARY_NAMES = [
  "Main Library", "Quiet Study Zone", "Reference Library", "Digital Learning Hub",
  "Reading Room", "Research Wing", "Collaboration Hall", "Archives & Journals",
  "Multimedia Lab", "Innovation Lounge", "Scholar's Corner", "Study Pods",
];
const LIBRARY_STATUS_ROTATION: Library["status"][] = ["Active", "Active", "Active", "Active", "Inactive", "Maintenance"];

export const libraries: Library[] = branches.flatMap((br, bi) =>
  Array.from({ length: br.libraries }, (_, i) => {
    const r = rng(bi * 100 + i);
    const capacity = 60 + i * 20 + Math.floor(r() * 20);
    const occupied = Math.min(capacity, 20 + Math.floor(r() * (capacity - 10)));
    return {
      id: `${br.id}_lib_${i + 1}`,
      branchId: br.id,
      name: `${LIBRARY_NAMES[i % LIBRARY_NAMES.length]}`,
      floor: i + 1,
      capacity,
      occupied,
      status: LIBRARY_STATUS_ROTATION[(bi + i) % LIBRARY_STATUS_ROTATION.length],
      operatingStart: "08:00",
      operatingEnd: (i % 4 === 0) ? "22:00" : "20:00",
    };
  })
);

export const members: Member[] = Array.from({ length: 64 }, (_, i) => {
  const r = rng(i + 7);
  const first = pick(FIRST, Math.floor(r() * 30));
  const last = pick(LAST, Math.floor(r() * 20));
  const statusRoll = r();
  const status: MemberStatus = statusRoll > 0.85 ? "Suspended" : statusRoll > 0.7 ? "Inactive" : "Active";
  const shift = (["Morning", "Afternoon", "Evening", "Night"] as Shift[])[i % 4];
  return {
    id: `mem_${String(i + 1).padStart(4, "0")}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${["meridian.edu","brightline.org","polaris.in","northpoint.edu"][i % 4]}`,
    phone: `+91 9${Math.floor(100000000 + r() * 899999999)}`,
    status,
    shift,
    seatNumber: status === "Active" ? `${["A","B","C","D"][i % 4]}-${String((i % 24) + 1).padStart(2, "0")}` : null,
    joinDate: new Date(2024, (i % 12), (i % 27) + 1).toISOString().slice(0, 10),
    institution: pick(institutions, i).name,
    branch: pick(branches, i).name,
    library: pick(libraries, i).name,
    plan: ["Annual Pro", "Quarterly", "Monthly", "Annual"][i % 4],
    feesOwed: status !== "Active" ? Math.round(r() * 8000) : 0,
    avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${first}+${last}&backgroundType=gradientLinear`,
  };
});

export function generateSeats(floor = 1, count = 60): Seat[] {
  const cols = 10;
  const sections = ["A", "B", "C", "D"];
  return Array.from({ length: count }, (_, i) => {
    const r = rng(floor * 1000 + i);
    const row = Math.floor(i / cols) + 1;
    const col = (i % cols) + 1;
    const roll = r();
    const status: SeatStatus =
      roll > 0.88 ? "maintenance" : roll > 0.72 ? "reserved" : roll > 0.32 ? "occupied" : "available";
    const memberIdx = Math.floor(r() * members.length);
    const m = members[memberIdx];
    const section = sections[Math.floor(i / (count / sections.length))];
    return {
      id: `f${floor}_s${i + 1}`,
      number: `${section}-${String(i + 1).padStart(2, "0")}`,
      row, col, section, floor, status,
      memberId: status === "occupied" || status === "reserved" ? m.id : null,
      memberName: status === "occupied" || status === "reserved" ? m.name : null,
      type: i % 13 === 0 ? "Accessibility" : i % 7 === 0 ? "Premium" : "Standard",
    };
  });
}

export const seats = generateSeats(1, 60);

export const notifications: Notification[] = [
  { id: "n1", title: "Fee reminder", message: "12 members have pending dues this week.", type: "warning", timestamp: "2m ago", read: false, channel: "InApp" },
  { id: "n2", title: "Seat A-14 reassigned", message: "Aarav Sharma moved to evening shift.", type: "info", timestamp: "18m ago", read: false, channel: "InApp" },
  { id: "n3", title: "Subscription renewed", message: "₹4,82,000 collected in renewals today.", type: "success", timestamp: "1h ago", read: true, channel: "Email" },
  { id: "n4", title: "Late arrival spike", message: "Morning shift late arrivals up 12%.", type: "destructive", timestamp: "3h ago", read: true, channel: "InApp" },
  { id: "n5", title: "Branch capacity 92%", message: "Brightline — South Campus nearing capacity.", type: "warning", timestamp: "Yesterday", read: true, channel: "Push" },
  { id: "n6", title: "Backup completed", message: "Nightly backup completed in 4m 12s.", type: "success", timestamp: "Yesterday", read: true, channel: "InApp" },
];

export const plans: SubscriptionPlan[] = [
  { id: "p_starter", name: "Starter", billingCycle: "Monthly", price: 1499, features: ["Up to 100 members","1 library","Email support"], maxMembers: 100, maxSeats: 80 },
  { id: "p_growth", name: "Growth", billingCycle: "Quarterly", price: 11999, features: ["Up to 500 members","3 libraries","Priority support","Analytics"], maxMembers: 500, maxSeats: 400 },
  { id: "p_pro", name: "Professional", billingCycle: "Annually", price: 39999, features: ["Up to 2,000 members","Unlimited libraries","Dedicated support","Advanced analytics","API access"], maxMembers: 2000, maxSeats: 1800 },
  { id: "p_enterprise", name: "Enterprise", billingCycle: "Annually", price: 119999, features: ["Unlimited members","Multi-tenant","SSO","Custom integrations","24/7 support"], maxMembers: 99999, maxSeats: 99999 },
];

export const payments: Payment[] = members.slice(0, 24).map((m, i) => ({
  id: `pay_${String(i + 1).padStart(4, "0")}`,
  memberId: m.id,
  memberName: m.name,
  amount: [1499, 3999, 11999, 999][i % 4],
  status: (["Paid", "Paid", "Pending", "Paid", "Failed", "Refunded"] as const)[i % 6],
  method: (["Card", "UPI", "Bank", "Cash"] as const)[i % 4],
  date: new Date(2025, 4, (i % 28) + 1).toISOString().slice(0, 10),
  invoiceId: `INV-2025-${String(1000 + i)}`,
}));

export const books: Book[] = [
  { id: "bk_1", title: "Atomic Habits", author: "James Clear", category: "Self-help", isbn: "9780735211292", copies: 12, available: 4, status: "LowStock" },
  { id: "bk_2", title: "Deep Work", author: "Cal Newport", category: "Productivity", isbn: "9781455586691", copies: 8, available: 0, status: "OutOfStock" },
  { id: "bk_3", title: "Clean Code", author: "Robert C. Martin", category: "Engineering", isbn: "9780132350884", copies: 15, available: 11, status: "Available" },
  { id: "bk_4", title: "The Pragmatic Programmer", author: "D. Thomas", category: "Engineering", isbn: "9780201616224", copies: 10, available: 7, status: "Available" },
  { id: "bk_5", title: "Sapiens", author: "Yuval Noah Harari", category: "History", isbn: "9780062316097", copies: 14, available: 2, status: "LowStock" },
  { id: "bk_6", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", category: "Psychology", isbn: "9780374533557", copies: 9, available: 6, status: "Available" },
  { id: "bk_7", title: "Designing Data-Intensive Apps", author: "Martin Kleppmann", category: "Engineering", isbn: "9781449373320", copies: 6, available: 1, status: "LowStock" },
  { id: "bk_8", title: "Educated", author: "Tara Westover", category: "Memoir", isbn: "9780399590504", copies: 11, available: 8, status: "Available" },
];

export const userAccounts: UserAccount[] = [
  { id: "u_1", name: "Aarav Sharma", email: "aarav@meridian.edu", role: "InstitutionAdmin", status: "Active", lastLogin: "5m ago" },
  { id: "u_2", name: "Saanvi Iyer", email: "saanvi@meridian.edu", role: "BranchAdmin", status: "Active", lastLogin: "32m ago" },
  { id: "u_3", name: "Kabir Khan", email: "kabir@brightline.org", role: "LibrarianAdmin", status: "Active", lastLogin: "2h ago" },
  { id: "u_4", name: "Riya Patel", email: "riya@northpoint.edu", role: "Librarian", status: "Locked", lastLogin: "3d ago" },
  { id: "u_5", name: "Ishaan Reddy", email: "ishaan@polaris.in", role: "BranchManager", status: "Active", lastLogin: "1h ago" },
  { id: "u_6", name: "Diya Nair", email: "diya@meridian.edu", role: "Teacher", status: "Inactive", lastLogin: "2w ago" },
];

export const tickets: Ticket[] = [
  { id: "TKT-1042", subject: "QR scanner not detecting member badge", status: "Open", priority: "High", updated: "12m ago", category: "Hardware" },
  { id: "TKT-1041", subject: "Bulk member upload validation error", status: "Pending", priority: "Medium", updated: "1h ago", category: "Data" },
  { id: "TKT-1040", subject: "Invoice template branding request", status: "Resolved", priority: "Low", updated: "Yesterday", category: "Billing" },
  { id: "TKT-1039", subject: "Add WhatsApp notifications", status: "Open", priority: "Medium", updated: "2d ago", category: "Feature" },
];

// Time series
export function revenueTrend(days = 30) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const base = 12000 + Math.sin(i / 4) * 3500 + i * 320;
    const noise = (Math.cos(i * 1.7) + 1) * 1800;
    return {
      date: d.toISOString().slice(5, 10),
      revenue: Math.round(base + noise),
      renewals: Math.round((base + noise) * 0.62),
    };
  });
}

export function occupancyTrend(days = 30) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const base = 62 + Math.sin(i / 3.5) * 14;
    const noise = (Math.cos(i * 2.1) + 1) * 6;
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? -10 : 0;
    return {
      date: d.toISOString().slice(5, 10),
      occupancy: Math.max(30, Math.min(98, Math.round(base + noise + weekend))),
    };
  });
}

export function attendanceTrend(days = 14) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const present = 220 + Math.round(Math.sin(i / 2) * 35 + Math.random() * 25);
    const late = Math.round(present * (0.06 + Math.random() * 0.05));
    return {
      date: d.toISOString().slice(5, 10),
      present, late, absent: 280 - present + late,
    };
  });
}

export function occupancyHeatmap() {
  // 7 days x 12 hours
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);
  const data: { day: string; hour: number; value: number }[] = [];
  days.forEach((day, di) => {
    hours.forEach((hour, hi) => {
      const peak = 1 - Math.abs(hi - 6) / 8;
      const weekend = di >= 5 ? 0.6 : 1;
      const v = Math.max(0, Math.round(peak * weekend * 100 - Math.random() * 18));
      data.push({ day, hour, value: v });
    });
  });
  return { days, hours, data };
}

export function attendanceCalendar(year: number, month: number) {
  // month is 0-indexed
  const first = new Date(year, month, 1);
  const daysIn = new Date(year, month + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const cells: { date: Date | null; value: number }[] = [];
  for (let i = 0; i < startDow; i++) cells.push({ date: null, value: 0 });
  for (let d = 1; d <= daysIn; d++) {
    const date = new Date(year, month, d);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const v = Math.max(0, Math.round((weekend ? 35 : 85) + Math.sin(d / 3) * 15 - Math.random() * 20));
    cells.push({ date, value: v });
  }
  return cells;
}

export const recentActivity = [
  { id: "a1", actor: "Saanvi Iyer", action: "checked in", target: "Seat A-14", time: "just now" },
  { id: "a2", actor: "System", action: "renewed subscription for", target: "Kabir Khan", time: "2m ago" },
  { id: "a3", actor: "Riya Patel", action: "added member", target: "Vihaan Joshi", time: "8m ago" },
  { id: "a4", actor: "Ishaan Reddy", action: "moved", target: "Seat B-22 → C-04", time: "14m ago" },
  { id: "a5", actor: "System", action: "flagged late arrival on", target: "morning shift", time: "32m ago" },
  { id: "a6", actor: "Aarav Sharma", action: "exported", target: "Monthly revenue report", time: "1h ago" },
  { id: "a7", actor: "System", action: "marked seat", target: "D-09 under maintenance", time: "2h ago" },
];
