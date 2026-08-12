import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import {
  ScanLine, QrCode, Radio, Camera, CheckCircle2, XCircle, LogIn, LogOut,
  Volume2, VolumeX, Search, Download, Wifi, WifiOff, Clock, Users, Repeat,
  Keyboard, Trophy, DoorOpen, TrendingUp, AlertTriangle, Zap, Filter, X, CalendarRange,
} from "lucide-react";
import { DEMO_RECENT_SCANS, DEMO_ROSTER } from "@/lib/mock/attendance-demo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendance/scanner")({
  head: () => ({ meta: [{ title: "QR scanner — SmartLibrary" }] }),
  component: ScannerPage,
});

type Scan = {
  id: string; name: string; code: string; method: string;
  dir: "in" | "out"; seatNumber: string | null; minutesAgo: number;
  timestamp: number; gate: string; latencyMs: number; shift?: string;
};

const GATES = ["Gate A · Main", "Gate B · Rear", "Gate C · Library Hall", "Turnstile 1"] as const;
const DUP_WINDOW_MS = 30_000;

function beep(freq = 880, ms = 90) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = freq; o.type = "sine";
    g.gain.value = 0.05; o.connect(g); g.connect(ctx.destination);
    o.start(); setTimeout(() => { o.stop(); ctx.close(); }, ms);
  } catch {}
}

function ScannerPage() {
  const [mode, setMode] = useState<"QR" | "RFID">("QR");
  const [cameraOn, setCameraOn] = useState(true);
  const [manualId, setManualId] = useState("");
  const [manualDir, setManualDir] = useState<"auto" | "in" | "out">("auto");
  const [gate, setGate] = useState<string>(GATES[0]);
  const [sound, setSound] = useState(true);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [scans, setScans] = useState<Scan[]>(() =>
    (DEMO_RECENT_SCANS as any[]).map((s, i) => ({
      ...s, timestamp: Date.now() - (i + 1) * 60_000,
      gate: GATES[i % GATES.length], latencyMs: 60 + ((i * 17) % 120),
      shift: DEMO_ROSTER.find(r => r.memberCode === s.code)?.shift,
    }))
  );
  const [failed, setFailed] = useState(0);
  const [duplicates, setDuplicates] = useState(0);
  const [query, setQuery] = useState("");
  const [dirFilter, setDirFilter] = useState<"all" | "in" | "out">("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [gateFilter, setGateFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [seatQuery, setSeatQuery] = useState("");
  const [latencyMax, setLatencyMax] = useState<string>("");
  const [rangePreset, setRangePreset] = useState<"all" | "15m" | "1h" | "today" | "custom">("all");
  const [fromTs, setFromTs] = useState<string>(""); // datetime-local
  const [toTs, setToTs] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [lastScan, setLastScan] = useState<Scan | null>(scans[0] ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const memberDir = useRef<Map<string, "in" | "out">>(new Map());
  const lastScanTime = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    for (const s of [...scans].reverse()) memberDir.current.set(s.code, s.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push a scan (with duplicate check & offline queue)
  const pushScan = (member: typeof DEMO_ROSTER[number], method: string, forceDir?: "in" | "out") => {
    const now = Date.now();
    const prevTs = lastScanTime.current.get(member.memberCode) ?? 0;
    const prevDir = memberDir.current.get(member.memberCode);
    const nextDir: "in" | "out" = forceDir ?? (prevDir === "in" ? "out" : "in");
    if (now - prevTs < DUP_WINDOW_MS && prevDir === nextDir) {
      setDuplicates(d => d + 1);
      toast.warning(`Duplicate scan ignored`, { description: `${member.name} scanned ${Math.round((now - prevTs) / 1000)}s ago` });
      if (sound) beep(220, 120);
      return;
    }
    if (!online) {
      setQueued(q => q + 1);
      toast("Queued (offline)", { description: `${member.name} · will sync when online` });
      return;
    }
    const scan: Scan = {
      id: `scan_${now}`,
      name: member.name, code: member.memberCode, method,
      dir: nextDir, seatNumber: member.seatNumber, minutesAgo: 0,
      timestamp: now, gate, latencyMs: 40 + Math.floor(Math.random() * 180),
      shift: member.shift,
    };
    memberDir.current.set(member.memberCode, nextDir);
    lastScanTime.current.set(member.memberCode, now);
    setScans(s => [scan, ...s].slice(0, 40));
    setLastScan(scan);
    if (sound) beep(nextDir === "in" ? 880 : 660, 90);
    toast.success(`${member.name} ${nextDir === "in" ? "checked in" : "checked out"}`, {
      description: `${member.memberCode} · Seat ${member.seatNumber} · ${gate}`,
    });
  };

  // Auto scan simulation
  useEffect(() => {
    if (!cameraOn) return;
    const id = setInterval(() => {
      const m = DEMO_ROSTER[Math.floor(Math.random() * DEMO_ROSTER.length)];
      pushScan(m, mode);
    }, 7000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, mode, gate, sound, online]);

  // Flush queued when reconnecting
  useEffect(() => {
    if (online && queued > 0) {
      const n = queued;
      setQueued(0);
      toast.success(`Synced ${n} queued scan${n === 1 ? "" : "s"}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") { e.preventDefault(); inputRef.current?.focus(); }
      else if (e.key === "c" || e.key === "C") setCameraOn(v => !v);
      else if (e.key === "m" || e.key === "M") setSound(v => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleManual = () => {
    const code = manualId.trim().toUpperCase();
    if (!code) return;
    const m = DEMO_ROSTER.find(r => r.memberCode.toUpperCase() === code);
    if (!m) {
      setFailed(f => f + 1);
      toast.error("Unknown member ID", { description: code });
      if (sound) beep(180, 180);
      setManualId("");
      return;
    }
    pushScan(m, "Manual", manualDir === "auto" ? undefined : manualDir);
    setManualId("");
  };

  // Derived stats
  const ins = scans.filter(s => s.dir === "in").length;
  const outs = scans.filter(s => s.dir === "out").length;
  const uniqueMembers = new Set(scans.map(s => s.code)).size;
  const avgLatency = scans.length ? Math.round(scans.reduce((a, b) => a + b.latencyMs, 0) / scans.length) : 0;
  const insideNow = useMemo(() => {
    const last = new Map<string, "in" | "out">();
    for (const s of [...scans].reverse()) last.set(s.code, s.dir);
    return [...last.values()].filter(d => d === "in").length;
  }, [scans]);

  // Hourly bucket of session
  const hourly = useMemo(() => {
    const buckets = new Map<number, { in: number; out: number }>();
    for (const s of scans) {
      const h = new Date(s.timestamp).getHours();
      const b = buckets.get(h) ?? { in: 0, out: 0 };
      b[s.dir]++; buckets.set(h, b);
    }
    return [...buckets.entries()].map(([h, v]) => ({ h, ...v })).sort((a, b) => a.h - b.h);
  }, [scans]);
  const hourlyMax = Math.max(1, ...hourly.map(h => h.in + h.out));

  // Top scanned members
  const top = useMemo(() => {
    const map = new Map<string, { name: string; code: string; count: number; seat: string | null }>();
    for (const s of scans) {
      const cur = map.get(s.code) ?? { name: s.name, code: s.code, count: 0, seat: s.seatNumber };
      cur.count++; map.set(s.code, cur);
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [scans]);

  // Filtered
  const methods = useMemo(() => ["all", ...new Set(scans.map(s => s.method))], [scans]);
  const shifts = useMemo(() => ["all", ...new Set(scans.map(s => s.shift).filter(Boolean) as string[])], [scans]);

  const range = useMemo(() => {
    const now = Date.now();
    if (rangePreset === "15m") return { from: now - 15 * 60_000, to: now };
    if (rangePreset === "1h") return { from: now - 60 * 60_000, to: now };
    if (rangePreset === "today") {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      return { from: d.getTime(), to: now };
    }
    if (rangePreset === "custom") {
      return {
        from: fromTs ? new Date(fromTs).getTime() : -Infinity,
        to: toTs ? new Date(toTs).getTime() : Infinity,
      };
    }
    return { from: -Infinity, to: Infinity };
  }, [rangePreset, fromTs, toTs]);

  const filtered = useMemo(() => scans.filter(s =>
    (dirFilter === "all" || s.dir === dirFilter) &&
    (methodFilter === "all" || s.method === methodFilter) &&
    (gateFilter === "all" || s.gate === gateFilter) &&
    (shiftFilter === "all" || s.shift === shiftFilter) &&
    (seatQuery === "" || (s.seatNumber ?? "").toLowerCase().includes(seatQuery.toLowerCase())) &&
    (latencyMax === "" || s.latencyMs <= Number(latencyMax)) &&
    (s.timestamp >= range.from && s.timestamp <= range.to) &&
    (query === "" || s.name.toLowerCase().includes(query.toLowerCase()) || s.code.toLowerCase().includes(query.toLowerCase()))
  ), [scans, dirFilter, methodFilter, gateFilter, shiftFilter, seatQuery, latencyMax, range, query]);

  const activeFilterCount =
    (dirFilter !== "all" ? 1 : 0) + (methodFilter !== "all" ? 1 : 0) +
    (gateFilter !== "all" ? 1 : 0) + (shiftFilter !== "all" ? 1 : 0) +
    (seatQuery ? 1 : 0) + (latencyMax ? 1 : 0) + (rangePreset !== "all" ? 1 : 0);

  const clearFilters = () => {
    setDirFilter("all"); setMethodFilter("all"); setGateFilter("all"); setShiftFilter("all");
    setSeatQuery(""); setLatencyMax(""); setRangePreset("all"); setFromTs(""); setToTs("");
    setQuery("");
  };

  const exportCsv = () => {
    const rows = [
      ["Timestamp", "Name", "Member Code", "Method", "Direction", "Seat", "Gate", "Shift", "Latency (ms)"],
      ...filtered.map(s => [new Date(s.timestamp).toISOString(), s.name, s.code, s.method, s.dir, s.seatNumber ?? "", s.gate, s.shift ?? "", s.latencyMs.toString()]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `scans-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} scans`);
  };

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <>
      <PageHeader
        eyebrow="Attendance"
        title="QR / RFID scanner"
        description="Point the camera at a member badge or enter a member ID. Duplicate scans are auto-blocked."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={gate} onChange={e => setGate(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {GATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div className="inline-flex rounded-md border bg-muted/40 p-1">
              {(["QR", "RFID"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn("px-3 py-1 text-xs rounded-md font-medium inline-flex items-center gap-1",
                    mode === m ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  {m === "QR" ? <QrCode className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />} {m}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => setSound(v => !v)} title="Mute/unmute (M)">
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOnline(v => !v)} title="Toggle network">
              {online ? <><Wifi className="h-4 w-4 mr-1 text-emerald-500" /> Online</> : <><WifiOff className="h-4 w-4 mr-1 text-rose-500" /> Offline</>}
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total scans" value={scans.length} icon={<ScanLine className="h-4 w-4" />} />
        <KpiCard label="Check-ins" value={ins} icon={<LogIn className="h-4 w-4 text-emerald-500" />} />
        <KpiCard label="Check-outs" value={outs} icon={<LogOut className="h-4 w-4 text-muted-foreground" />} />
        <KpiCard label="Inside now" value={insideNow} icon={<Users className="h-4 w-4 text-primary" />} />
        <KpiCard label="Duplicates blocked" value={duplicates} icon={<Repeat className="h-4 w-4 text-amber-500" />} />
        <KpiCard label="Avg latency" value={`${avgLatency}ms`} icon={<Zap className="h-4 w-4 text-violet-500" />} />
      </section>

      {queued > 0 && (
        <GlassCard className="p-3 flex items-center gap-3 border-amber-500/40 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <div className="text-sm flex-1"><span className="font-medium">{queued}</span> scan{queued === 1 ? "" : "s"} queued locally — will sync when back online.</div>
          <Button size="sm" variant="outline" onClick={() => setOnline(true)}>Reconnect</Button>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <div className="space-y-4">
          <GlassCard className="p-6 flex flex-col items-center text-center">
            <div className="w-full flex items-center justify-between mb-3">
              <div className="text-xs label-mono flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" /> {gate}</div>
              <div className={cn("text-[10px] px-1.5 py-0.5 rounded-full", cameraOn ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground")}>
                {cameraOn ? "● LIVE" : "○ PAUSED"}
              </div>
            </div>
            <div className={cn(
              "relative h-56 w-56 rounded-xl border-2 border-dashed bg-muted/30 grid place-items-center overflow-hidden",
              cameraOn ? "border-primary/60" : "border-border"
            )}>
              {cameraOn && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary shadow-[0_0_12px_var(--primary)]"
                  style={{ animation: "scan 2.4s ease-in-out infinite" }} />
              )}
              {mode === "QR"
                ? <QrCode className={cn("h-20 w-20", cameraOn ? "text-primary/70" : "text-muted-foreground/50")} />
                : <Radio className={cn("h-20 w-20", cameraOn ? "text-primary/70" : "text-muted-foreground/50")} />}
              <style>{`@keyframes scan { 0%,100% { transform: translateY(0) } 50% { transform: translateY(224px) } }`}</style>
            </div>
            <div className="mt-4">
              <div className="font-semibold text-sm">{cameraOn ? `Waiting for ${mode} scan…` : "Scanner paused"}</div>
              <p className="text-xs text-muted-foreground">Press <kbd className="px-1 py-0.5 border rounded text-[10px]">/</kbd> to focus, <kbd className="px-1 py-0.5 border rounded text-[10px]">C</kbd> to toggle camera</p>
            </div>

            <div className="mt-4 w-full space-y-2">
              <div className="inline-flex rounded-md border bg-muted/40 p-1 w-full">
                {(["auto", "in", "out"] as const).map(d => (
                  <button key={d} onClick={() => setManualDir(d)} className={cn(
                    "flex-1 px-2 py-1 text-xs rounded-md capitalize",
                    manualDir === d ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}>{d === "auto" ? "Auto" : d === "in" ? "Force In" : "Force Out"}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input ref={inputRef} value={manualId} onChange={e => setManualId(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleManual()}
                  placeholder="SL-1000" className="h-9 font-mono" />
                <Button onClick={handleManual}><ScanLine className="h-4 w-4 mr-1" /> Submit</Button>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setCameraOn(c => !c)}>
                <Camera className="h-4 w-4 mr-1" /> {cameraOn ? "Stop camera" : "Start camera"}
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionHeader title="Last scan" description={lastScan ? fmtTime(lastScan.timestamp) : "—"} />
            {lastScan ? (
              <div className="flex items-center gap-3 mt-2">
                <Avatar className="h-14 w-14"><AvatarFallback className="text-sm">{lastScan.name.split(" ").map(p => p[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{lastScan.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{lastScan.code} · Seat {lastScan.seatNumber} · {lastScan.shift ?? "—"}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={lastScan.dir === "in" ? "In" : "Out"} variant={lastScan.dir === "in" ? "success" : "muted"} />
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/50">{lastScan.method}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/50">{lastScan.gate}</span>
                    <span className="text-[10px] label-mono">{lastScan.latencyMs}ms</span>
                  </div>
                </div>
                {lastScan.dir === "in" ? <LogIn className="h-6 w-6 text-emerald-500" /> : <LogOut className="h-6 w-6 text-muted-foreground" />}
              </div>
            ) : <div className="py-6 text-center text-sm text-muted-foreground">No scans yet</div>}
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <SectionHeader title="Hourly activity" description="Check-ins vs check-outs this session" />
            {hourly.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Waiting for data…</div>
            ) : (
              <div className="mt-3 flex items-end gap-1.5 h-32">
                {hourly.map(h => {
                  const total = h.in + h.out;
                  return (
                    <div key={h.h} className="flex-1 flex flex-col items-center gap-1" title={`${h.h}:00 — ${h.in} in / ${h.out} out`}>
                      <div className="w-full flex flex-col justify-end h-24">
                        <div className="w-full bg-muted-foreground/40 rounded-t-sm" style={{ height: `${(h.out / hourlyMax) * 100}%` }} />
                        <div className="w-full bg-emerald-500 rounded-t-sm" style={{ height: `${(h.in / hourlyMax) * 100}%` }} />
                      </div>
                      <div className="label-mono text-[9px]">{String(h.h).padStart(2, "0")}</div>
                      <div className="text-[9px] tabular-nums text-muted-foreground">{total}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" /> In</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-muted-foreground/40" /> Out</span>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <SectionHeader title="Top scanned this session" description="Most-active members" />
            {top.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">—</div>
            ) : (
              <ul className="space-y-2 mt-2">
                {top.map((t, i) => (
                  <li key={t.code} className="flex items-center gap-3">
                    <span className="w-5 label-mono text-center">{i + 1}</span>
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{t.name.split(" ").map(p => p[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{t.code} · Seat {t.seat}</div>
                    </div>
                    <span className="text-xs tabular-nums font-semibold">{t.count}×</span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <SectionHeader title="Scan log" description={`${filtered.length} of ${scans.length} scans`} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-7 h-8 w-48" placeholder="Search name or code" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
              {(["all", "in", "out"] as const).map(d => (
                <button key={d} onClick={() => setDirFilter(d)} className={cn(
                  "px-2 py-1 text-xs rounded-md capitalize",
                  dirFilter === d ? "bg-background shadow-sm" : "text-muted-foreground"
                )}>{d}</button>
              ))}
            </div>
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5" title="Date range">
              {([
                { k: "all", l: "All" },
                { k: "15m", l: "15m" },
                { k: "1h", l: "1h" },
                { k: "today", l: "Today" },
                { k: "custom", l: "Custom" },
              ] as const).map(r => (
                <button key={r.k} onClick={() => setRangePreset(r.k)} className={cn(
                  "px-2 py-1 text-xs rounded-md inline-flex items-center gap-1",
                  rangePreset === r.k ? "bg-background shadow-sm" : "text-muted-foreground"
                )}>
                  {r.k === "all" && <CalendarRange className="h-3 w-3" />} {r.l}
                </button>
              ))}
            </div>
            <Button size="sm" variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(v => !v)}>
              <Filter className="h-3.5 w-3.5 mr-1" /> More
              {activeFilterCount > 0 && <span className="ml-1 text-[10px] px-1 rounded bg-primary/20">{activeFilterCount}</span>}
            </Button>
            {activeFilterCount > 0 && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          </div>
        </div>

        {(showFilters || rangePreset === "custom") && (
          <div className="mb-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-3 rounded-md border bg-muted/20">
            {rangePreset === "custom" && (
              <>
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">From</span>
                  <Input type="datetime-local" value={fromTs} onChange={e => setFromTs(e.target.value)} className="h-8" />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">To</span>
                  <Input type="datetime-local" value={toTs} onChange={e => setToTs(e.target.value)} className="h-8" />
                </label>
              </>
            )}
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Method</span>
              <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
                {methods.map(m => <option key={m} value={m}>{m === "all" ? "All methods" : m}</option>)}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Gate</span>
              <select value={gateFilter} onChange={e => setGateFilter(e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
                <option value="all">All gates</option>
                {GATES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Shift</span>
              <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
                {shifts.map(s => <option key={s} value={s}>{s === "all" ? "All shifts" : s}</option>)}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Seat contains</span>
              <Input value={seatQuery} onChange={e => setSeatQuery(e.target.value)} placeholder="A-3" className="h-8" />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Max latency (ms)</span>
              <Input type="number" value={latencyMax} onChange={e => setLatencyMax(e.target.value)} placeholder="Any" className="h-8" />
            </label>
          </div>
        )}


        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-y label-mono bg-muted/30">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-2 py-2 font-medium">Member</th>
                <th className="px-2 py-2 font-medium">Code</th>
                <th className="px-2 py-2 font-medium">Method</th>
                <th className="px-2 py-2 font-medium">Direction</th>
                <th className="px-2 py-2 font-medium">Seat</th>
                <th className="px-2 py-2 font-medium">Gate</th>
                <th className="px-4 py-2 font-medium text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No scans match</td></tr>}
              {filtered.map(s => (
                <tr key={s.id} className={cn("hover:bg-muted/40 animate-in fade-in-50", s.id === lastScan?.id && "bg-primary/5")}>
                  <td className="px-4 py-2 label-mono whitespace-nowrap"><div>{fmtTime(s.timestamp)}</div><div className="text-[10px] text-muted-foreground">{fmtDate(s.timestamp)}</div></td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{s.name.split(" ").map(p => p[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{s.code}</td>
                  <td className="px-2 py-2 text-muted-foreground text-xs">{s.method}</td>
                  <td className="px-2 py-2">
                    {s.dir === "in"
                      ? <span className="inline-flex items-center gap-1 text-emerald-500 text-xs"><LogIn className="h-3 w-3" /> In</span>
                      : <span className="inline-flex items-center gap-1 text-muted-foreground text-xs"><LogOut className="h-3 w-3" /> Out</span>}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground text-xs">{s.seatNumber}</td>
                  <td className="px-2 py-2 text-muted-foreground text-xs">{s.gate}</td>
                  <td className="px-4 py-2 text-right label-mono">{s.latencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground border-t pt-3">
          <span className="inline-flex items-center gap-1"><Keyboard className="h-3.5 w-3.5" /> Shortcuts:</span>
          <span><kbd className="px-1 border rounded">/</kbd> search</span>
          <span><kbd className="px-1 border rounded">C</kbd> camera</span>
          <span><kbd className="px-1 border rounded">M</kbd> mute</span>
          <span className="ml-auto inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Duplicate window: 30s</span>
          <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Unique: <span className="tabular-nums font-medium">{uniqueMembers}</span></span>
          <span className="inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Failed: <span className="tabular-nums font-medium">{failed}</span></span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Success rate: <span className="tabular-nums font-medium">{scans.length ? Math.round((scans.length / (scans.length + failed)) * 100) : 100}%</span></span>
        </div>
      </GlassCard>
    </>
  );
}
