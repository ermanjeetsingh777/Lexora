// Shared demo dataset for the /attendance module.
// Keeps every attendance page interactive when the backend is unauthenticated
// or returns empty rows.

export type Shift = "Morning" | "Afternoon" | "Evening" | "Night";

export const SHIFT_WINDOWS: Record<Shift, string> = {
  Morning: "06:00 – 12:00",
  Afternoon: "12:00 – 17:00",
  Evening: "17:00 – 21:00",
  Night: "21:00 – 06:00",
};

const NAMES = [
  "Aarav Sharma", "Saanvi Iyer", "Kabir Rao", "Ishaan Reddy",
  "Meera Patel", "Vihaan Das", "Anaya Singh", "Rohan Menon",
  "Aditi Nair", "Arjun Verma", "Riya Kapoor", "Neha Bose",
  "Dev Malhotra", "Zara Ahmed", "Kiaan Bhat", "Priya Joshi",
  "Yash Gupta", "Tanvi Shah", "Aryan Khanna", "Nitya Pillai",
  "Rehan Qureshi", "Isha Chawla", "Vivaan Sethi", "Diya Roy",
];

const SHIFTS_ORDER: Shift[] = ["Morning", "Afternoon", "Evening", "Night"];

export const DEMO_ROSTER = NAMES.map((name, i) => ({
  id: `demo_m_${i + 1}`,
  name,
  shift: SHIFTS_ORDER[i % 4],
  seatNumber: `${String.fromCharCode(65 + (i % 4))}-${(i % 20) + 1}`,
  memberCode: `SL-${(1000 + i).toString()}`,
}));

// 30-day trend (present / late / absent)
export const DEMO_TREND_30D = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const base = weekend ? 90 : 180;
  const present = Math.round(base + Math.sin(i / 3) * 24 + ((i * 7) % 11));
  const capacity = 220;
  const late = Math.max(2, Math.round(present * 0.09 + ((i * 3) % 5)));
  const absent = Math.max(0, capacity - present);
  return {
    date: d.toISOString().slice(5, 10),
    fullDate: d.toISOString().slice(0, 10),
    present,
    late,
    absent,
  };
});

export const DEMO_TREND_14D = DEMO_TREND_30D.slice(-14);

// Deterministic live feed
export function buildDemoLiveFeed(count = 14) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const m = DEMO_ROSTER[(i * 3) % DEMO_ROSTER.length];
    const minutes = i * 2 + 1;
    return {
      id: `live_${i}`,
      name: m.name,
      seatNumber: m.seatNumber,
      shift: m.shift,
      dir: (i % 4 === 0 ? "out" : "in") as "in" | "out",
      time: minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`,
      ts: now - minutes * 60_000,
    };
  });
}

// Scanner recent scans (mock)
export const DEMO_RECENT_SCANS = Array.from({ length: 8 }, (_, i) => {
  const m = DEMO_ROSTER[(i * 5) % DEMO_ROSTER.length];
  return {
    id: `scan_${i}`,
    name: m.name,
    code: m.memberCode,
    method: i % 3 === 0 ? "RFID" : "QR",
    dir: (i % 2 === 0 ? "in" : "out") as "in" | "out",
    seatNumber: m.seatNumber,
    minutesAgo: i * 2 + 1,
  };
});

export const DEMO_HOURLY_TODAY = Array.from({ length: 14 }, (_, i) => {
  const hour = 7 + i;
  const peak = 1 - Math.abs(hour - 15) / 10;
  const value = Math.max(4, Math.round(peak * 90 + ((i * 3) % 7)));
  return { hour, label: `${hour}:00`, checkins: value };
});

export function peakHourLabel() {
  const top = [...DEMO_HOURLY_TODAY].sort((a, b) => b.checkins - a.checkins)[0];
  return `${top.hour}:00 – ${top.hour + 1}:00`;
}
