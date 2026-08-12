// Shared demo dataset for the seats module — used when the backend
// is unauthenticated or returns no rows so pages remain interactive.
import { generateSeats } from "./data";
import type { Seat } from "./data";

export const DEMO_LIBRARIES = [
  { id: "demo_lib_1", name: "Central Reading Hall", branch: "Downtown", floor: 1 },
  { id: "demo_lib_2", name: "West Wing Study", branch: "Downtown", floor: 2 },
  { id: "demo_lib_3", name: "Silent Zone", branch: "Riverside", floor: 3 },
];

export const DEMO_SEATS_BY_LIB: Record<string, Seat[]> = {
  demo_lib_1: generateSeats(1, 80),
  demo_lib_2: generateSeats(2, 60),
  demo_lib_3: generateSeats(3, 40),
};

export const DEMO_ATTENDANCE_14D = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (13 - i));
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const present = Math.round((weekend ? 90 : 160) + Math.sin(i / 2) * 20);
  return { date: d.toISOString().slice(5, 10), present, late: Math.round(present * 0.08), absent: Math.max(0, 200 - present) };
});

export const DEMO_HEATMAP = (() => {
  const hours = Array.from({ length: 14 }, (_, i) => 7 + i); // 07:00 – 20:00
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data: { day: string; hour: number; value: number }[] = [];
  days.forEach((day, di) => {
    hours.forEach((h, hi) => {
      const peak = 1 - Math.abs(hi - 7) / 9;
      const weekend = di >= 5 ? 0.55 : 1;
      const noise = ((di * 13 + hi * 7) % 11) / 40;
      data.push({ day, hour: h, value: Math.max(0, Math.min(100, Math.round(peak * weekend * 92 - noise * 30))) });
    });
  });
  return { days, hours, data };
})();

// Deterministic live-activity feed for monitoring
export function buildActivityFeed(seats: Seat[], count = 12) {
  const verbs = ["checked in", "reserved", "released", "moved to"] as const;
  const names = ["Aarav Sharma", "Saanvi Iyer", "Kabir Rao", "Ishaan Reddy", "Meera Patel", "Vihaan Das", "Anaya Singh", "Rohan Menon"];
  return Array.from({ length: count }, (_, i) => {
    const s = seats[(i * 7) % seats.length];
    return {
      id: `act_${i}`,
      seat: s?.number ?? "—",
      section: s?.section ?? "A",
      actor: names[i % names.length],
      verb: verbs[i % verbs.length],
      minutesAgo: i * 3 + 1,
    };
  });
}
