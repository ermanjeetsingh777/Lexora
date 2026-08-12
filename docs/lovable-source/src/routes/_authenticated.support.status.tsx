import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, GlassCard } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  addSubscription,
  removeSubscription,
  refreshStatus,
  useHealth,
  useIncidents,
  useLastSync,
  useSubscriptions,
  formatDate,
  formatRelative,
  type ComponentHealth,
  type Incident,
  type StatusEvent,
} from "@/lib/support-store";
import { usePolling } from "@/hooks/use-polling";
import {
  Activity,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  History,
  Mail,
  MessageSquare,
  Radio,
  RefreshCw,
  ShieldAlert,
  Webhook,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";


function statusTone(status: string) {
  switch (status) {
    case "Operational":
      return { dot: "bg-emerald-500", text: "text-emerald-500", variant: "success" as const };
    case "Degraded":
      return { dot: "bg-amber-500", text: "text-amber-500", variant: "warning" as const };
    case "Partial Outage":
      return { dot: "bg-orange-500", text: "text-orange-500", variant: "warning" as const };
    case "Major Outage":
      return { dot: "bg-destructive", text: "text-destructive", variant: "destructive" as const };
    case "Maintenance":
      return { dot: "bg-sky-500", text: "text-sky-500", variant: "muted" as const };
    default:
      return { dot: "bg-muted", text: "text-muted-foreground", variant: "muted" as const };
  }
}

function severityVariant(s: Incident["severity"]) {
  switch (s) {
    case "critical":
      return "destructive" as const;
    case "major":
      return "warning" as const;
    case "minor":
      return "muted" as const;
    case "maintenance":
      return "muted" as const;
  }
}

function UptimeBars({ series }: { series: number[] }) {
  return (
    <div className="flex items-end gap-[2px] h-6">
      {series.map((v, i) => {
        const tone =
          v > 0.99
            ? "bg-emerald-500/80"
            : v > 0.95
              ? "bg-amber-500/80"
              : v > 0.85
                ? "bg-orange-500/80"
                : "bg-destructive/80";
        return (
          <div
            key={i}
            title={`Day -${89 - i}: ${(v * 100).toFixed(2)}%`}
            className={`w-[3px] rounded-sm ${tone}`}
            style={{ height: `${Math.max(6, Math.round(v * 100)) * 0.24}rem` }}
          />
        );
      })}
    </div>
  );
}

function SubscribeDialog() {
  const healthComponents = useHealth();

  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"email" | "sms" | "webhook">("email");
  const [target, setTarget] = useState("");
  const [scope, setScope] = useState<"all" | "select">("all");
  const [selected, setSelected] = useState<string[]>([]);

  function submit() {
    if (!target.trim()) {
      toast.error("Please provide a delivery target.");
      return;
    }
    addSubscription({
      channel,
      target: target.trim(),
      components: scope === "all" ? ["all"] : selected,
    });
    toast.success("Subscribed to status updates", {
      description: `We'll notify ${target} via ${channel}.`,
    });
    setOpen(false);
    setTarget("");
    setSelected([]);
    setScope("all");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Bell className="h-4 w-4 mr-1.5" /> Subscribe to updates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Get status notifications</DialogTitle>
          <DialogDescription>
            Choose a channel and which components you care about. You'll be notified when incidents open, update, or resolve.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="label-mono">Channel</Label>
            <RadioGroup
              className="grid grid-cols-3 gap-2 mt-2"
              value={channel}
              onValueChange={(v) => setChannel(v as typeof channel)}
            >
              {[
                { id: "email", label: "Email", icon: Mail },
                { id: "sms", label: "SMS", icon: MessageSquare },
                { id: "webhook", label: "Webhook", icon: Webhook },
              ].map((c) => {
                const active = channel === c.id;
                return (
                  <label
                    key={c.id}
                    className={`flex flex-col items-center gap-1 rounded-md border p-3 cursor-pointer text-xs ${
                      active ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={c.id} className="sr-only" />
                    <c.icon className="h-4 w-4" />
                    {c.label}
                  </label>
                );
              })}
            </RadioGroup>
          </div>
          <div>
            <Label className="label-mono">
              {channel === "email" ? "Email address" : channel === "sms" ? "Phone number" : "Webhook URL"}
            </Label>
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={
                channel === "email"
                  ? "you@example.com"
                  : channel === "sms"
                    ? "+1 415 555 0119"
                    : "https://hooks.example.com/status"
              }
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="label-mono">Components</Label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                All components
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={scope === "select"}
                  onChange={() => setScope("select")}
                />
                Only selected
              </label>
              {scope === "select" && (
                <div className="grid grid-cols-2 gap-2 pt-1 pl-6">
                  {healthComponents.map((c) => (
                    <label key={c.name} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.includes(c.name)}
                        onCheckedChange={(v) =>
                          setSelected((prev) =>
                            v ? [...prev, c.name] : prev.filter((n) => n !== c.name),
                          )
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Confirm subscription</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusPage() {
  const subs = useSubscriptions();
  const healthComponents = useHealth();
  const incidentSeed = useIncidents();
  const lastSyncAt = useLastSync();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalSec, setIntervalSec] = useState<number>(15);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());
  // Force a re-render every ~5s so the "Updated Xs ago" label ticks.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  function handleRefresh(simulate: boolean) {
    setIsRefreshing(true);
    const result = refreshStatus({ simulate });
    for (const ev of result.events) {
      const key = `${ev.kind}:${"incidentId" in ev ? ev.incidentId : ev.name}:${
        "to" in ev ? ev.to : "phase" in ev ? ev.phase : ""
      }`;
      if (seenEventsRef.current.has(key)) continue;
      seenEventsRef.current.add(key);
      if (ev.kind === "component-changed") {
        if (ev.to === "Operational") {
          toast.success(`${ev.name} recovered`, { description: `Back to Operational from ${ev.from}.` });
        } else {
          toast.warning(`${ev.name} ${ev.to.toLowerCase()}`, { description: `Was ${ev.from}.` });
        }
      } else if (ev.kind === "incident-opened") {
        toast.error("New incident opened", { description: ev.title });
      } else if (ev.kind === "incident-resolved") {
        toast.success("Incident resolved", { description: ev.title });
      } else if (ev.kind === "incident-updated") {
        toast.message("Incident update", { description: `${ev.phase} · ${ev.incidentId}` });
      }
    }
    // Brief visual feedback for the spinning icon.
    setTimeout(() => setIsRefreshing(false), 350);
  }

  usePolling(() => handleRefresh(true), {
    intervalMs: intervalSec * 1000,
    enabled: autoRefresh,
    pauseWhenHidden: true,
    runImmediately: false,
  });

  const overall = useMemo(() => {
    if (healthComponents.some((c) => c.status === "Major Outage"))
      return { text: "Major service outage", tone: "destructive" as const, dot: "bg-destructive" };
    if (healthComponents.some((c) => c.status === "Partial Outage"))
      return { text: "Partial outage", tone: "warning" as const, dot: "bg-orange-500" };
    if (healthComponents.some((c) => c.status === "Degraded"))
      return { text: "Some services degraded", tone: "warning" as const, dot: "bg-amber-500" };
    if (healthComponents.some((c) => c.status === "Maintenance"))
      return { text: "Scheduled maintenance in progress", tone: "muted" as const, dot: "bg-sky-500" };
    return { text: "All systems operational", tone: "success" as const, dot: "bg-emerald-500" };
  }, [healthComponents]);

  const active = incidentSeed.filter((i) => i.status !== "Resolved" && i.status !== "Scheduled");
  const scheduled = incidentSeed.filter((i) => i.status === "Scheduled");
  const past = incidentSeed.filter((i) => i.status === "Resolved");

  const avgUptime =
    healthComponents.reduce(
      (s, c) => s + c.uptime90.reduce((a, b) => a + b, 0) / c.uptime90.length,
      0,
    ) / Math.max(1, healthComponents.length);

  // Initialize expanded on first render with data.
  useEffect(() => {
    if (expanded == null && incidentSeed[0]) setExpanded(incidentSeed[0].id);
  }, [expanded, incidentSeed]);

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="System status"
        description="Real-time health for SmartLibrary services and history of past incidents."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/support">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to support
              </Link>
            </Button>
            <SubscribeDialog />
          </div>
        }
      />

      <GlassCard className="p-5 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${overall.dot} animate-pulse`} />
          <span className="text-lg font-semibold">{overall.text}</span>
          <StatusBadge status={overall.text} variant={overall.tone} />
          <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
            <span className="label-mono">90d uptime · {(avgUptime * 100).toFixed(2)}%</span>
            <span className="label-mono flex items-center gap-1.5">
              {autoRefresh && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              Updated {formatRelative(lastSyncAt)}
            </span>
            <div className="flex items-center gap-1.5 pl-2 border-l">
              <Label htmlFor="auto-refresh" className="label-mono cursor-pointer">
                Auto-refresh
              </Label>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={(v) => {
                  setAutoRefresh(v);
                  if (v) toast.success("Auto-refresh on", { description: `Polling every ${intervalSec}s.` });
                }}
              />
              <Select
                value={String(intervalSec)}
                onValueChange={(v) => setIntervalSec(Number(v))}
                disabled={!autoRefresh}
              >
                <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5s</SelectItem>
                  <SelectItem value="15">15s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => handleRefresh(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

      </GlassCard>

      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">
            <Zap className="h-4 w-4 mr-1.5" /> Components
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <ShieldAlert className="h-4 w-4 mr-1.5" /> Active & scheduled
            {active.length + scheduled.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4">
                {active.length + scheduled.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1.5" /> Incident history
          </TabsTrigger>
          <TabsTrigger value="subscribers">
            <Bell className="h-4 w-4 mr-1.5" /> Subscribers
            {subs.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4">
                {subs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-4">
          <GlassCard className="p-5">
            <ul className="divide-y">
              {healthComponents.map((c) => {
                const tone = statusTone(c.status);
                const up30 = c.uptime90.slice(-30);
                const up30avg = up30.reduce((a, b) => a + b, 0) / up30.length;
                return (
                  <li key={c.name} className="py-4 flex flex-wrap items-center gap-4">
                    <div className="min-w-[180px] flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="label-mono">{c.description}</div>
                      </div>
                    </div>
                    <UptimeBars series={c.uptime90} />
                    <div className="ml-auto flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="label-mono">30d uptime</div>
                        <div className="font-medium">{(up30avg * 100).toFixed(2)}%</div>
                      </div>
                      <div className="text-right">
                        <div className="label-mono">p50 latency</div>
                        <div className="font-medium">{c.responseMs} ms</div>
                      </div>
                      <StatusBadge status={c.status} variant={tone.variant} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> &gt; 99%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" /> 95–99%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-orange-500" /> 85–95%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-destructive" /> &lt; 85%
              </span>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="incidents" className="mt-4 space-y-3">
          {[...active, ...scheduled].length === 0 && (
            <GlassCard className="p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
              No active or scheduled incidents.
            </GlassCard>
          )}
          {[...active, ...scheduled].map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              expanded={expanded === inc.id}
              onToggle={() => setExpanded((e) => (e === inc.id ? null : inc.id))}
            />
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {past.map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              expanded={expanded === inc.id}
              onToggle={() => setExpanded((e) => (e === inc.id ? null : inc.id))}
            />
          ))}
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          <GlassCard className="p-5">
            {subs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <Radio className="h-6 w-6 mx-auto mb-2 opacity-60" />
                No subscribers yet. Click <strong>Subscribe to updates</strong> above to add one.
              </div>
            ) : (
              <ul className="divide-y">
                {subs.map((s) => (
                  <li key={s.target} className="py-3 flex items-center gap-3">
                    {s.channel === "email" && <Mail className="h-4 w-4 text-muted-foreground" />}
                    {s.channel === "sms" && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                    {s.channel === "webhook" && <Webhook className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.target}</div>
                      <div className="label-mono truncate">
                        {s.components[0] === "all" ? "All components" : s.components.join(", ")} · added {formatRelative(s.createdAt)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        removeSubscription(s.target);
                        toast.success("Unsubscribed", { description: s.target });
                      }}
                    >
                      Unsubscribe
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </>
  );
}

function IncidentCard({
  incident,
  expanded,
  onToggle,
}: {
  incident: Incident;
  expanded: boolean;
  onToggle: () => void;
}) {
  const duration = incident.resolvedAt
    ? `${Math.round((incident.resolvedAt - incident.startedAt) / 60000)} min`
    : incident.status === "Scheduled"
      ? `starts ${formatRelative(incident.startedAt)}`
      : `ongoing · ${formatRelative(incident.startedAt).replace(" ago", "")}`;

  return (
    <GlassCard className="p-4">
      <button className="w-full text-left" onClick={onToggle}>
        <div className="flex flex-wrap items-center gap-3">
          {incident.severity === "maintenance" ? (
            <Wrench className="h-4 w-4 text-sky-500" />
          ) : incident.status === "Resolved" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{incident.title}</div>
            <div className="label-mono truncate">
              {incident.id} · {incident.components.join(", ")} · {duration}
            </div>
          </div>
          <StatusBadge status={incident.severity} variant={severityVariant(incident.severity)} />
          <StatusBadge
            status={incident.status}
            variant={incident.status === "Resolved" ? "success" : incident.status === "Scheduled" ? "muted" : "warning"}
          />
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expanded && (
        <ol className="mt-4 ml-2 border-l pl-4 space-y-3">
          {[...incident.updates].reverse().map((u) => (
            <li key={u.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{u.phase}</Badge>
                <span className="label-mono">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {formatDate(u.at)}
                </span>
              </div>
              <div className="mt-1 text-sm">{u.body}</div>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}

export const Route = createFileRoute("/_authenticated/support/status")({
  head: () => ({ meta: [{ title: "System status — SmartLibrary" }] }),
  component: StatusPage,
});
