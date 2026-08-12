import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, GlassCard } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Download } from "lucide-react";
import { listPeople } from "@/lib/people.functions";

type Kind = "members" | "students" | "teachers";

const titles: Record<Kind, { eyebrow: string; title: string; createTo: any; profileTo: any; param: string }> = {
  members: { eyebrow: "Operations", title: "Members", createTo: "/members/create", profileTo: "/members/$memberId", param: "memberId" },
  students: { eyebrow: "People", title: "Students", createTo: "/students/create", profileTo: "/students/$studentId", param: "studentId" },
  teachers: { eyebrow: "People", title: "Teachers", createTo: "/teachers/create", profileTo: "/teachers/$teacherId", param: "teacherId" },
};

export function PeopleList({ kind }: { kind: Kind }) {
  const meta = titles[kind];
  const fetch = useServerFn(listPeople);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: [kind, "list"],
    queryFn: () => fetch({ data: { kind } }).catch(() => [] as any[]),
    retry: false,
  });
  const filtered = rows.filter((r: any) =>
    (status === "All" || r.status === status) &&
    (r.name?.toLowerCase().includes(q.toLowerCase()) || (r.email ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={`${rows.length.toLocaleString()} records.`}
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
            <Button size="sm" asChild><Link to={meta.createTo}><Plus className="h-4 w-4 mr-1" /> Add</Link></Button>
          </>
        }
      />
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {["All","Active","Inactive","Suspended"].map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s}</Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-y label-mono bg-muted/30">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Status</th>
                {kind !== "teachers" && <th className="px-2 py-2 font-medium">Shift</th>}
                {kind === "students" && <th className="px-2 py-2 font-medium">Roll / Class</th>}
                {kind === "teachers" && <th className="px-2 py-2 font-medium">Subject</th>}
                <th className="px-2 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No records yet</td></tr>}
              {filtered.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <Link to={meta.profileTo} params={{ [meta.param]: r.id } as any} className="flex items-center gap-2 group">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{r.name.split(" ").map((p: string) => p[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                      <div>
                        <div className="font-medium group-hover:text-primary">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email ?? "—"}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-2 py-2.5"><StatusBadge status={r.status ?? "Active"} /></td>
                  {kind !== "teachers" && <td className="px-2 py-2.5 text-muted-foreground">{r.shift ?? "—"}</td>}
                  {kind === "students" && <td className="px-2 py-2.5 text-muted-foreground text-xs">{r.roll_no ?? "—"} · {r.class_grade ?? "—"}</td>}
                  {kind === "teachers" && <td className="px-2 py-2.5 text-muted-foreground">{r.subject ?? "—"}</td>}
                  <td className="px-2 py-2.5 text-muted-foreground">{r.phone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.join_date ?? new Date(r.created_at).toISOString().slice(0,10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </>
  );
}
