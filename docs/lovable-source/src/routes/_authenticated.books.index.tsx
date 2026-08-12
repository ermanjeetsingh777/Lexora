import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Donut } from "@/components/charts";
import { books as seedBooks, members } from "@/lib/mock/data";
import type { Book } from "@/lib/mock/data";
import {
  BookOpen, Plus, Search, ArrowUpDown, LayoutGrid, List,
  Download, Library, AlertTriangle, PackageX, Hash, Copy,
  Minus, Wrench, History, ArrowDownToLine, ArrowUpFromLine,
  CheckCircle2, XCircle, Pencil,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/books/")({
  head: () => ({ meta: [{ title: "Books — SmartLibrary" }] }),
  component: BooksPage,
});

type SortKey = "title" | "author" | "available" | "category";

// ─── Activity / audit types ────────────────────────────────────────────────
type ActivityType = "borrow" | "return" | "overdue";
interface Activity {
  id: string;
  bookId: string;
  memberId: string;
  memberName: string;
  type: ActivityType;
  date: string; // ISO
}

type AuditType = "adjust" | "damaged" | "lost" | "added" | "edited";
interface AuditEntry {
  id: string;
  bookId: string;
  type: AuditType;
  delta?: number;
  note?: string;
  actor: string;
  timestamp: string; // ISO
}

// Deterministic seed
function seedActivities(): Activity[] {
  const out: Activity[] = [];
  let n = 0;
  seedBooks.forEach((b, bi) => {
    const count = 6 + (bi % 4);
    for (let i = 0; i < count; i++) {
      const m = members[(bi * 7 + i * 3) % members.length];
      const daysAgo = (i * 3 + bi) % 45;
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const type: ActivityType = i % 5 === 0 ? "overdue" : i % 2 === 0 ? "borrow" : "return";
      out.push({
        id: `act_${++n}`,
        bookId: b.id,
        memberId: m.id,
        memberName: m.name,
        type,
        date: d.toISOString(),
      });
    }
  });
  return out;
}

function BooksPage() {
  const [rows, setRows] = useState<Book[]>(seedBooks);
  const [activities] = useState<Activity[]>(() => seedActivities());
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("title");
  const [view, setView] = useState<"grid" | "table">("table");
  const [active, setActive] = useState<Book | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorBook, setEditorBook] = useState<Book | null>(null);

  // keep active book in sync with rows
  const activeFresh = active ? rows.find((b) => b.id === active.id) ?? null : null;

  const categories = useMemo(
    () => Array.from(new Set(rows.map((b) => b.category))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((b) => {
        if (category !== "all" && b.category !== category) return false;
        if (status !== "all" && b.status !== status) return false;
        if (!q) return true;
        return (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.includes(q)
        );
      })
      .sort((a, b) => {
        if (sort === "available") return b.available - a.available;
        return String(a[sort]).localeCompare(String(b[sort]));
      });
  }, [rows, query, category, status, sort]);

  const stats = useMemo(() => {
    const total = rows.reduce((s, b) => s + b.copies, 0);
    const avail = rows.reduce((s, b) => s + b.available, 0);
    const low = rows.filter((b) => b.status === "LowStock").length;
    const out = rows.filter((b) => b.status === "OutOfStock").length;
    return { total, avail, low, out, titles: rows.length };
  }, [rows]);

  const donut = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((b) => map.set(b.category, (map.get(b.category) ?? 0) + b.copies));
    const palette = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7", "#ef4444"];
    return [...map.entries()].map(([name, value], i) => ({
      name, value, color: palette[i % palette.length],
    }));
  }, [rows]);

  const exportCsv = () => {
    const out = [
      ["Title", "Author", "Category", "ISBN", "Available", "Copies", "Status"],
      ...filtered.map((b) => [b.title, b.author, b.category, b.isbn, b.available, b.copies, b.status]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "books.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} books`);
  };

  // ─── Mutations ────────────────────────────────────────────────────────────
  const computeStatus = (available: number, copies: number): Book["status"] =>
    available === 0 ? "OutOfStock" : available <= Math.max(2, Math.round(copies * 0.25)) ? "LowStock" : "Available";

  const logAudit = (entry: Omit<AuditEntry, "id" | "timestamp" | "actor"> & { actor?: string }) => {
    setAudit((arr) => [
      {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        actor: entry.actor ?? "You",
        ...entry,
      },
      ...arr,
    ]);
  };

  const adjustAvailable = (book: Book, delta: number, note: string) => {
    setRows((arr) =>
      arr.map((r) => {
        if (r.id !== book.id) return r;
        const next = Math.max(0, Math.min(r.copies, r.available + delta));
        return { ...r, available: next, status: computeStatus(next, r.copies) };
      }),
    );
    logAudit({ bookId: book.id, type: "adjust", delta, note });
    toast.success(`Adjusted available by ${delta > 0 ? "+" : ""}${delta}`);
  };

  const markCondition = (book: Book, kind: "damaged" | "lost") => {
    setRows((arr) =>
      arr.map((r) => {
        if (r.id !== book.id) return r;
        const copies = Math.max(0, r.copies - 1);
        const available = Math.min(r.available, copies);
        return { ...r, copies, available, status: computeStatus(available, copies) };
      }),
    );
    logAudit({ bookId: book.id, type: kind, delta: -1, note: `Marked ${kind}` });
    toast.success(`Marked 1 copy as ${kind}`);
  };

  const upsertBook = (b: Book, isNew: boolean) => {
    setRows((arr) => (isNew ? [b, ...arr] : arr.map((r) => (r.id === b.id ? b : r))));
    logAudit({ bookId: b.id, type: isNew ? "added" : "edited", note: b.title });
    toast.success(isNew ? "Book added" : "Book updated");
  };

  const openEditor = (book: Book | null) => {
    setEditorBook(book);
    setEditorOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Books"
        description="Catalog with stock levels, categories, and availability."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button size="sm" onClick={() => openEditor(null)}>
              <Plus className="h-4 w-4 mr-1" /> Add book
            </Button>
          </>
        }
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <Kpi icon={<Library className="h-4 w-4" />} label="Unique titles" value={stats.titles} />
        <Kpi icon={<BookOpen className="h-4 w-4" />} label="Total copies" value={stats.total} sub={`${stats.avail} available`} />
        <Kpi icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Low stock" value={stats.low} tone="warn" />
        <Kpi icon={<PackageX className="h-4 w-4 text-rose-500" />} label="Out of stock" value={stats.out} tone="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <GlassCard className="p-5 lg:col-span-2 space-y-4">
          <SectionHeader title="Catalog" description={`${filtered.length} of ${rows.length} books`} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, author, ISBN…"
                className="pl-8 h-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="LowStock">Low stock</SelectItem>
                <SelectItem value="OutOfStock">Out of stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-[140px]"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="author">Author</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="available">Most available</SelectItem>
              </SelectContent>
            </Select>
            <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "table")}>
              <TabsList className="h-9">
                <TabsTrigger value="table" className="h-7 px-2"><List className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="grid" className="h-7 px-2"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No books match your filters.
            </div>
          ) : view === "table" ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-y label-mono">
                    <th className="py-2 px-1">Title</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th>ISBN</th>
                    <th className="text-right">Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setActive(b)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-1">
                        <div className="flex items-center gap-2.5">
                          <BookCover title={b.title} />
                          <span className="font-medium">{b.title}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{b.author}</td>
                      <td>
                        <Badge variant="secondary" className="font-normal">{b.category}</Badge>
                      </td>
                      <td className="font-mono text-xs text-muted-foreground">{b.isbn}</td>
                      <td className="text-right tabular-nums">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span>{b.available}/{b.copies}</span>
                          <Progress value={(b.available / Math.max(1, b.copies)) * 100} className="h-1 w-16" />
                        </div>
                      </td>
                      <td><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setActive(b)}
                  className="group text-left rounded-xl border bg-card hover:shadow-md transition-all p-3 space-y-2.5"
                >
                  <BookCover title={b.title} large />
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary">{b.title}</div>
                    <div className="text-xs text-muted-foreground">{b.author}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-normal text-[10px]">{b.category}</Badge>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={(b.available / Math.max(1, b.copies)) * 100} className="h-1 flex-1" />
                    <span className="text-[11px] tabular-nums text-muted-foreground">{b.available}/{b.copies}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="By category" description="Copies per category" />
          <Donut data={donut} />
          <div className="mt-3 space-y-1.5">
            {donut.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span>{d.name}</span>
                </div>
                <span className="tabular-nums text-muted-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {activeFresh && (
            <BookDetail
              book={activeFresh}
              activities={activities.filter((a) => a.bookId === activeFresh.id)}
              audit={audit.filter((a) => a.bookId === activeFresh.id)}
              onAdjust={(delta, note) => adjustAvailable(activeFresh, delta, note)}
              onMark={(kind) => markCondition(activeFresh, kind)}
              onEdit={() => openEditor(activeFresh)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit drawer */}
      <BookEditor
        open={editorOpen}
        book={editorBook}
        onClose={() => setEditorOpen(false)}
        onSave={(b, isNew) => {
          upsertBook(b, isNew);
          setEditorOpen(false);
          if (!isNew) setActive(b);
        }}
        existingIsbns={rows.map((r) => r.isbn)}
      />
    </>
  );
}

// ─── Detail drawer ─────────────────────────────────────────────────────────
function BookDetail({
  book, activities, audit, onAdjust, onMark, onEdit,
}: {
  book: Book;
  activities: Activity[];
  audit: AuditEntry[];
  onAdjust: (delta: number, note: string) => void;
  onMark: (kind: "damaged" | "lost") => void;
  onEdit: () => void;
}) {
  return (
    <>
      <SheetHeader>
        <SheetDescription className="label-mono">{book.category}</SheetDescription>
        <SheetTitle className="text-xl">{book.title}</SheetTitle>
        <SheetDescription>by {book.author}</SheetDescription>
      </SheetHeader>

      <div className="mt-5 flex items-start gap-4">
        <BookCover title={book.title} large />
        <div className="flex-1 space-y-2">
          <StatusBadge status={book.status} />
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available</span>
              <span className="tabular-nums font-medium">{book.available} / {book.copies}</span>
            </div>
            <Progress value={(book.available / Math.max(1, book.copies)) * 100} className="h-1.5 mt-1.5" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <Row icon={<Hash className="h-3.5 w-3.5" />} label="ISBN" value={
          <button
            className="font-mono text-xs inline-flex items-center gap-1 hover:text-primary"
            onClick={() => { navigator.clipboard.writeText(book.isbn); toast.success("ISBN copied"); }}
          >
            {book.isbn} <Copy className="h-3 w-3" />
          </button>
        } />
        <Row icon={<BookOpen className="h-3.5 w-3.5" />} label="Total copies" value={book.copies} />
        <Row icon={<Library className="h-3.5 w-3.5" />} label="Checked out" value={book.copies - book.available} />
      </div>

      <Tabs defaultValue="activity" className="mt-6">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline activities={activities} />
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <StockControls book={book} onAdjust={onAdjust} onMark={onMark} />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditTimeline entries={audit} />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ─── Activity timeline (borrow/return) with filters ────────────────────────
function ActivityTimeline({ activities }: { activities: Activity[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [member, setMember] = useState<string>("all");

  const memberOptions = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach((a) => map.set(a.memberId, a.memberName));
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [activities]);

  const filtered = useMemo(() => {
    return activities
      .filter((a) => {
        if (member !== "all" && a.memberId !== member) return false;
        const d = a.date.slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activities, member, from, to]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] label-mono">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-[10px] label-mono">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-[10px] label-mono">Member</Label>
        <Select value={member} onValueChange={setMember}>
          <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {memberOptions.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(from || to || member !== "all") && (
        <button
          onClick={() => { setFrom(""); setTo(""); setMember("all"); }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear filters
        </button>
      )}

      <Separator />

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">No activity in this range.</div>
      ) : (
        <ol className="relative border-l border-border pl-4 space-y-3">
          {filtered.map((a) => {
            const cfg = a.type === "borrow"
              ? { icon: <ArrowUpFromLine className="h-3 w-3" />, label: "Borrowed", tone: "bg-blue-500" }
              : a.type === "return"
              ? { icon: <ArrowDownToLine className="h-3 w-3" />, label: "Returned", tone: "bg-emerald-500" }
              : { icon: <AlertTriangle className="h-3 w-3" />, label: "Overdue", tone: "bg-amber-500" };
            return (
              <li key={a.id} className="relative">
                <span className={`absolute -left-[22px] top-1 h-4 w-4 rounded-full ${cfg.tone} text-white grid place-items-center`}>
                  {cfg.icon}
                </span>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">{cfg.label}</span>
                    <span className="text-muted-foreground"> by {a.memberName}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {new Date(a.date).toLocaleDateString()}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ─── Stock controls ─────────────────────────────────────────────────────────
function StockControls({
  book, onAdjust, onMark,
}: {
  book: Book;
  onAdjust: (delta: number, note: string) => void;
  onMark: (kind: "damaged" | "lost") => void;
}) {
  const [delta, setDelta] = useState(1);
  const [note, setNote] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Adjust available copies</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {book.available} / {book.copies}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon" variant="outline" className="h-8 w-8"
            onClick={() => setDelta((d) => d - 1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value) || 0)}
            className="h-8 text-center tabular-nums"
          />
          <Button
            size="icon" variant="outline" className="h-8 w-8"
            onClick={() => setDelta((d) => d + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Input
          placeholder="Note (e.g. returned from rebinding)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-8 text-sm"
        />
        <Button
          size="sm" className="w-full" disabled={delta === 0}
          onClick={() => {
            onAdjust(delta, note || (delta > 0 ? "Manual restock" : "Manual decrement"));
            setDelta(1); setNote("");
          }}
        >
          Apply adjustment
        </Button>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="text-sm font-medium">Report condition</div>
        <div className="text-xs text-muted-foreground">Removes 1 copy from total inventory.</div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => onMark("damaged")} disabled={book.copies === 0}>
            <Wrench className="h-3.5 w-3.5 mr-1" /> Damaged
          </Button>
          <Button size="sm" variant="outline" onClick={() => onMark("lost")} disabled={book.copies === 0}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Lost
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Audit timeline ────────────────────────────────────────────────────────
function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        <History className="h-5 w-5 mx-auto mb-2 opacity-50" />
        No adjustments yet. Changes you make will appear here.
      </div>
    );
  }
  return (
    <ol className="relative border-l border-border pl-4 space-y-3">
      {entries.map((e) => {
        const cfg =
          e.type === "damaged" ? { icon: <Wrench className="h-3 w-3" />, tone: "bg-amber-500", label: "Damaged" } :
          e.type === "lost" ? { icon: <XCircle className="h-3 w-3" />, tone: "bg-rose-500", label: "Lost" } :
          e.type === "added" ? { icon: <Plus className="h-3 w-3" />, tone: "bg-emerald-500", label: "Added" } :
          e.type === "edited" ? { icon: <Pencil className="h-3 w-3" />, tone: "bg-blue-500", label: "Edited" } :
          { icon: <CheckCircle2 className="h-3 w-3" />, tone: "bg-indigo-500", label: "Adjustment" };
        return (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[22px] top-1 h-4 w-4 rounded-full ${cfg.tone} text-white grid place-items-center`}>
              {cfg.icon}
            </span>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{cfg.label}</span>
                {typeof e.delta === "number" && (
                  <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                    ({e.delta > 0 ? "+" : ""}{e.delta})
                  </span>
                )}
                {e.note && <span className="text-muted-foreground"> — {e.note}</span>}
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {new Date(e.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">by {e.actor}</div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Add/Edit drawer ───────────────────────────────────────────────────────
function isValidIsbn(raw: string): boolean {
  const s = raw.replace(/[-\s]/g, "");
  if (!/^\d{13}$/.test(s)) return false;
  const digits = s.split("").map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === digits[12];
}

function BookEditor({
  open, book, onClose, onSave, existingIsbns,
}: {
  open: boolean;
  book: Book | null;
  onClose: () => void;
  onSave: (b: Book, isNew: boolean) => void;
  existingIsbns: string[];
}) {
  const isNew = !book;
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [isbn, setIsbn] = useState("");
  const [copies, setCopies] = useState(1);
  const [available, setAvailable] = useState(1);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(book?.title ?? "");
    setAuthor(book?.author ?? "");
    setCategory(book?.category ?? "");
    setIsbn(book?.isbn ?? "");
    setCopies(book?.copies ?? 1);
    setAvailable(book?.available ?? 1);
    setDescription("");
  }, [open, book]);

  const isbnClean = isbn.replace(/[-\s]/g, "");
  const isbnValid = isValidIsbn(isbn);
  const isbnDuplicate =
    isbnValid &&
    existingIsbns.some((x) => x === isbnClean && x !== book?.isbn);

  const titleValid = title.trim().length >= 2;
  const authorValid = author.trim().length >= 2;
  const categoryValid = category.trim().length >= 2;
  const copiesValid = copies >= 0 && Number.isInteger(copies);
  const availableValid = available >= 0 && available <= copies;
  const formValid =
    titleValid && authorValid && categoryValid && isbnValid && !isbnDuplicate && copiesValid && availableValid;

  const handleSave = () => {
    if (!formValid) return;
    const computed: Book["status"] =
      available === 0 ? "OutOfStock" : available <= Math.max(2, Math.round(copies * 0.25)) ? "LowStock" : "Available";
    const next: Book = {
      id: book?.id ?? `bk_${Date.now()}`,
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      isbn: isbnClean,
      copies,
      available,
      status: computed,
    };
    onSave(next, isNew);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetDescription className="label-mono">{isNew ? "New book" : "Editing"}</SheetDescription>
          <SheetTitle>{isNew ? "Add a book" : `Edit ${book?.title}`}</SheetTitle>
          <SheetDescription>
            Fill metadata and inventory counts. ISBN is validated (ISBN-13).
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <Field label="Title" required valid={titleValid} touched={title.length > 0} error="Title is too short">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Pragmatic Programmer" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Author" required valid={authorValid} touched={author.length > 0} error="Author is too short">
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Andy Hunt" />
            </Field>
            <Field label="Category" required valid={categoryValid} touched={category.length > 0} error="Category required">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Engineering" />
            </Field>
          </div>

          <Field
            label="ISBN-13"
            required
            valid={isbnValid && !isbnDuplicate}
            touched={isbn.length > 0}
            error={
              !isbnValid ? "Must be a valid 13-digit ISBN" :
              isbnDuplicate ? "Another book already uses this ISBN" : ""
            }
          >
            <Input
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="9780201616224"
              className="font-mono"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Total copies" required valid={copiesValid} touched error="Must be a positive integer">
              <Input
                type="number" min={0} value={copies}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value) || 0);
                  setCopies(v);
                  if (available > v) setAvailable(v);
                }}
              />
            </Field>
            <Field
              label="Available now"
              required
              valid={availableValid}
              touched
              error="Cannot exceed total copies"
            >
              <Input
                type="number" min={0} max={copies} value={available}
                onChange={(e) => setAvailable(Math.max(0, Number(e.target.value) || 0))}
              />
            </Field>
          </div>

          <Field label="Notes" valid touched={false} error="">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal notes (optional)"
              rows={3}
            />
          </Field>
        </div>

        <SheetFooter className="mt-6 flex-row gap-2 sm:justify-end">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 sm:flex-none" disabled={!formValid} onClick={handleSave}>
            {isNew ? "Add book" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label, required, valid, touched, error, children,
}: {
  label: string;
  required?: boolean;
  valid: boolean;
  touched: boolean;
  error: string;
  children: React.ReactNode;
}) {
  const showError = touched && !valid && error;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
      {showError && <div className="text-[11px] text-rose-500">{error}</div>}
    </div>
  );
}

// ─── Small atoms ───────────────────────────────────────────────────────────
function Kpi({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: number | string; sub?: string; tone?: "warn" | "danger" }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="label-mono text-[10px]">{label}</span>
        {icon}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-rose-500" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </GlassCard>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">{icon}{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function BookCover({ title, large = false }: { title: string; large?: boolean }) {
  const hue = [...title].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  const initials = title
    .split(" ")
    .filter((w) => /[A-Za-z]/.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center rounded-md text-white font-semibold shadow-sm ${large ? "h-24 w-16 text-lg" : "h-8 w-6 text-[10px]"}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`,
      }}
    >
      {initials}
    </div>
  );
}
