// Deterministic per-branch mock data generators (no backend).
// All functions are seeded by a hash of branchId so values are stable.

import { branches as mockBranches, institutions as mockInstitutions, libraries as mockLibraries } from "@/lib/mock/data";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export type Status = "Active" | "Maintenance" | "Closed";

const MANAGERS = ["Priya Nair", "Rohan Kapoor", "Saanvi Iyer", "Aarav Sharma", "Ishita Bose", "Kabir Khan", "Diya Verma", "Vivaan Joshi", "Anika Reddy", "Veer Singh"];
const STAFF_NAMES = [
  "Aanya Gupta", "Arjun Mehta", "Neha Pillai", "Rahul Das", "Sneha Rao", "Karthik Menon",
  "Pooja Singh", "Vikram Patel", "Riya Joshi", "Sahil Khan", "Meera Iyer", "Aditya Verma",
];
const ROLES = ["Manager", "Asst. Manager", "Librarian", "Front Desk", "Security", "Janitor"];
const SHIFTS = ["Morning", "Afternoon", "Evening", "Night"] as const;
const STATUS_ROTATION: Status[] = ["Active", "Active", "Active", "Active", "Maintenance", "Active", "Closed"];

export interface BranchDetail {
  id: string;
  name: string;
  city: string;
  institutionId: string;
  institutionName: string;
  status: Status;
  capacity: number;
  occupancy: number;
  occupancyPct: number;
  libraries: number;
  members: number;
  manager: string;
  email: string;
  phone: string;
  address: string;
  hoursStart: string;
  hoursEnd: string;
  trend: number;
  openTickets: number;
  avgFootfall: number;
  lat: number;
  lng: number;
}

export function getBranchDetail(branchId: string): BranchDetail | null {
  const idx = mockBranches.findIndex((b) => b.id === branchId);
  if (idx === -1) return null;
  const b = mockBranches[idx];
  const inst = mockInstitutions.find((x) => x.id === b.institutionId);
  const occPct = Math.min(100, Math.round((b.occupancy / Math.max(1, b.capacity)) * 100 + 25));
  const r = rng(hash(branchId));
  return {
    id: b.id,
    name: b.name,
    city: b.city,
    institutionId: b.institutionId,
    institutionName: inst?.name ?? "—",
    status: STATUS_ROTATION[idx % STATUS_ROTATION.length],
    capacity: b.capacity,
    occupancy: Math.round((b.capacity * occPct) / 100),
    occupancyPct: occPct,
    libraries: b.libraries,
    members: b.members,
    manager: MANAGERS[idx % MANAGERS.length],
    email: `${b.name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}@smartlibrary.demo`.slice(0, 64),
    phone: `+91 ${(98000 + idx * 137).toString().slice(0, 5)} ${(40000 + idx * 91).toString().slice(0, 5)}`,
    address: `${100 + Math.floor(r() * 800)}, ${["MG Road", "Brigade Ave", "Park Street", "Marine Drive", "Civil Lines"][idx % 5]}, ${b.city}`,
    hoursStart: "08:00",
    hoursEnd: idx % 4 === 0 ? "22:00" : "20:00",
    trend: ((idx * 7) % 21) - 8,
    openTickets: Math.floor(r() * 8),
    avgFootfall: 180 + Math.floor(r() * 220),
    lat: 12 + r() * 16,
    lng: 72 + r() * 16,
  };
}

export function getBranchOccupancySeries(branchId: string, days = 14) {
  const r = rng(hash(branchId + ":occ"));
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const base = 55 + Math.sin(i / 2.5) * 18;
    const noise = r() * 12 - 6;
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? -8 : 0;
    return {
      date: d.toISOString().slice(5, 10),
      occupancy: Math.max(20, Math.min(98, Math.round(base + noise + weekend))),
      capacity: 100,
    };
  });
}

export function getBranchFootfallSeries(branchId: string) {
  const r = rng(hash(branchId + ":foot"));
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
    const weekend = i >= 5 ? 0.7 : 1;
    return {
      date: day,
      morning: Math.round((60 + r() * 40) * weekend),
      afternoon: Math.round((90 + r() * 50) * weekend),
      evening: Math.round((110 + r() * 60) * weekend),
      night: Math.round((30 + r() * 30) * weekend),
    };
  });
}

export function getBranchPeakHours(branchId: string) {
  const r = rng(hash(branchId + ":peak"));
  return Array.from({ length: 14 }, (_, i) => {
    const hour = 8 + i;
    const peak = 1 - Math.abs(i - 7) / 9;
    return {
      date: `${hour}:00`,
      checkins: Math.max(2, Math.round(peak * 80 + r() * 20)),
    };
  });
}

export function getBranchHeatmap(branchId: string) {
  const r = rng(hash(branchId + ":heat"));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);
  const data: { day: string; hour: number; value: number }[] = [];
  days.forEach((day, di) => {
    hours.forEach((_h, hi) => {
      const peak = 1 - Math.abs(hi - 6) / 8;
      const weekend = di >= 5 ? 0.6 : 1;
      const v = Math.max(0, Math.round(peak * weekend * 100 - r() * 18));
      data.push({ day, hour: hours[hi], value: v });
    });
  });
  return { days, hours, data };
}

export function getBranchStaff(branchId: string) {
  const r = rng(hash(branchId + ":staff"));
  const count = 6 + Math.floor(r() * 5);
  return Array.from({ length: count }, (_, i) => ({
    id: `${branchId}-staff-${i}`,
    name: STAFF_NAMES[(i + Math.floor(r() * 12)) % STAFF_NAMES.length],
    role: i === 0 ? "Manager" : ROLES[(i + 1) % ROLES.length],
    shift: SHIFTS[i % SHIFTS.length],
    onDuty: r() > 0.4,
    phone: `+91 9${Math.floor(100000000 + r() * 899999999)}`,
  }));
}

export function getBranchActivity(branchId: string) {
  const r = rng(hash(branchId + ":act"));
  const types = ["check-in", "booking", "alert", "payment"] as const;
  const actors = ["Saanvi Iyer", "Kabir Khan", "Diya Verma", "Aarav Sharma", "System", "Front Desk"];
  return Array.from({ length: 24 }, (_, i) => {
    const t = types[i % types.length];
    const minsAgo = i * (5 + Math.floor(r() * 12));
    return {
      id: `${branchId}-act-${i}`,
      type: t,
      actor: actors[Math.floor(r() * actors.length)],
      detail:
        t === "check-in" ? `Seat ${String.fromCharCode(65 + (i % 6))}-${10 + i}`
        : t === "booking" ? `Reserved seat for ${["2h", "4h", "Full day"][i % 3]}`
        : t === "alert" ? `${["High occupancy", "AC maintenance", "Low supplies"][i % 3]}`
        : `₹${(499 + (i % 6) * 200).toLocaleString()} subscription`,
      time: minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo / 60)}h ago`,
    };
  });
}

export function getBranchLibraries(branchId: string) {
  return mockLibraries.filter((l) => l.branchId === branchId);
}
