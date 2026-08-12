// Lightweight in-memory audit log for the settings module.
// Pure client-side — survives navigation but not full reloads.
import { useSyncExternalStore } from "react";

export type SettingsAuditEntry = {
  id: string;
  ts: number;
  section: string;
  action: string;
  actor: string;
  detail?: string;
};

const KEY = "smartlibrary.settings.audit.v1";

function load(): SettingsAuditEntry[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seed();
  }
}

function seed(): SettingsAuditEntry[] {
  const now = Date.now();
  return [
    { id: "s1", ts: now - 1000 * 60 * 60 * 26, section: "Security", action: "Enabled 2FA enforcement", actor: "admin@meridian.edu" },
    { id: "s2", ts: now - 1000 * 60 * 60 * 8, section: "Branding", action: "Updated logo URL", actor: "ops@meridian.edu" },
    { id: "s3", ts: now - 1000 * 60 * 45, section: "API keys", action: "Rotated key “Production”", actor: "admin@meridian.edu" },
  ];
}

let entries: SettingsAuditEntry[] = load();
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  }
  listeners.forEach((l) => l());
}

export function logSettings(section: string, action: string, detail?: string, actor = "you@meridian.edu") {
  entries = [
    { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), section, action, actor, detail },
    ...entries,
  ].slice(0, 200);
  emit();
}

export function clearSettingsAudit() {
  entries = [];
  emit();
}

export function useSettingsAudit(): SettingsAuditEntry[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => entries,
    () => entries,
  );
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
