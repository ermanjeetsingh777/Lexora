import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, GlassCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listInstitutions, listBranches, listLibraries, listPlans } from "@/lib/org.functions";
import { createMember, createStudent, createTeacher } from "@/lib/people.functions";

type Kind = "members" | "students" | "teachers";

export function PersonCreateForm({ kind }: { kind: Kind }) {
  const navigate = useNavigate() as (opts: any) => void;
  const qc = useQueryClient();
  const fetchInst = useServerFn(listInstitutions);
  const fetchBranches = useServerFn(listBranches);
  const fetchLibs = useServerFn(listLibraries);
  const fetchPlans = useServerFn(listPlans);
  const createFn = useServerFn(kind === "members" ? createMember : kind === "students" ? createStudent : createTeacher);

  const { data: insts = [] } = useQuery({ queryKey: ["institutions"], queryFn: () => fetchInst() });
  const [institutionId, setInstitutionId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [libraryId, setLibraryId] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [shift, setShift] = useState("Morning");
  const [form, setForm] = useState<Record<string, string>>({ name: "", email: "", phone: "" });
  const [extra, setExtra] = useState<Record<string, string>>({ roll_no: "", class_grade: "", guardian_name: "", guardian_phone: "", subject: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!institutionId && insts[0]) setInstitutionId(insts[0].id); }, [insts, institutionId]);

  const { data: branches = [] } = useQuery({ queryKey: ["branches", institutionId], queryFn: () => fetchBranches({ data: { institutionId } }), enabled: !!institutionId });
  const { data: libraries = [] } = useQuery({ queryKey: ["libraries", branchId], queryFn: () => fetchLibs({ data: { branchId } }), enabled: !!branchId });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });

  useEffect(() => { if (!branchId && branches[0]) setBranchId(branches[0].id); }, [branches, branchId]);
  useEffect(() => { if (!libraryId && libraries[0]) setLibraryId(libraries[0].id); }, [libraries, libraryId]);

  const titles: Record<Kind, { eyebrow: string; title: string; back: any }> = {
    members: { eyebrow: "Members", title: "Add a member", back: "/members" },
    students: { eyebrow: "Students", title: "Add a student", back: "/students" },
    teachers: { eyebrow: "Teachers", title: "Add a teacher", back: "/teachers" },
  };
  const meta = titles[kind];

  return (
    <>
      <PageHeader eyebrow={meta.eyebrow} title={meta.title} description="Assign to a branch and (where applicable) a library, shift and plan." />
      <GlassCard className="p-6 max-w-2xl">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (!institutionId || !branchId || (kind !== "teachers" && !libraryId)) {
            toast.error("Pick institution, branch" + (kind !== "teachers" ? " and library" : "")); return;
          }
          setBusy(true);
          try {
            const base: any = { institution_id: institutionId, branch_id: branchId, name: form.name, email: form.email, phone: form.phone, status: "Active" };
            if (kind === "members") await (createFn as any)({ data: { ...base, library_id: libraryId, shift, plan_id: planId || undefined } });
            else if (kind === "students") await (createFn as any)({ data: { ...base, library_id: libraryId, shift, plan_id: planId || undefined, roll_no: extra.roll_no, class_grade: extra.class_grade, guardian_name: extra.guardian_name, guardian_phone: extra.guardian_phone } });
            else await (createFn as any)({ data: { ...base, subject: extra.subject } });
            await qc.invalidateQueries({ queryKey: [kind] });
            toast.success("Created");
            navigate({ to: meta.back });
          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          finally { setBusy(false); }
        }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Institution *</Label>
              <Select value={institutionId} onValueChange={(v) => { setInstitutionId(v); setBranchId(""); setLibraryId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{insts.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Branch *</Label>
              <Select value={branchId} onValueChange={(v) => { setBranchId(v); setLibraryId(""); }} disabled={!institutionId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {kind !== "teachers" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Library *</Label>
                <Select value={libraryId} onValueChange={setLibraryId} disabled={!branchId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{libraries.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Shift</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Morning","Afternoon","Evening","Night"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Plan</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger><SelectValue placeholder={plans.length ? "Select" : "None"} /></SelectTrigger>
                  <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Full name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>

          {kind === "students" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Roll number</Label><Input value={extra.roll_no} onChange={(e) => setExtra({ ...extra, roll_no: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Class / Grade</Label><Input value={extra.class_grade} onChange={(e) => setExtra({ ...extra, class_grade: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Guardian name</Label><Input value={extra.guardian_name} onChange={(e) => setExtra({ ...extra, guardian_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Guardian phone</Label><Input value={extra.guardian_phone} onChange={(e) => setExtra({ ...extra, guardian_phone: e.target.value })} /></div>
            </div>
          )}
          {kind === "teachers" && (
            <div className="space-y-1.5"><Label>Subject</Label><Input value={extra.subject} onChange={(e) => setExtra({ ...extra, subject: e.target.value })} /></div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => navigate({ to: meta.back })}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </GlassCard>
    </>
  );
}
