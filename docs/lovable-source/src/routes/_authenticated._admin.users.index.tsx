import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { userAccounts as seedUsers, type UserAccount } from "@/lib/mock/data";
import { format } from "date-fns";
import {
  Plus, Search, Shield, Mail, KeyRound, Lock, Unlock, UserCog, Trash2, Copy, Filter,
  CalendarIcon, History, ChevronDown, LogIn, LogOut, ShieldCheck, ShieldAlert,
  UserPlus, Pencil, RotateCcw, X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/users/")({
  head: () => ({ meta: [{ title: "Users — SmartLibrary" }] }),
  component: UsersPage,
});

// ---------- Role mapping ----------
const ROLES = [
  { id: "SuperAdmin", label: "Super Admin", tone: "destructive", desc: "Unrestricted platform access." },
  { id: "InstitutionAdmin", label: "Institution Admin", tone: "default", desc: "Manage all branches & libraries of an institution." },
  { id: "BranchAdmin", label: "Branch Admin", tone: "default", desc: "Manage a single branch including libraries & staff." },
  { id: "BranchManager", label: "Branch Manager", tone: "info", desc: "Operate a branch day-to-day (no billing)." },
  { id: "LibrarianAdmin", label: "Librarian Admin", tone: "info", desc: "Manage librarians and library inventory." },
  { id: "Librarian", label: "Librarian", tone: "muted", desc: "Issue/return books, seat assignment." },
  { id: "Teacher", label: "Teacher", tone: "muted", desc: "View classes and student attendance." },
] as const;

type RoleId = typeof ROLES[number]["id"];

type PermCategory = "Members" | "Inventory" | "Payments" | "Staff" | "Settings";

const PERMISSIONS: { id: string; label: string; category: PermCategory }[] = [
  { id: "members.read", label: "View members", category: "Members" },
  { id: "members.write", label: "Edit members", category: "Members" },
  { id: "seats.manage", label: "Manage seats", category: "Members" },
  { id: "books.manage", label: "Manage books", category: "Inventory" },
  { id: "payments.view", label: "View payments", category: "Payments" },
  { id: "payments.refund", label: "Issue refunds", category: "Payments" },
  { id: "staff.manage", label: "Manage staff", category: "Staff" },
  { id: "settings.manage", label: "Manage settings", category: "Settings" },
];

const PERM_CATEGORIES: PermCategory[] = ["Members", "Inventory", "Payments", "Staff", "Settings"];

const ROLE_PERMS: Record<RoleId, string[]> = {
  SuperAdmin: PERMISSIONS.map((p) => p.id),
  InstitutionAdmin: ["members.read","members.write","seats.manage","books.manage","payments.view","payments.refund","staff.manage","settings.manage"],
  BranchAdmin: ["members.read","members.write","seats.manage","books.manage","payments.view","payments.refund","staff.manage"],
  BranchManager: ["members.read","members.write","seats.manage","payments.view"],
  LibrarianAdmin: ["members.read","books.manage","seats.manage"],
  Librarian: ["members.read","books.manage"],
  Teacher: ["members.read"],
};

const SCOPES = ["Acme Meridian", "Brightline Org", "Northpoint", "Polaris"];

interface AppUser extends UserAccount {
  scope?: string;
  permissions?: string[];
  phone?: string;
  createdAt?: string;
}

// ---------- Activity & Audit types ----------
type ActivityAction = "login" | "logout" | "password_reset" | "role_change" | "permission_change" | "lock" | "unlock" | "created" | "updated";
interface ActivityEvent {
  id: string;
  userId: string;
  action: ActivityAction;
  actor: string;
  at: string; // ISO
  detail?: string;
}

type AuditAction = "role_change" | "permission_added" | "permission_removed" | "permissions_reset" | "created" | "updated" | "lock" | "unlock" | "reset_link";
interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  actor: string;
  action: AuditAction;
  before?: string;
  after?: string;
  at: string;
}

const ACTIVITY_LABEL: Record<ActivityAction, string> = {
  login: "Signed in",
  logout: "Signed out",
  password_reset: "Password reset",
  role_change: "Role changed",
  permission_change: "Permission updated",
  lock: "Account locked",
  unlock: "Account unlocked",
  created: "Account created",
  updated: "Profile updated",
};

const ACTIVITY_ICON: Record<ActivityAction, React.ComponentType<{ className?: string }>> = {
  login: LogIn, logout: LogOut, password_reset: KeyRound, role_change: ShieldCheck,
  permission_change: Shield, lock: Lock, unlock: Unlock, created: UserPlus, updated: Pencil,
};

const AUDIT_LABEL: Record<AuditAction, string> = {
  role_change: "Role changed",
  permission_added: "Permission granted",
  permission_removed: "Permission revoked",
  permissions_reset: "Permissions reset to role defaults",
  created: "User created",
  updated: "User updated",
  lock: "Account disabled",
  unlock: "Account enabled",
  reset_link: "Reset link sent",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function seedActivity(users: AppUser[]): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  const now = Date.now();
  const day = 86400000;
  users.forEach((u, idx) => {
    const base = now - idx * 3 * 3600 * 1000;
    out.push({ id: uid("ev"), userId: u.id, action: "created", actor: "system", at: new Date(base - 30 * day).toISOString() });
    out.push({ id: uid("ev"), userId: u.id, action: "login", actor: u.name, at: new Date(base - 2 * day).toISOString() });
    out.push({ id: uid("ev"), userId: u.id, action: "login", actor: u.name, at: new Date(base - day).toISOString() });
    if (idx % 2 === 0) out.push({ id: uid("ev"), userId: u.id, action: "password_reset", actor: "admin@smartlibrary.io", at: new Date(base - 5 * day).toISOString(), detail: "Reset link emailed" });
    if (idx % 3 === 0) out.push({ id: uid("ev"), userId: u.id, action: "permission_change", actor: "admin@smartlibrary.io", at: new Date(base - 10 * day).toISOString(), detail: "+payments.view" });
    if (u.status === "Locked") out.push({ id: uid("ev"), userId: u.id, action: "lock", actor: "admin@smartlibrary.io", at: new Date(base - 6 * 3600 * 1000).toISOString() });
  });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>(() =>
    seedUsers.map((u, i) => ({
      ...u,
      scope: SCOPES[i % SCOPES.length],
      permissions: ROLE_PERMS[(u.role as RoleId)] ?? [],
      createdAt: "2025-04-12",
    })),
  );
  const [activity, setActivity] = useState<ActivityEvent[]>(() => seedActivity(users));
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [auditFeedOpen, setAuditFeedOpen] = useState(false);

  const ACTOR = "you@smartlibrary.io";

  function logAudit(entries: Omit<AuditEntry, "id" | "at" | "actor">[]) {
    const stamped = entries.map((e) => ({ ...e, id: uid("a"), at: new Date().toISOString(), actor: ACTOR }));
    setAudit((prev) => [...stamped, ...prev]);
  }
  function logActivity(events: Omit<ActivityEvent, "id" | "at" | "actor">[], actor = ACTOR) {
    const stamped = events.map((e) => ({ ...e, id: uid("ev"), at: new Date().toISOString(), actor }));
    setActivity((prev) => [...stamped, ...prev]);
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [users, query, roleFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === "Active").length,
    locked: users.filter((u) => u.status === "Locked").length,
    admins: users.filter((u) => u.role.includes("Admin")).length,
  }), [users]);

  function openCreate() {
    setEditing({
      id: uid("u"),
      name: "",
      email: "",
      role: "Librarian",
      status: "Active",
      lastLogin: "—",
      scope: SCOPES[0],
      permissions: ROLE_PERMS["Librarian"],
      phone: "",
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setEditorOpen(true);
  }

  function openEdit(u: AppUser) {
    setEditing({ ...u });
    setEditorOpen(true);
  }

  function saveUser(u: AppUser) {
    if (!u.name.trim() || !u.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    const existing = users.find((p) => p.id === u.id);
    setUsers((prev) => {
      const exists = prev.some((p) => p.id === u.id);
      return exists ? prev.map((p) => (p.id === u.id ? u : p)) : [u, ...prev];
    });

    // audit + activity
    if (!existing) {
      logAudit([{ userId: u.id, userName: u.name, action: "created", after: u.role }]);
      logActivity([{ userId: u.id, action: "created", detail: `Role: ${u.role}` }]);
    } else {
      const entries: Omit<AuditEntry, "id" | "at" | "actor">[] = [];
      if (existing.role !== u.role) {
        entries.push({ userId: u.id, userName: u.name, action: "role_change", before: existing.role, after: u.role });
        logActivity([{ userId: u.id, action: "role_change", detail: `${existing.role} → ${u.role}` }]);
      }
      const prevPerms = new Set(existing.permissions ?? []);
      const nextPerms = new Set(u.permissions ?? []);
      nextPerms.forEach((p) => {
        if (!prevPerms.has(p)) entries.push({ userId: u.id, userName: u.name, action: "permission_added", after: p });
      });
      prevPerms.forEach((p) => {
        if (!nextPerms.has(p)) entries.push({ userId: u.id, userName: u.name, action: "permission_removed", before: p });
      });
      if (entries.some((e) => e.action.startsWith("permission_"))) {
        logActivity([{ userId: u.id, action: "permission_change", detail: `${entries.filter((e) => e.action.startsWith("permission_")).length} change(s)` }]);
      }
      if (entries.length === 0) entries.push({ userId: u.id, userName: u.name, action: "updated" });
      logAudit(entries);
      logActivity([{ userId: u.id, action: "updated" }]);
    }

    setEditorOpen(false);
    setEditing(null);
    toast.success("User saved");
  }

  function toggleLock(u: AppUser) {
    const next = u.status === "Locked" ? "Active" : "Locked";
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, status: next as AppUser["status"] } : p)));
    setSelected((s) => (s && s.id === u.id ? { ...s, status: next as AppUser["status"] } : s));
    logAudit([{ userId: u.id, userName: u.name, action: next === "Locked" ? "lock" : "unlock" }]);
    logActivity([{ userId: u.id, action: next === "Locked" ? "lock" : "unlock" }]);
    toast.success(`User ${next === "Locked" ? "locked" : "unlocked"}`);
  }

  function removeUser(u: AppUser) {
    setUsers((prev) => prev.filter((p) => p.id !== u.id));
    setSelected(null);
    toast.success("User removed");
  }

  // ---------- Bulk actions ----------
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllFiltered(checked: boolean) {
    setSelectedIds(checked ? new Set(filtered.map((u) => u.id)) : new Set());
  }
  function bulkSetStatus(status: AppUser["status"]) {
    const ids = Array.from(selectedIds);
    const targets = users.filter((u) => ids.includes(u.id));
    setUsers((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, status } : p)));
    const action: AuditAction = status === "Locked" ? "lock" : "unlock";
    logAudit(targets.map((t) => ({ userId: t.id, userName: t.name, action })));
    logActivity(targets.map((t) => ({ userId: t.id, action: status === "Locked" ? "lock" : "unlock" })));
    toast.success(`${targets.length} user(s) ${status === "Locked" ? "disabled" : "enabled"}`);
    setSelectedIds(new Set());
  }
  function bulkResetLinks() {
    const ids = Array.from(selectedIds);
    const targets = users.filter((u) => ids.includes(u.id));
    logAudit(targets.map((t) => ({ userId: t.id, userName: t.name, action: "reset_link" })));
    logActivity(targets.map((t) => ({ userId: t.id, action: "password_reset", detail: "Bulk reset link" })));
    toast.success(`Reset links sent to ${targets.length} user(s)`);
    setSelectedIds(new Set());
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Staff accounts with role-based permissions and scope mapping."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add user
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {[
          { label: "Total users", value: counts.total },
          { label: "Active", value: counts.active },
          { label: "Admins", value: counts.admins },
          { label: "Locked", value: counts.locked },
        ].map((k) => (
          <GlassCard key={k.label} className="p-4">
            <p className="label-mono text-xs">{k.label}</p>
            <p className="text-2xl font-semibold mt-1">{k.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Governance activity feed */}
      <GlassCard className="mt-5 p-0 overflow-hidden">
        <Collapsible open={auditFeedOpen} onOpenChange={setAuditFeedOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent governance activity</span>
                <Badge variant="secondary" className="text-[10px]">{audit.length}</Badge>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", auditFeedOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t max-h-72 overflow-y-auto">
              {audit.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground text-center">No governance changes yet. Edit a user to start the log.</p>
              ) : (
                <ul className="divide-y">
                  {audit.slice(0, 10).map((e) => (
                    <li key={e.id} className="p-3 text-xs flex items-center gap-3">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{AUDIT_LABEL[e.action]}</span>
                        <span className="text-muted-foreground"> · {e.userName}</span>
                        {(e.before || e.after) && (
                          <span className="font-mono text-[10px] ml-2 text-muted-foreground">
                            {e.before ? `${e.before}` : ""}{e.before && e.after ? " → " : ""}{e.after ?? ""}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">{format(new Date(e.at), "MMM d, HH:mm")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </GlassCard>

      {/* Filters */}
      <GlassCard className="p-3 mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="pl-8" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Locked">Locked</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </GlassCard>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <GlassCard className="mt-3 p-3 flex flex-wrap items-center gap-2 border-primary/40">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Separator orientation="vertical" className="h-5" />
          <Button size="sm" variant="outline" onClick={() => bulkSetStatus("Active")}>
            <Unlock className="h-3.5 w-3.5 mr-1" /> Enable
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkSetStatus("Locked")}>
            <Lock className="h-3.5 w-3.5 mr-1" /> Disable
          </Button>
          <Button size="sm" variant="outline" onClick={bulkResetLinks}>
            <Mail className="h-3.5 w-3.5 mr-1" /> Resend reset link
          </Button>
          <div className="ml-auto">
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Table */}
      <GlassCard className="p-0 mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b label-mono">
              <th className="px-3 py-2.5 w-8">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(v) => selectAllFiltered(Boolean(v))}
                  aria-label="Select all"
                />
              </th>
              <th className="py-2.5">User</th>
              <th>Role</th>
              <th>Scope</th>
              <th>Status</th>
              <th className="px-4">Last login</th>
              <th className="px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setSelected(u)}>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(u.id)}
                    onCheckedChange={() => toggleSelect(u.id)}
                    aria-label={`Select ${u.name}`}
                  />
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback></Avatar>
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><Badge variant="outline" className="font-mono text-[11px]">{u.role}</Badge></td>
                <td className="text-muted-foreground text-xs">{u.scope}</td>
                <td><StatusBadge status={u.status} /></td>
                <td className="px-4 text-muted-foreground text-xs">{u.lastLogin}</td>
                <td className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="Edit"><UserCog className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleLock(u)} title={u.status === "Locked" ? "Unlock" : "Lock"}>
                      {u.status === "Locked" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No users match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </GlassCard>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback>{initials(selected.name)}</AvatarFallback></Avatar>
                  <div>
                    <SheetTitle>{selected.name}</SheetTitle>
                    <SheetDescription>{selected.email}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-5">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="permissions">Perms</TabsTrigger>
                  <TabsTrigger value="audit">Audit</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Role" value={ROLES.find((r) => r.id === selected.role)?.label ?? selected.role} />
                    <Field label="Scope" value={selected.scope ?? "—"} />
                    <Field label="Status" value={<StatusBadge status={selected.status} />} />
                    <Field label="Last login" value={selected.lastLogin} />
                    <Field label="Created" value={selected.createdAt ?? "—"} />
                    <Field label="Phone" value={selected.phone || "—"} />
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(selected.email); toast.success("Email copied"); }}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy email
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      logAudit([{ userId: selected.id, userName: selected.name, action: "reset_link" }]);
                      logActivity([{ userId: selected.id, action: "password_reset" }]);
                      toast.success("Password reset link sent");
                    }}>
                      <Mail className="h-3.5 w-3.5 mr-1" /> Send reset link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleLock(selected)}>
                      {selected.status === "Locked" ? <Unlock className="h-3.5 w-3.5 mr-1" /> : <Lock className="h-3.5 w-3.5 mr-1" />}
                      {selected.status === "Locked" ? "Unlock" : "Lock"} account
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                      <UserCog className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeUser(selected)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <ActivityTimeline events={activity.filter((e) => e.userId === selected.id)} />
                </TabsContent>

                <TabsContent value="permissions" className="mt-4 space-y-3">
                  <SectionHeader title="Effective permissions" description={`Inherited from role: ${selected.role}`} />
                  <PermissionsDiffView role={selected.role as RoleId} permissions={selected.permissions ?? []} />
                </TabsContent>

                <TabsContent value="audit" className="mt-4">
                  <AuditTimeline entries={audit.filter((a) => a.userId === selected.id)} />
                </TabsContent>

                <TabsContent value="security" className="mt-4 space-y-3">
                  <div className="rounded-md border p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Two-factor authentication</p>
                      <p className="text-xs text-muted-foreground">Require an authenticator code on sign-in.</p>
                    </div>
                    <Switch defaultChecked={selected.role.includes("Admin")} />
                  </div>
                  <div className="rounded-md border p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Force password rotation</p>
                      <p className="text-xs text-muted-foreground">Prompt this user to set a new password on next sign-in.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toast.success("Rotation scheduled")}>
                      <KeyRound className="h-3.5 w-3.5 mr-1" /> Schedule
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor (Add / Edit) */}
      <Sheet open={editorOpen} onOpenChange={(o) => { setEditorOpen(o); if (!o) setEditing(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {editing && (
            <UserEditor
              user={editing}
              onChange={setEditing}
              onCancel={() => { setEditorOpen(false); setEditing(null); }}
              onSave={() => saveUser(editing)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2.5">
      <p className="label-mono text-[10px]">{label}</p>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}

// ---------- Activity Timeline ----------
function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [actions, setActions] = useState<Set<ActivityAction>>(new Set());

  const ALL_ACTIONS: ActivityAction[] = ["login", "logout", "password_reset", "role_change", "permission_change", "lock", "unlock", "created", "updated"];

  function toggleAction(a: ActivityAction) {
    setActions((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const t = new Date(e.at).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime() + 86400000) return false;
      if (actions.size > 0 && !actions.has(e.action)) return false;
      return true;
    });
  }, [events, from, to, actions]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DateField label="From" value={from} onChange={setFrom} />
        <DateField label="To" value={to} onChange={setTo} />
        {(from || to || actions.size > 0) && (
          <Button size="sm" variant="ghost" onClick={() => { setFrom(undefined); setTo(undefined); setActions(new Set()); }}>
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_ACTIONS.map((a) => {
          const active = actions.has(a);
          return (
            <button
              key={a}
              onClick={() => toggleAction(a)}
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border transition",
                active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
              )}
            >
              {ACTIVITY_LABEL[a]}
            </button>
          );
        })}
      </div>

      <Separator />

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No activity matches these filters.</p>
      ) : (
        <ol className="relative border-l ml-2 space-y-3">
          {filtered.map((e) => {
            const Icon = ACTIVITY_ICON[e.action];
            return (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-background border">
                  <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{ACTIVITY_LABEL[e.action]}</p>
                  <p className="text-[11px] text-muted-foreground">{format(new Date(e.at), "MMM d, yyyy HH:mm")}</p>
                </div>
                <p className="text-xs text-muted-foreground">{e.actor}{e.detail ? ` · ${e.detail}` : ""}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal h-8", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
          {value ? format(value, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

// ---------- Audit Timeline ----------
function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const filtered = useMemo(() => entries.filter((e) => actionFilter === "all" || e.action === actionFilter), [entries, actionFilter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="Audit log" description="Role and permission changes recorded for this user." />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {(Object.keys(AUDIT_LABEL) as AuditAction[]).map((a) => (
              <SelectItem key={a} value={a}>{AUDIT_LABEL[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No audit entries yet.</p>
      ) : (
        <ol className="relative border-l ml-2 space-y-3">
          {filtered.map((e) => (
            <li key={e.id} className="ml-4">
              <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-background border">
                <ShieldAlert className="h-2.5 w-2.5 text-muted-foreground" />
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{AUDIT_LABEL[e.action]}</p>
                <p className="text-[11px] text-muted-foreground">{format(new Date(e.at), "MMM d, HH:mm")}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {e.actor}
                {(e.before || e.after) && (
                  <span className="font-mono text-[10px] ml-2">
                    {e.before ?? ""}{e.before && e.after ? " → " : ""}{e.after ?? ""}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---------- Permissions diff (read-only view) ----------
function PermissionsDiffView({ role, permissions }: { role: RoleId; permissions: string[] }) {
  const defaults = new Set(ROLE_PERMS[role] ?? []);
  const current = new Set(permissions);
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {PERMISSIONS.map((p) => {
        const has = current.has(p.id);
        const def = defaults.has(p.id);
        const status = has && !def ? "added" : !has && def ? "removed" : has ? "granted" : "denied";
        return (
          <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Shield className={cn("h-3.5 w-3.5", has ? "text-success" : "text-muted-foreground")} />
              <span>{p.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{p.id}</span>
            </div>
            <PermDiffBadge status={status} />
          </div>
        );
      })}
    </div>
  );
}

function PermDiffBadge({ status }: { status: "added" | "removed" | "granted" | "denied" }) {
  const map = {
    added: { label: "+override", className: "bg-success/15 text-success border-success/30" },
    removed: { label: "−override", className: "bg-warning/15 text-warning border-warning/30" },
    granted: { label: "default", className: "bg-muted text-muted-foreground" },
    denied: { label: "denied", className: "bg-muted/60 text-muted-foreground" },
  } as const;
  const cfg = map[status];
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", cfg.className)}>{cfg.label}</span>;
}

// ---------- User Editor ----------
function UserEditor({
  user, onChange, onCancel, onSave,
}: {
  user: AppUser;
  onChange: (u: AppUser) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const role = ROLES.find((r) => r.id === user.role) ?? ROLES[5];
  const rolePerms = ROLE_PERMS[role.id as RoleId];
  const current = user.permissions ?? rolePerms;
  const [permQuery, setPermQuery] = useState("");

  function setRole(next: RoleId) {
    onChange({ ...user, role: next, permissions: ROLE_PERMS[next] });
  }

  function togglePerm(pid: string, checked: boolean) {
    const set = new Set(current);
    if (checked) set.add(pid); else set.delete(pid);
    onChange({ ...user, permissions: Array.from(set) });
  }

  function setCategory(cat: PermCategory, enabled: boolean) {
    const set = new Set(current);
    PERMISSIONS.filter((p) => p.category === cat).forEach((p) => {
      if (enabled) set.add(p.id); else set.delete(p.id);
    });
    onChange({ ...user, permissions: Array.from(set) });
  }

  const isNew = !seedUsers.some((u) => u.id === user.id);

  const defaults = new Set(rolePerms);
  const overrideCount = useMemo(() => {
    const cur = new Set(current);
    let n = 0;
    cur.forEach((p) => { if (!defaults.has(p)) n++; });
    defaults.forEach((p) => { if (!cur.has(p)) n++; });
    return n;
  }, [current, rolePerms]);

  const filteredPerms = useMemo(() => {
    const q = permQuery.toLowerCase().trim();
    if (!q) return PERMISSIONS;
    return PERMISSIONS.filter((p) => p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [permQuery]);

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isNew ? "Add user" : "Edit user"}</SheetTitle>
        <SheetDescription>Assign a role to map default permissions and scope.</SheetDescription>
      </SheetHeader>

      <div className="space-y-4 mt-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={user.name} onChange={(e) => onChange({ ...user, name: e.target.value })} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={user.email} onChange={(e) => onChange({ ...user, email: e.target.value })} placeholder="jane@org.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={user.phone ?? ""} onChange={(e) => onChange({ ...user, phone: e.target.value })} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={user.status} onValueChange={(v) => onChange({ ...user, status: v as AppUser["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Locked">Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Role</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {ROLES.map((r) => (
              <label key={r.id} className={cn("flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition", user.role === r.id ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
                <input
                  type="radio"
                  className="mt-1 accent-primary"
                  name="role"
                  checked={user.role === r.id}
                  onChange={() => setRole(r.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Scope</Label>
          <Select value={user.scope ?? SCOPES[0]} onValueChange={(v) => onChange({ ...user, scope: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Limits visibility to selected institution/branch.</p>
        </div>

        <Separator />

        {/* Permissions editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Permissions</Label>
            <div className="flex items-center gap-2">
              <Badge variant={overrideCount > 0 ? "default" : "secondary"} className="text-[10px]">
                {overrideCount} override{overrideCount === 1 ? "" : "s"} vs {role.label}
              </Badge>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => onChange({ ...user, permissions: rolePerms })}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reset
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={permQuery}
              onChange={(e) => setPermQuery(e.target.value)}
              placeholder="Search permissions"
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Accordion type="multiple" defaultValue={PERM_CATEGORIES} className="border rounded-md">
            {PERM_CATEGORIES.map((cat) => {
              const inCat = filteredPerms.filter((p) => p.category === cat);
              if (inCat.length === 0) return null;
              const allOn = inCat.every((p) => current.includes(p.id));
              const someOn = inCat.some((p) => current.includes(p.id));
              return (
                <AccordionItem key={cat} value={cat} className="border-b last:border-b-0">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-medium">{cat}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {inCat.filter((p) => current.includes(p.id)).length}/{inCat.length}
                      </Badge>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCategory(cat, !allOn); }}
                      className="text-[11px] text-muted-foreground hover:text-foreground mr-2"
                    >
                      {allOn ? "Disable all" : someOn ? "Enable rest" : "Enable all"}
                    </button>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2">
                    <div className="space-y-1">
                      {inCat.map((p) => {
                        const checked = current.includes(p.id);
                        const def = defaults.has(p.id);
                        const status = checked && !def ? "added" : !checked && def ? "removed" : checked ? "granted" : "denied";
                        return (
                          <label key={p.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
                            <Checkbox checked={checked} onCheckedChange={(v) => togglePerm(p.id, Boolean(v))} />
                            <span className="flex-1">{p.label}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{p.id}</span>
                            <PermDiffBadge status={status} />
                          </label>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          {filteredPerms.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No permissions match "{permQuery}".</p>
          )}
        </div>
      </div>

      <SheetFooter className="mt-6 gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave}>{isNew ? "Create user" : "Save changes"}</Button>
      </SheetFooter>
    </>
  );
}
