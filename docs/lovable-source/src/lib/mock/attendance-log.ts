// Editable per-member attendance log with check-in / check-out times.
// Overrides are persisted in localStorage so edits survive reloads.

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDemoMemberAttendance, type AttendanceDay } from "@/lib/mock/members-demo";

export type DayStatus = "present" | "late" | "absent" | "holiday";

export type AttendanceRecord = {
  date: string;
  status: DayStatus;
  hours: number;
  checkIn?: string | null;  // "HH:MM"
  checkOut?: string | null; // "HH:MM"
};

const KEY = "sl.attendance.overrides.v1";

type Store = Record<string, Record<string, AttendanceRecord>>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(s: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota errors */
  }
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function minutesOf(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function hoursBetween(inT?: string | null, outT?: string | null) {
  const a = minutesOf(inT);
  const b = minutesOf(outT);
  if (a == null || b == null || b <= a) return 0;
  return Math.round(((b - a) / 60) * 10) / 10;
}

// Derive plausible default check-in / out from the seeded day
function withTimes(d: AttendanceDay): AttendanceRecord {
  if (d.status === "absent" || d.status === "holiday" || !d.hours) {
    return { ...d, status: d.status as DayStatus, checkIn: null, checkOut: null };
  }
  const startHour = d.status === "late" ? 10 : 8;
  const offset = (parseInt(d.date.slice(-2), 10) % 3) * 15;
  const startMin = startHour * 60 + offset;
  const endMin = Math.min(22 * 60, startMin + Math.round(d.hours * 60));
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return { ...d, status: d.status as DayStatus, checkIn: fmt(startMin), checkOut: fmt(endMin) };
}

export function useMemberAttendance(id: string, days = 90) {
  const base = useMemo(() => getDemoMemberAttendance(id, days).map(withTimes), [id, days]);
  const [overrides, setOverrides] = useState<Record<string, AttendanceRecord>>({});

  useEffect(() => {
    setOverrides(readStore()[id] ?? {});
  }, [id]);

  const records = useMemo(
    () => base.map((d) => (overrides[d.date] ? { ...d, ...overrides[d.date] } : d)),
    [base, overrides],
  );

  const persist = useCallback(
    (next: Record<string, AttendanceRecord>) => {
      setOverrides(next);
      const store = readStore();
      store[id] = next;
      writeStore(store);
    },
    [id],
  );

  const saveDay = useCallback(
    (rec: AttendanceRecord) => {
      persist({ ...overrides, [rec.date]: rec });
    },
    [overrides, persist],
  );

  const resetDay = useCallback(
    (date: string) => {
      const next = { ...overrides };
      delete next[date];
      persist(next);
    },
    [overrides, persist],
  );

  const today = useMemo(
    () =>
      records.find((r) => r.date === todayKey()) ?? {
        date: todayKey(),
        status: "absent" as DayStatus,
        hours: 0,
        checkIn: null,
        checkOut: null,
      },
    [records],
  );

  const checkIn = useCallback(() => {
    const t = nowTime();
    const late = (minutesOf(t) ?? 0) > 9 * 60 + 30;
    saveDay({ ...today, checkIn: t, checkOut: null, hours: 0, status: late ? "late" : "present" });
    return t;
  }, [today, saveDay]);

  const checkOut = useCallback(() => {
    const t = nowTime();
    const inT = today.checkIn ?? nowTime();
    saveDay({ ...today, checkIn: inT, checkOut: t, hours: hoursBetween(inT, t) });
    return t;
  }, [today, saveDay]);

  const editedCount = Object.keys(overrides).length;

  return { records, today, saveDay, resetDay, checkIn, checkOut, editedCount };
}
