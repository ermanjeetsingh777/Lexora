import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, GlassCard } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  articles as kbArticles,
  addMessage,
  addInternalNote,
  createTicket,
  deleteDraft,
  formatDate,
  formatRelative,
  setAssignee,
  setPriority as setTicketPriority,
  setStatus,
  upsertDraft,
  useDrafts,
  useHealth,
  useIncidents,
  useTickets,
  type Article,
  type Ticket,
  type TicketAttachment,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support-store";
import { highlight, scoreMatch, snippet, tokenize } from "@/lib/highlight";
import {
  Activity,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  LifeBuoy,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Save,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Video,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: TicketCategory[] = [
  "Account",
  "Billing",
  "Technical",
  "Feature request",
  "Hardware",
  "Other",
];
const PRIORITIES: TicketPriority[] = ["Low", "Normal", "High", "Urgent"];
const STATUSES: TicketStatus[] = ["Open", "Pending", "Resolved", "Closed"];

const contactChannels = [
  { icon: MessageSquare, label: "Live chat", meta: "Avg reply · 2 min", hint: "Mon–Sat, 8am–10pm" },
  { icon: Mail, label: "Email support", meta: "support@smartlibrary.io", hint: "Reply within 4 hrs" },
  { icon: Phone, label: "Phone (Pro plans)", meta: "+1 (415) 555-0119", hint: "24×7 incident line" },
  { icon: Video, label: "Book a specialist", meta: "30-min screen-share", hint: "Onboarding & migrations" },
];

function priorityVariant(p: TicketPriority) {
  return p === "Urgent"
    ? "destructive"
    : p === "High"
      ? "destructive"
      : p === "Normal"
        ? "warning"
        : "muted";
}

function statusIcon(s: TicketStatus) {
  if (s === "Open") return AlertCircle;
  if (s === "Pending") return Clock;
  if (s === "Resolved") return CheckCircle2;
  return CheckCircle2;
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <GlassCard className="p-4">
      <div className="label-mono">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      <div className={`text-xs mt-1 ${tone ?? "text-muted-foreground"}`}>{hint}</div>
    </GlassCard>
  );
}

// ============================================================================
// New Ticket Dialog (with drafts + attachments)
// ============================================================================

function makeDraftId() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function NewTicketDialog({ initialDraftId }: { initialDraftId?: string | null }) {
  const [open, setOpen] = useState(false);
  const drafts = useDrafts();

  const [draftId, setDraftId] = useState<string>(() => makeDraftId());
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("Technical");
  const [priority, setPriority] = useState<TicketPriority>("Normal");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load draft when initialDraftId changes
  useEffect(() => {
    if (!initialDraftId) return;
    const d = drafts.find((x) => x.id === initialDraftId);
    if (!d) return;
    setDraftId(d.id);
    setSubject(d.subject);
    setCategory(d.category);
    setPriority(d.priority);
    setArea(d.area);
    setDescription(d.description);
    setAttachments(d.attachments);
    setOpen(true);
  }, [initialDraftId, drafts]);

  const isDirty = subject || description || area || attachments.length > 0;

  // Autosave debounce
  useEffect(() => {
    if (!open || !isDirty) return;
    const t = setTimeout(() => {
      upsertDraft({
        id: draftId,
        subject,
        category,
        priority,
        area,
        description,
        attachments,
        updatedAt: Date.now(),
      });
    }, 700);
    return () => clearTimeout(t);
  }, [open, isDirty, draftId, subject, category, priority, area, description, attachments]);

  function reset() {
    setDraftId(makeDraftId());
    setSubject("");
    setCategory("Technical");
    setPriority("Normal");
    setArea("");
    setDescription("");
    setAttachments([]);
    setErrors({});
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).slice(0, 5);
    const next: TicketAttachment[] = arr.map((f) => ({
      id: `${Date.now()}-${f.name}`,
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f),
    }));
    setAttachments((prev) => [...prev, ...next].slice(0, 5));
  }

  function submit() {
    const errs: typeof errors = {};
    if (!subject.trim() || subject.trim().length < 6) errs.subject = "Subject must be at least 6 characters.";
    if (!description.trim() || description.trim().length < 12) errs.description = "Describe the issue in at least 12 characters.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const t = createTicket({
      subject: subject.trim(),
      category,
      priority,
      area: area.trim() || undefined,
      description: description.trim(),
      attachments,
    });
    deleteDraft(draftId);
    reset();
    setOpen(false);
    toast.success("Ticket submitted", {
      description: `${t.id} · we'll get back within ${
        priority === "Urgent" ? "2h" : priority === "High" ? "4h" : "1 business day"
      }.`,
    });
  }

  function saveDraftAndClose() {
    if (isDirty) {
      upsertDraft({
        id: draftId,
        subject,
        category,
        priority,
        area,
        description,
        attachments,
        updatedAt: Date.now(),
      });
      toast.success("Draft saved", { description: "Find it under 'Saved drafts'." });
    }
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) saveDraftAndClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Open a support ticket</DialogTitle>
          <DialogDescription>
            We'll route this to the right team. Drafts autosave every few seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Label className="label-mono" htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary of the issue"
              className={errors.subject ? "border-destructive" : ""}
            />
            {errors.subject && <p className="mt-1 text-xs text-destructive">{errors.subject}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="label-mono">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-mono">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-mono">Area (optional)</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Attendance, Seats" />
            </div>
          </div>
          <div>
            <Label className="label-mono" htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, error messages, screenshots…"
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>
          <div>
            <Label className="label-mono">Attachments</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              className={`mt-1.5 rounded-md border border-dashed p-4 text-sm text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Paperclip className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              Drop files here or{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => fileRef.current?.click()}
              >
                browse
              </button>
              <div className="label-mono mt-0.5">Up to 5 files · 10 MB each</div>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm rounded-md border p-2 bg-muted/30">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className="label-mono">{formatBytes(a.size)}</span>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Draft autosaves as you type
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={saveDraftAndClose}>Save draft & close</Button>
            <Button onClick={submit}>
              <Send className="h-4 w-4 mr-1" /> Submit ticket
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Ticket detail drawer
// ============================================================================

function TicketDrawer({
  ticket,
  onClose,
}: {
  ticket: Ticket | null;
  onClose: () => void;
}) {
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"thread" | "notes" | "activity">("thread");

  useEffect(() => {
    setReply("");
    setNote("");
    setTab("thread");
  }, [ticket?.id]);

  if (!ticket) return null;

  const slaState =
    ticket.status === "Resolved" || ticket.status === "Closed"
      ? { label: "SLA met", tone: "text-emerald-500" }
      : ticket.slaDueAt < Date.now()
        ? { label: `SLA breached ${formatRelative(ticket.slaDueAt)}`, tone: "text-destructive" }
        : { label: `SLA due ${formatRelative(ticket.slaDueAt)}`, tone: "text-amber-500" };

  return (
    <Sheet open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={ticket.priority} variant={priorityVariant(ticket.priority)} />
            <StatusBadge status={ticket.status} />
            <span className="label-mono">{ticket.id}</span>
            <span className={`label-mono ml-auto ${slaState.tone}`}>
              <Clock className="inline h-3 w-3 mr-1" />
              {slaState.label}
            </span>
          </div>
          <SheetTitle className="text-left">{ticket.subject}</SheetTitle>
          <SheetDescription className="text-left">
            {ticket.category}
            {ticket.area && ` · ${ticket.area}`} · opened {formatRelative(ticket.createdAt)} via {ticket.channel}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-3 border-y flex items-center gap-3 flex-wrap">
          <Avatar className="h-8 w-8"><AvatarFallback>{initials(ticket.requester.name)}</AvatarFallback></Avatar>
          <div className="text-sm min-w-0">
            <div className="font-medium truncate">{ticket.requester.name}</div>
            <div className="text-xs text-muted-foreground truncate">{ticket.requester.email}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={ticket.assignee ?? "Unassigned"} onValueChange={(v) => setAssignee(ticket.id, v)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Unassigned", "Priya M.", "Devon R.", "Mei L.", "You (admin)"].map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ticket.priority} onValueChange={(v) => setTicketPriority(ticket.id, v as TicketPriority)}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ticket.status} onValueChange={(v) => setStatus(ticket.id, v as TicketStatus)}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 self-start">
            <TabsTrigger value="thread">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Thread
              <Badge variant="secondary" className="ml-1.5 h-4">{ticket.messages.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="notes">
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5" /> Internal notes
              {ticket.notes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4">{ticket.notes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-3.5 w-3.5 mr-1.5" /> Status timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="thread" className="flex-1 overflow-hidden flex flex-col mt-3">
            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-4">
                {ticket.messages.map((e) => (
                  <div key={e.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className={e.role === "System" ? "bg-muted" : ""}>
                        {e.role === "System" ? <Activity className="h-3.5 w-3.5" /> : initials(e.author)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-foreground">{e.author}</span>
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{e.role}</Badge>
                        <span className="text-muted-foreground">· {formatDate(e.at)}</span>
                      </div>
                      <div
                        className={`mt-1 text-sm rounded-md p-3 whitespace-pre-wrap ${
                          e.role === "System"
                            ? "bg-muted/40 text-muted-foreground italic"
                            : e.role === "Agent"
                              ? "bg-primary/5 border border-primary/10"
                              : "bg-muted/30"
                        }`}
                      >
                        {e.body}
                      </div>
                      {e.attachments && e.attachments.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {e.attachments.map((a) => (
                            <li key={a.id} className="flex items-center gap-2 text-xs rounded border p-1.5 bg-muted/30">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="flex-1 truncate">{a.name}</span>
                              <span className="label-mono">{formatBytes(a.size)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <SheetFooter className="border-t p-4 flex-col gap-2 sm:flex-col">
              <Textarea
                rows={3}
                placeholder="Write a reply — the member will be emailed."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="flex items-center gap-2 w-full">
                <Button variant="outline" size="sm"><Paperclip className="h-4 w-4 mr-1" /> Attach</Button>
                <Button variant="outline" size="sm"><Sparkles className="h-4 w-4 mr-1" /> Suggest reply</Button>
                <div className="ml-auto flex gap-2">
                  <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!reply.trim()) return;
                      addMessage(ticket.id, reply.trim());
                      setReply("");
                      toast.success("Reply sent");
                    }}
                  >
                    <Send className="h-4 w-4 mr-1" /> Send reply
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </TabsContent>

          <TabsContent value="notes" className="flex-1 overflow-hidden flex flex-col mt-3">
            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-3">
                {ticket.notes.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <ShieldAlert className="h-5 w-5 mx-auto mb-2 opacity-60" />
                    Internal notes are only visible to agents. Add context, escalations, or reminders.
                  </div>
                )}
                {ticket.notes.map((n) => (
                  <div key={n.id} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-medium">{n.author}</span>
                      <span className="text-muted-foreground">· {formatDate(n.at)}</span>
                      <Badge variant="secondary" className="ml-auto h-4 text-[10px]">Internal</Badge>
                    </div>
                    <div className="mt-1 text-sm whitespace-pre-wrap">{n.body}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <SheetFooter className="border-t p-4 flex-col gap-2 sm:flex-col">
              <Textarea
                rows={3}
                placeholder="Add an internal note (not visible to the member)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex items-center gap-2 w-full">
                <div className="text-xs text-muted-foreground">Only agents can see internal notes.</div>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!note.trim()) return;
                      addInternalNote(ticket.id, note.trim());
                      setNote("");
                      toast.success("Note added");
                    }}
                  >
                    <Save className="h-4 w-4 mr-1" /> Add note
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-auto mt-3 px-6 pb-6">
            <ol className="ml-2 border-l pl-4 space-y-4 py-2">
              {[...ticket.transitions].reverse().map((t) => (
                <li key={t.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={t.to} />
                    {t.from && (
                      <span className="text-xs text-muted-foreground">from {t.from}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {formatDate(t.at)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">Changed by <strong>{t.by}</strong></div>
                </li>
              ))}
              <li className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-muted-foreground" />
                <div className="text-sm">Ticket created via {ticket.channel}</div>
                <div className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</div>
              </li>
            </ol>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Tickets table
// ============================================================================

function TicketsTable({ data, onOpen }: { data: Ticket[]; onOpen: (t: Ticket) => void }) {
  if (data.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        <LifeBuoy className="h-6 w-6 mx-auto mb-2 opacity-60" />
        No tickets match these filters.
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {data.map((t) => {
        const Icon = statusIcon(t.status);
        return (
          <li
            key={t.id}
            onClick={() => onOpen(t)}
            className="p-4 hover:bg-muted/40 flex items-center gap-3 cursor-pointer transition-colors"
          >
            <Icon
              className={`h-4 w-4 ${
                t.status === "Open" ? "text-destructive" : t.status === "Pending" ? "text-amber-500" : "text-emerald-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{t.subject}</div>
              <div className="label-mono mt-0.5 truncate">
                {t.id} · {t.category} · {t.requester.name} · {t.channel}
                {t.notes.length > 0 && ` · ${t.notes.length} internal note${t.notes.length > 1 ? "s" : ""}`}
              </div>
            </div>
            <StatusBadge status={t.priority} variant={priorityVariant(t.priority)} />
            <StatusBadge status={t.status} />
            <span className="hidden sm:inline label-mono w-24 text-right truncate">{t.assignee}</span>
            <span className="label-mono w-20 text-right">{formatRelative(t.updatedAt)}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </li>
        );
      })}
    </ul>
  );
}

// ============================================================================
// KB with search, category filter, highlighted matches, related articles
// ============================================================================

function ArticleDrawer({
  article,
  all,
  onClose,
  onOpen,
  query,
}: {
  article: Article | null;
  all: Article[];
  onClose: () => void;
  onOpen: (a: Article) => void;
  query: string;
}) {
  if (!article) return null;
  const related = all
    .filter((a) => a.id !== article.id)
    .map((a) => ({
      a,
      score:
        a.category === article.category ? 3 : 0
        + a.tags.filter((t) => article.tags.includes(t)).length * 2,
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 4)
    .map((x) => x.a);

  return (
    <Sheet open={!!article} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{article.category}</Badge>
            <span className="label-mono ml-auto">{article.views.toLocaleString()} views</span>
          </div>
          <SheetTitle className="text-left">{highlight(article.title, query)}</SheetTitle>
          <SheetDescription className="text-left">
            Updated {formatRelative(article.updatedAt)}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">
          {highlight(article.body, query)}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {article.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
          ))}
        </div>
        {related.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="label-mono mb-2">Related articles</div>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => onOpen(r)}
                    className="w-full text-left flex items-start gap-2 rounded-md p-2 hover:bg-muted/50"
                  >
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="label-mono truncate">{r.category} · {r.views.toLocaleString()} views</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function KnowledgeBase() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  const categories = useMemo(() => {
    const set = new Set(kbArticles.map((a) => a.category));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const results = useMemo(() => {
    let list = kbArticles.filter((a) => (category === "all" ? true : a.category === category));
    const tokens = tokenize(query);
    if (tokens.length > 0) {
      list = list
        .map((a) => ({ a, score: scoreMatch([a.title, a.tags.join(" "), a.body], query) }))
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score)
        .map((x) => x.a);
    } else {
      list = [...list].sort((x, y) => y.views - x.views);
    }
    return list;
  }, [query, category]);

  const suggested = useMemo(() => {
    const top = [...kbArticles].sort((a, b) => b.views - a.views).slice(0, 4);
    return top;
  }, []);

  return (
    <>
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 120+ help articles — try 'reset password' or 'invoice'…"
              className="pl-8 h-9"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4 mr-1" /> Open full docs
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/40"
              }`}
            >
              {c === "all" ? "All categories" : c}
            </button>
          ))}
        </div>

        <div className="mb-3 text-xs text-muted-foreground">
          {results.length} article{results.length === 1 ? "" : "s"}
          {query && ` matching "${query}"`}
        </div>

        {results.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-60" />
            No articles match your search.
            <div className="mt-3">
              <div className="label-mono mb-2">Try one of these popular guides:</div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {suggested.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveArticle(s)}
                    className="px-2 py-1 rounded-md border text-xs hover:border-primary/40"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveArticle(a)}
                className="text-left rounded-lg border bg-card p-4 hover:border-primary/60 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{a.category}</Badge>
                  <span className="label-mono">{a.views.toLocaleString()} views</span>
                </div>
                <div className="mt-3 font-medium">{highlight(a.title, query)}</div>
                {query && (
                  <div className="mt-1.5 text-xs text-muted-foreground line-clamp-3">
                    {highlight(snippet(a.body, query), query)}
                  </div>
                )}
                <div className="mt-2 label-mono">Updated {formatRelative(a.updatedAt)}</div>
              </button>
            ))}
          </div>
        )}
      </GlassCard>
      <ArticleDrawer
        article={activeArticle}
        all={kbArticles}
        onClose={() => setActiveArticle(null)}
        onOpen={setActiveArticle}
        query={query}
      />
    </>
  );
}

// ============================================================================
// Drafts panel
// ============================================================================

function DraftsPanel({ onResume }: { onResume: (draftId: string) => void }) {
  const drafts = useDrafts();
  if (drafts.length === 0) return null;
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Save className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Saved drafts</h3>
        <Badge variant="secondary" className="ml-auto">{drafts.length}</Badge>
      </div>
      <ul className="space-y-1.5">
        {drafts.slice(0, 4).map((d) => (
          <li key={d.id} className="group rounded-md border p-2.5 hover:border-primary/40">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.subject || "Untitled draft"}</div>
                <div className="label-mono truncate">
                  {d.category} · {d.priority} · saved {formatRelative(d.updatedAt)}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" onClick={() => onResume(d.id)}>Resume</Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    deleteDraft(d.id);
                    toast.success("Draft deleted");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

// ============================================================================
// Main Support page
// ============================================================================

function SupportPage() {
  const tickets = useTickets();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TicketCategory>("all");
  const [active, setActive] = useState<Ticket | null>(null);
  const [resumeDraftId, setResumeDraftId] = useState<string | null>(null);

  // Keep the active drawer in sync with the store (updates flow through)
  useEffect(() => {
    if (!active) return;
    const next = tickets.find((t) => t.id === active.id);
    if (next && next !== active) setActive(next);
  }, [tickets, active]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !t.subject.toLowerCase().includes(q) &&
          !t.id.toLowerCase().includes(q) &&
          !t.requester.name.toLowerCase().includes(q) &&
          !t.tags.some((tag) => tag.toLowerCase().includes(q))
        )
          return false;
      }
      return true;
    });
  }, [tickets, query, statusFilter, priorityFilter, categoryFilter]);

  const open = tickets.filter((t) => t.status === "Open").length;
  const pending = tickets.filter((t) => t.status === "Pending").length;
  const resolved = tickets.filter((t) => t.status === "Resolved").length;

  const incidents = useIncidents();
  const healthComponents = useHealth();
  const activeIncidents = incidents.filter((i) => i.status !== "Resolved" && i.status !== "Scheduled");
  const overallHealthy = healthComponents.every((c) => c.status === "Operational");

  return (
    <>
      <PageHeader
        eyebrow="Help"
        title="Support center"
        description="Tickets, knowledge base, incident status and direct lines to our team."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/support/status">
                <Activity className="h-4 w-4 mr-1" /> System status
              </Link>
            </Button>
            <NewTicketDialog initialDraftId={resumeDraftId} />
          </div>
        }
      />

      {activeIncidents.length > 0 && (
        <GlassCard className="p-4 mb-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3 flex-wrap">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                {activeIncidents.length} active incident{activeIncidents.length > 1 ? "s" : ""} — {activeIncidents[0].title}
              </div>
              <div className="label-mono truncate">
                Affecting {activeIncidents[0].components.join(", ")} · started {formatRelative(activeIncidents[0].startedAt)}
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/support/status">View status</Link>
            </Button>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label="Open" value={String(open)} hint="Awaiting agent" tone="text-destructive" />
        <Kpi label="Pending" value={String(pending)} hint="Waiting on customer" tone="text-amber-500" />
        <Kpi label="Resolved (30d)" value={String(resolved + 18)} hint="↑ 12% vs last period" tone="text-emerald-500" />
        <Kpi
          label="System status"
          value={overallHealthy ? "All good" : "Degraded"}
          hint={overallHealthy ? "All services operational" : `${activeIncidents.length} incident(s)`}
          tone={overallHealthy ? "text-emerald-500" : "text-amber-500"}
        />
      </div>

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets"><LifeBuoy className="h-4 w-4 mr-1.5" /> Tickets</TabsTrigger>
          <TabsTrigger value="kb"><BookOpen className="h-4 w-4 mr-1.5" /> Knowledge base</TabsTrigger>
          <TabsTrigger value="contact"><MessageSquare className="h-4 w-4 mr-1.5" /> Contact</TabsTrigger>
          <TabsTrigger value="status"><Activity className="h-4 w-4 mr-1.5" /> System status</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard className="lg:col-span-2 p-0 overflow-hidden">
              <div className="p-3 border-b flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by subject, ID, requester or tag…"
                    className="pl-8 h-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
                  <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priority</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
                  <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TicketsTable data={filtered} onOpen={setActive} />
            </GlassCard>

            <div className="space-y-4">
              <DraftsPanel onResume={(id) => setResumeDraftId(id)} />

              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Ask the assistant</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Get instant answers grounded in your library's docs and ticket history.
                </p>
                <div className="flex gap-2">
                  <Input placeholder="e.g. How do I refund a member?" className="h-9" />
                  <Button size="sm"><Send className="h-4 w-4" /></Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["Refund flow", "QR pairing", "Bulk import", "Shift rules"].map((s) => (
                    <Badge key={s} variant="secondary" className="cursor-pointer">{s}</Badge>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="font-semibold mb-3">Popular articles</h3>
                <ul className="space-y-2 text-sm">
                  {[...kbArticles].sort((a, b) => b.views - a.views).slice(0, 5).map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center gap-2 hover:text-primary cursor-pointer group"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      <span className="flex-1 truncate">{q.title}</span>
                      <span className="label-mono">{q.views.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kb" className="mt-4">
          <KnowledgeBase />
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contactChannels.map((c) => (
              <GlassCard key={c.label} className="p-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{c.label}</div>
                  <div className="text-sm text-muted-foreground">{c.meta}</div>
                  <div className="label-mono mt-1">{c.hint}</div>
                </div>
                <Button size="sm" variant="outline">Open</Button>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span
                className={`inline-block h-2 w-2 rounded-full animate-pulse ${
                  overallHealthy ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="font-semibold">
                {overallHealthy ? "All systems operational" : "Some services degraded"}
              </span>
              <span className="label-mono ml-auto">Updated 2 min ago</span>
              <Button asChild size="sm" variant="outline">
                <Link to="/support/status">Full status page <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
            <ul className="divide-y">
              {healthComponents.map((s) => (
                <li key={s.name} className="py-3 flex items-center gap-3">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{s.name}</span>
                  <span className="label-mono ml-auto">
                    {(
                      (s.uptime90.reduce((a, b) => a + b, 0) / s.uptime90.length) * 100
                    ).toFixed(2)}
                    % · 90d
                  </span>
                  <StatusBadge
                    status={s.status}
                    variant={s.status === "Operational" ? "success" : "warning"}
                  />
                </li>
              ))}
            </ul>
          </GlassCard>
        </TabsContent>
      </Tabs>

      <TicketDrawer ticket={active} onClose={() => setActive(null)} />
    </>
  );
}

export const Route = createFileRoute("/_authenticated/support/")({
  head: () => ({ meta: [{ title: "Support — SmartLibrary" }] }),
  component: SupportPage,
});
