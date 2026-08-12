import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  X,
  Search,
  Plus,
  Shield,
  Copy,
  Pencil,
  Trash2,
  Users,
  History,
  Lock,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// ───────────────────────── Types ─────────────────────────
type PermissionId = string;
type Permission = {
  id: PermissionId;
  module: string;
  action: string;
  description: string;
  sensitive?: boolean;
};
type Role = {
  id: string;
  name: string;
  description: string;
  scope: "Global" | "Institution" | "Branch";
  system: boolean;
  members: number;
  permissions: PermissionId[];
  updatedAt: string;
};
type AuditEntry = {
  id: string;
  roleId: string;
  roleName: string;
  actor: string;
  action: string;
  detail: string;
  ts: string;
};

// ───────────────────────── Seed data ─────────────────────────
const PERMISSIONS: Permission[] = [
  { id: "members.read", module: "Members", action: "Read", description: "View member profiles and lists" },
  { id: "members.create", module: "Members", action: "Create", description: "Enroll new members" },
  { id: "members.update", module: "Members", action: "Update", description: "Edit member details" },
  { id: "members.delete", module: "Members", action: "Delete", description: "Remove members", sensitive: true },
  { id: "seats.read", module: "Seats", action: "Read", description: "View seat allocations" },
  { id: "seats.assign", module: "Seats", action: "Assign", description: "Assign or reassign seats" },
  { id: "seats.maintain", module: "Seats", action: "Maintain", description: "Mark seats out of service" },
  { id: "books.read", module: "Inventory", action: "Read", description: "Browse catalog and stock" },
  { id: "books.manage", module: "Inventory", action: "Manage", description: "Add, edit, and adjust stock" },
  { id: "books.delete", module: "Inventory", action: "Delete", description: "Remove titles from catalog", sensitive: true },
  { id: "billing.read", module: "Billing", action: "Read", description: "View invoices and payments" },
  { id: "billing.refund", module: "Billing", action: "Refund", description: "Issue refunds", sensitive: true },
  { id: "billing.plans", module: "Billing", action: "Edit plans", description: "Edit pricing and plans", sensitive: true },
  { id: "staff.read", module: "Staff", action: "Read", description: "View staff directory" },
  { id: "staff.manage", module: "Staff", action: "Manage", description: "Invite and manage staff" },
  { id: "settings.read", module: "Settings", action: "Read", description: "View configuration" },
  { id: "settings.update", module: "Settings", action: "Update", description: "Change configuration", sensitive: true },
  { id: "system.audit", module: "System", action: "Audit", description: "View audit logs" },
  { id: "system.impersonate", module: "System", action: "Impersonate", description: "Sign in as any user", sensitive: true },
];

const ALL_PERMS = PERMISSIONS.map((p) => p.id);

const initialRoles: Role[] = [
  {
    id: "r_super",
    name: "SuperAdmin",
    description: "Full unrestricted access. Reserved for platform owners.",
    scope: "Global",
    system: true,
    members: 2,
    permissions: ALL_PERMS,
    updatedAt: "2026-06-10T09:12:00Z",
  },
  {
    id: "r_inst",
    name: "InstitutionAdmin",
    description: "Manages everything within an institution.",
    scope: "Institution",
    system: true,
    members: 6,
    permissions: ALL_PERMS.filter((p) => p !== "system.impersonate"),
    updatedAt: "2026-06-12T14:02:00Z",
  },
  {
    id: "r_branch",
    name: "BranchAdmin",
    description: "Operates a single branch end-to-end.",
    scope: "Branch",
    system: true,
    members: 14,
    permissions: [
      "members.read","members.create","members.update",
      "seats.read","seats.assign","seats.maintain",
      "books.read","books.manage",
      "billing.read",
      "staff.read","staff.manage",
      "settings.read",
      "system.audit",
    ],
    updatedAt: "2026-06-18T11:24:00Z",
  },
  {
    id: "r_lib",
    name: "Librarian",
    description: "Front-desk operations, lending and stock.",
    scope: "Branch",
    system: true,
    members: 38,
    permissions: ["members.read","members.update","seats.read","seats.assign","books.read","books.manage","billing.read"],
    updatedAt: "2026-06-20T08:48:00Z",
  },
  {
    id: "r_member",
    name: "Member",
    description: "Self-service for end members.",
    scope: "Global",
    system: true,
    members: 1284,
    permissions: ["members.read","seats.read","books.read","billing.read"],
    updatedAt: "2026-05-30T16:00:00Z",
  },
];

const initialAudit: AuditEntry[] = [
  { id: "a1", roleId: "r_lib", roleName: "Librarian", actor: "Priya N.", action: "Permission added", detail: "+billing.read", ts: "2026-06-20T08:48:00Z" },
  { id: "a2", roleId: "r_branch", roleName: "BranchAdmin", actor: "Arjun K.", action: "Permission removed", detail: "-billing.refund", ts: "2026-06-18T11:24:00Z" },
  { id: "a3", roleId: "r_inst", roleName: "InstitutionAdmin", actor: "System", action: "Role updated", detail: "Description revised", ts: "2026-06-12T14:02:00Z" },
];

// ───────────────────────── Helpers ─────────────────────────
const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const MODULES = Array.from(new Set(PERMISSIONS.map((p) => p.module)));

function permsByModule(ids: PermissionId[]) {
  const set = new Set(ids);
  return MODULES.map((m) => {
    const all = PERMISSIONS.filter((p) => p.module === m);
    return { module: m, total: all.length, granted: all.filter((p) => set.has(p.id)).length };
  });
}

// ───────────────────────── Page ─────────────────────────
function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [audit, setAudit] = useState<AuditEntry[]>(initialAudit);
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | Role["scope"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorRole, setEditorRole] = useState<Role | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((r) => {
      if (scopeFilter !== "all" && r.scope !== scopeFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.permissions.some((p) => p.includes(q))
      );
    });
  }, [roles, query, scopeFilter]);

  const totals = useMemo(() => {
    return {
      total: roles.length,
      system: roles.filter((r) => r.system).length,
      custom: roles.filter((r) => !r.system).length,
      members: roles.reduce((a, r) => a + r.members, 0),
    };
  }, [roles]);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  function logAudit(entry: Omit<AuditEntry, "id" | "ts">) {
    setAudit((prev) => [
      { ...entry, id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ts: new Date().toISOString() },
      ...prev,
    ]);
  }

  function openCreate() {
    setEditorRole({
      id: `r_${Date.now()}`,
      name: "",
      description: "",
      scope: "Branch",
      system: false,
      members: 0,
      permissions: [],
      updatedAt: new Date().toISOString(),
    });
    setEditorOpen(true);
  }

  function openEdit(r: Role) {
    setEditorRole({ ...r });
    setEditorOpen(true);
  }

  function cloneRole(r: Role) {
    const copy: Role = {
      ...r,
      id: `r_${Date.now()}`,
      name: `${r.name} (copy)`,
      system: false,
      members: 0,
      updatedAt: new Date().toISOString(),
    };
    setRoles((prev) => [copy, ...prev]);
    logAudit({ roleId: copy.id, roleName: copy.name, actor: "You", action: "Role cloned", detail: `From ${r.name}` });
    toast.success(`Cloned “${r.name}”`);
  }

  function deleteRole(r: Role) {
    if (r.system) return toast.error("System roles cannot be deleted");
    if (r.members > 0) return toast.error("Reassign members before deleting");
    setRoles((prev) => prev.filter((x) => x.id !== r.id));
    logAudit({ roleId: r.id, roleName: r.name, actor: "You", action: "Role deleted", detail: r.description });
    toast.success(`Deleted “${r.name}”`);
    if (selectedId === r.id) setSelectedId(null);
  }

  function saveRole(next: Role, prev?: Role) {
    if (!next.name.trim()) return toast.error("Role name is required");
    const exists = prev != null;
    setRoles((rs) => (exists ? rs.map((r) => (r.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : r)) : [{ ...next, updatedAt: new Date().toISOString() }, ...rs]));

    if (exists && prev) {
      const before = new Set(prev.permissions);
      const after = new Set(next.permissions);
      const added = [...after].filter((p) => !before.has(p));
      const removed = [...before].filter((p) => !after.has(p));
      if (prev.name !== next.name) logAudit({ roleId: next.id, roleName: next.name, actor: "You", action: "Role renamed", detail: `${prev.name} → ${next.name}` });
      if (prev.scope !== next.scope) logAudit({ roleId: next.id, roleName: next.name, actor: "You", action: "Scope changed", detail: `${prev.scope} → ${next.scope}` });
      if (prev.description !== next.description) logAudit({ roleId: next.id, roleName: next.name, actor: "You", action: "Description updated", detail: next.description.slice(0, 80) });
      added.forEach((p) => logAudit({ roleId: next.id, roleName: next.name, actor: "You", action: "Permission added", detail: `+${p}` }));
      removed.forEach((p) => logAudit({ roleId: next.id, roleName: next.name, actor: "You", action: "Permission removed", detail: `-${p}` }));
    } else {
      logAudit({ roleId: next.id, roleName: next.name, actor: "You", action: "Role created", detail: `${next.permissions.length} permissions, ${next.scope}` });
    }
    toast.success(exists ? `Saved “${next.name}”` : `Created “${next.name}”`);
    setEditorOpen(false);
    setEditorRole(null);
  }

  const roleAudit = useMemo(
    () => (selectedId ? audit.filter((a) => a.roleId === selectedId) : []),
    [audit, selectedId]
  );

  return (
    <TooltipProvider delayDuration={150}>
      <PageHeader
        eyebrow="Admin"
        title="Roles & permissions"
        description="Define what each role can do, where it applies, and who holds it."
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> New role
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total roles", value: totals.total, icon: Shield },
          { label: "System roles", value: totals.system, icon: Lock },
          { label: "Custom roles", value: totals.custom, icon: Pencil },
          { label: "Assigned members", value: totals.members.toLocaleString(), icon: Users },
        ].map((k) => (
          <GlassCard key={k.label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="label-mono text-muted-foreground text-xs">{k.label}</div>
                <div className="text-2xl font-semibold mt-1">{k.value}</div>
              </div>
              <k.icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Roles list */}
      <GlassCard className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <SectionHeader title="Roles" />
          <div className="md:ml-auto flex flex-1 md:flex-none gap-2 items-center">
            <div className="relative flex-1 md:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roles or permissions…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 rounded-md border p-0.5">
              {(["all", "Global", "Institution", "Branch"] as const).map((s) => (
                <Button
                  key={s}
                  variant={scopeFilter === s ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs capitalize"
                  onClick={() => setScopeFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const summary = permsByModule(r.permissions);
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="group text-left rounded-lg border bg-card/50 hover:bg-card hover:border-primary/40 transition p-4 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{r.name}</span>
                      {r.system && <Badge variant="secondary" className="text-[10px]">SYSTEM</Badge>}
                      <Badge variant="outline" className="text-[10px]">{r.scope}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold">{r.members.toLocaleString()}</div>
                    <div className="label-mono text-[10px] text-muted-foreground">MEMBERS</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {summary.map((s) => (
                    <Tooltip key={s.module}>
                      <TooltipTrigger asChild>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            s.granted === 0
                              ? "text-muted-foreground/60"
                              : s.granted === s.total
                              ? "border-success/40 text-success"
                              : "border-amber-500/40 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {s.module} {s.granted}/{s.total}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {s.granted} of {s.total} {s.module.toLowerCase()} permissions
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Updated {fmt(r.updatedAt)}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition">View details →</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-10">
              No roles match your filters.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Permission matrix */}
      <GlassCard className="p-5 overflow-x-auto">
        <SectionHeader title="Permission matrix" description="Side-by-side view of every role." />
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 label-mono text-xs">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="label-mono text-xs text-center px-2 whitespace-nowrap">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {MODULES.map((m) => (
              <Fragment key={m}>
                <tr className="bg-muted/30">
                  <td colSpan={roles.length + 1} className="py-1.5 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {m}
                  </td>
                </tr>
                {PERMISSIONS.filter((p) => p.module === m).map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.action}</span>
                        {p.sensitive && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>Sensitive permission</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.description}</div>
                    </td>
                    {roles.map((r) => {
                      const granted = r.permissions.includes(p.id);
                      return (
                        <td key={r.id} className="text-center">
                          {granted ? (
                            <Check className="h-4 w-4 text-success inline" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/30 inline" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {/* Audit feed */}
      <GlassCard className="p-5">
        <SectionHeader title="Recent governance activity" description="Every role and permission change." />
        <ol className="relative border-l ml-2 space-y-3">
          {audit.slice(0, 8).map((a) => (
            <li key={a.id} className="pl-4 relative">
              <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary/70 ring-4 ring-background" />
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-medium">{a.action}</span>
                <Badge variant="outline" className="text-[10px]">{a.roleName}</Badge>
                <span className="text-xs text-muted-foreground">{a.detail}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {a.actor} · {fmt(a.ts)}
              </div>
            </li>
          ))}
          {audit.length === 0 && (
            <li className="pl-4 text-sm text-muted-foreground">No activity yet.</li>
          )}
        </ol>
      </GlassCard>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle>{selected.name}</SheetTitle>
                  {selected.system && <Badge variant="secondary" className="text-[10px]">SYSTEM</Badge>}
                  <Badge variant="outline" className="text-[10px]">{selected.scope}</Badge>
                </div>
                <SheetDescription>{selected.description}</SheetDescription>
              </SheetHeader>

              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => openEdit(selected)} disabled={selected.system}>
                  <Pencil className="h-4 w-4 mr-1.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => cloneRole(selected)}>
                  <Copy className="h-4 w-4 mr-1.5" /> Clone
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteRole(selected)}
                  disabled={selected.system || selected.members > 0}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </Button>
              </div>

              <Tabs defaultValue="perms" className="mt-5">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="perms">Permissions</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="audit">
                    <History className="h-3.5 w-3.5 mr-1" /> Audit
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="perms" className="space-y-3 mt-4">
                  <Accordion type="multiple" defaultValue={MODULES} className="w-full">
                    {MODULES.map((m) => {
                      const list = PERMISSIONS.filter((p) => p.module === m);
                      const granted = list.filter((p) => selected.permissions.includes(p.id));
                      return (
                        <AccordionItem key={m} value={m}>
                          <AccordionTrigger className="text-sm">
                            <div className="flex items-center gap-2">
                              <span>{m}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {granted.length}/{list.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-1.5">
                              {list.map((p) => {
                                const on = selected.permissions.includes(p.id);
                                return (
                                  <li key={p.id} className="flex items-start gap-2 text-sm">
                                    {on ? (
                                      <Check className="h-4 w-4 text-success mt-0.5" />
                                    ) : (
                                      <X className="h-4 w-4 text-muted-foreground/40 mt-0.5" />
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={on ? "font-medium" : "text-muted-foreground"}>{p.action}</span>
                                        {p.sensitive && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                        <code className="text-[10px] text-muted-foreground">{p.id}</code>
                                      </div>
                                      <div className="text-[11px] text-muted-foreground">{p.description}</div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </TabsContent>

                <TabsContent value="members" className="mt-4">
                  <div className="text-sm text-muted-foreground">
                    {selected.members.toLocaleString()} member{selected.members === 1 ? "" : "s"} hold this role.
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {Array.from({ length: Math.min(5, selected.members) }).map((_, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm py-2 px-2 rounded hover:bg-muted/40">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-semibold">
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">Sample User {i + 1}</div>
                          <div className="text-[11px] text-muted-foreground">user{i + 1}@smartlibrary.app</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Active</Badge>
                      </li>
                    ))}
                  </ul>
                </TabsContent>

                <TabsContent value="audit" className="mt-4">
                  <ol className="relative border-l ml-2 space-y-3">
                    {roleAudit.map((a) => (
                      <li key={a.id} className="pl-4 relative">
                        <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary/70 ring-4 ring-background" />
                        <div className="text-sm font-medium">{a.action}</div>
                        <div className="text-xs text-muted-foreground">{a.detail}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {a.actor} · {fmt(a.ts)}
                        </div>
                      </li>
                    ))}
                    {roleAudit.length === 0 && (
                      <li className="pl-4 text-sm text-muted-foreground">No activity for this role.</li>
                    )}
                  </ol>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor drawer */}
      <Sheet open={editorOpen} onOpenChange={(o) => { setEditorOpen(o); if (!o) setEditorRole(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {editorRole && (
            <RoleEditor
              role={editorRole}
              original={roles.find((r) => r.id === editorRole.id)}
              onCancel={() => { setEditorOpen(false); setEditorRole(null); }}
              onChange={setEditorRole}
              onSave={(next, prev) => saveRole(next, prev)}
            />
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

// ───────────────────────── Editor ─────────────────────────
function RoleEditor({
  role,
  original,
  onChange,
  onSave,
  onCancel,
}: {
  role: Role;
  original?: Role;
  onChange: (r: Role) => void;
  onSave: (next: Role, prev?: Role) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const isNew = !original;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PERMISSIONS;
    return PERMISSIONS.filter(
      (p) =>
        p.id.includes(q) ||
        p.action.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [search]);

  function toggle(id: PermissionId, on: boolean) {
    const set = new Set(role.permissions);
    if (on) set.add(id); else set.delete(id);
    onChange({ ...role, permissions: Array.from(set) });
  }

  function toggleModule(module: string, on: boolean) {
    const ids = PERMISSIONS.filter((p) => p.module === module).map((p) => p.id);
    const set = new Set(role.permissions);
    ids.forEach((id) => (on ? set.add(id) : set.delete(id)));
    onChange({ ...role, permissions: Array.from(set) });
  }

  function resetToOriginal() {
    if (original) onChange({ ...original });
  }

  const diffCount = useMemo(() => {
    if (!original) return role.permissions.length;
    const a = new Set(original.permissions);
    const b = new Set(role.permissions);
    let n = 0;
    a.forEach((x) => { if (!b.has(x)) n++; });
    b.forEach((x) => { if (!a.has(x)) n++; });
    return n;
  }, [role.permissions, original]);

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isNew ? "Create role" : `Edit ${original?.name}`}</SheetTitle>
        <SheetDescription>
          Define a name, scope and the permissions members of this role inherit.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Name</Label>
            <Input
              id="r-name"
              value={role.name}
              onChange={(e) => onChange({ ...role, name: e.target.value })}
              placeholder="e.g. RegionalManager"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scope</Label>
            <div className="flex gap-1 rounded-md border p-0.5">
              {(["Global", "Institution", "Branch"] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={role.scope === s ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => onChange({ ...role, scope: s })}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="r-desc">Description</Label>
          <Textarea
            id="r-desc"
            value={role.description}
            onChange={(e) => onChange({ ...role, description: e.target.value })}
            rows={2}
            placeholder="What does this role do?"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Label>Permissions</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {role.permissions.length}/{PERMISSIONS.length} granted
              </Badge>
              {!isNew && (
                <Badge variant={diffCount ? "secondary" : "outline"} className="text-[10px]">
                  {diffCount} changes
                </Badge>
              )}
              {!isNew && diffCount > 0 && (
                <Button size="sm" variant="ghost" className="h-7" onClick={resetToOriginal}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>

          <div className="relative mb-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search permissions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Accordion type="multiple" defaultValue={MODULES} className="w-full">
            {MODULES.map((m) => {
              const list = filtered.filter((p) => p.module === m);
              if (list.length === 0) return null;
              const all = PERMISSIONS.filter((p) => p.module === m);
              const grantedCount = all.filter((p) => role.permissions.includes(p.id)).length;
              const allOn = grantedCount === all.length;
              return (
                <AccordionItem key={m} value={m}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <span>{m}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {grantedCount}/{all.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex items-center justify-end mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => toggleModule(m, !allOn)}
                      >
                        {allOn ? "Clear all" : "Select all"}
                      </Button>
                    </div>
                    <ul className="space-y-2">
                      {list.map((p) => {
                        const on = role.permissions.includes(p.id);
                        const wasOn = original ? original.permissions.includes(p.id) : on;
                        const diff = original ? (on !== wasOn ? (on ? "added" : "removed") : null) : null;
                        return (
                          <li key={p.id} className="flex items-start gap-3 text-sm">
                            <Checkbox
                              id={p.id}
                              checked={on}
                              onCheckedChange={(c) => toggle(p.id, !!c)}
                              className="mt-0.5"
                            />
                            <label htmlFor={p.id} className="min-w-0 flex-1 cursor-pointer">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium">{p.action}</span>
                                <code className="text-[10px] text-muted-foreground">{p.id}</code>
                                {p.sensitive && (
                                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                                    sensitive
                                  </Badge>
                                )}
                                {diff === "added" && (
                                  <Badge className="text-[10px] bg-success/15 text-success border-0">+override</Badge>
                                )}
                                {diff === "removed" && (
                                  <Badge className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">−override</Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">{p.description}</div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>

      <SheetFooter className="mt-6 gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(role, original)}>
          {isNew ? "Create role" : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}

export const Route = createFileRoute("/_authenticated/_admin/roles/")({
  head: () => ({ meta: [{ title: "Roles — SmartLibrary" }] }),
  component: RolesPage,
});
