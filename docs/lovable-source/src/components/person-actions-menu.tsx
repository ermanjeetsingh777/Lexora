import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Settings2, ArrowRightLeft, Armchair, Clock, BadgeDollarSign } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBranches, listLibraries, listSeats, listPlans } from "@/lib/org.functions";
import { transferBranch, transferSeat, changeShift, changePlan } from "@/lib/people.functions";
import { toast } from "sonner";

type Kind = "members" | "students" | "teachers";

export function PersonActionsMenu({ kind, person, onChanged }: {
  kind: Kind;
  person: { id: string; institution_id: string; branch_id: string; library_id?: string | null; seat_id?: string | null; shift?: string | null; plan_id?: string | null };
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState<null | "branch" | "seat" | "shift" | "plan">(null);
  const isTeacher = kind === "teachers";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm"><Settings2 className="h-4 w-4 mr-1" /> Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Manage</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen("branch")}><ArrowRightLeft className="h-4 w-4 mr-2" /> Transfer branch</DropdownMenuItem>
          {!isTeacher && <DropdownMenuItem onClick={() => setOpen("seat")}><Armchair className="h-4 w-4 mr-2" /> Reassign seat</DropdownMenuItem>}
          {!isTeacher && <DropdownMenuItem onClick={() => setOpen("shift")}><Clock className="h-4 w-4 mr-2" /> Change shift</DropdownMenuItem>}
          {!isTeacher && <DropdownMenuItem onClick={() => setOpen("plan")}><BadgeDollarSign className="h-4 w-4 mr-2" /> Upgrade plan</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <BranchTransferDialog open={open === "branch"} onOpenChange={(v: boolean) => !v && setOpen(null)} kind={kind} person={person} onChanged={onChanged} />
      {!isTeacher && <SeatTransferDialog open={open === "seat"} onOpenChange={(v: boolean) => !v && setOpen(null)} kind={kind} person={person} onChanged={onChanged} />}
      {!isTeacher && <ShiftChangeDialog open={open === "shift"} onOpenChange={(v: boolean) => !v && setOpen(null)} kind={kind} person={person} onChanged={onChanged} />}
      {!isTeacher && <PlanChangeDialog open={open === "plan"} onOpenChange={(v: boolean) => !v && setOpen(null)} kind={kind} person={person} onChanged={onChanged} />}
    </>
  );
}

function useInvalidate(onChanged?: () => void) {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries();
    onChanged?.();
  };
}

function BranchTransferDialog({ open, onOpenChange, kind, person, onChanged }: any) {
  const fetchBranches = useServerFn(listBranches);
  const fetchLibraries = useServerFn(listLibraries);
  const act = useServerFn(transferBranch);
  const inv = useInvalidate(onChanged);
  const [toBranch, setToBranch] = useState("");
  const [toLibrary, setToLibrary] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: branches } = useQuery({ queryKey: ["branches", person.institution_id], queryFn: () => fetchBranches({ data: { institutionId: person.institution_id } }), enabled: open });
  const { data: libraries } = useQuery({ queryKey: ["libraries", toBranch], queryFn: () => fetchLibraries({ data: { branchId: toBranch } }), enabled: !!toBranch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer to another branch</DialogTitle>
          <DialogDescription>Move this person to a different branch. Their seat will be cleared.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Destination branch</Label>
            <Select value={toBranch} onValueChange={(v) => { setToBranch(v); setToLibrary(""); }}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {(branches ?? []).filter((b: any) => b.id !== person.branch_id).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {kind !== "teachers" && (
            <div className="space-y-1.5">
              <Label>Destination library (optional)</Label>
              <Select value={toLibrary} onValueChange={setToLibrary} disabled={!toBranch}>
                <SelectTrigger><SelectValue placeholder="Select library" /></SelectTrigger>
                <SelectContent>{(libraries ?? []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!toBranch || busy} onClick={async () => {
            setBusy(true);
            try {
              await act({ data: { kind, id: person.id, to_branch_id: toBranch, to_library_id: toLibrary || undefined, reason: reason || undefined } });
              toast.success("Branch transfer complete");
              await inv(); onOpenChange(false);
            } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            finally { setBusy(false); }
          }}>Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeatTransferDialog({ open, onOpenChange, kind, person, onChanged }: any) {
  const fetchSeats = useServerFn(listSeats);
  const act = useServerFn(transferSeat);
  const inv = useInvalidate(onChanged);
  const [seatId, setSeatId] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: seats } = useQuery({ queryKey: ["seats", person.library_id], queryFn: () => fetchSeats({ data: { libraryId: person.library_id! } }), enabled: open && !!person.library_id });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign seat</DialogTitle>
          <DialogDescription>Pick an available seat in the current library.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Seat</Label>
          <Select value={seatId} onValueChange={setSeatId}>
            <SelectTrigger><SelectValue placeholder="Select seat" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {(seats ?? []).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.number} · {s.type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!seatId || busy} onClick={async () => {
            setBusy(true);
            try { await act({ data: { kind, id: person.id, to_seat_id: seatId } }); toast.success("Seat updated"); await inv(); onOpenChange(false); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            finally { setBusy(false); }
          }}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShiftChangeDialog({ open, onOpenChange, kind, person, onChanged }: any) {
  const act = useServerFn(changeShift);
  const inv = useInvalidate(onChanged);
  const [shift, setShift] = useState<string>(person.shift ?? "Morning");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Change shift</DialogTitle><DialogDescription>Current: {person.shift ?? "—"}</DialogDescription></DialogHeader>
        <div className="space-y-1.5">
          <Label>New shift</Label>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["Morning","Afternoon","Evening","Night"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            try { await act({ data: { kind, id: person.id, to_shift: shift as any } }); toast.success("Shift updated"); await inv(); onOpenChange(false); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            finally { setBusy(false); }
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanChangeDialog({ open, onOpenChange, kind, person, onChanged }: any) {
  const fetchPlans = useServerFn(listPlans);
  const act = useServerFn(changePlan);
  const inv = useInvalidate(onChanged);
  const [planId, setPlanId] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans(), enabled: open });
  const current = (plans ?? []).find((p: any) => p.id === person.plan_id);
  const next = (plans ?? []).find((p: any) => p.id === planId);
  const delta = next && current ? Number(next.price) - Number(current.price) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
          <DialogDescription>Current: {current?.name ?? "No plan"} {current && `· ₹${current.price}/${current.billing_cycle}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>New plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder={plans?.length ? "Select plan" : "No plans configured"} /></SelectTrigger>
              <SelectContent>{(plans ?? []).filter((p: any) => p.id !== person.plan_id).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name} · ₹{p.price}/{p.billing_cycle}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
          {delta !== null && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="label-mono">Price difference</div>
              <div className={`text-lg font-semibold tabular-nums ${delta > 0 ? "text-warning-foreground" : delta < 0 ? "text-success" : ""}`}>
                {delta > 0 ? "+" : ""}₹{delta.toLocaleString()}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!planId || busy} onClick={async () => {
            setBusy(true);
            try { await act({ data: { kind, id: person.id, to_plan_id: planId } }); toast.success("Plan updated"); await inv(); onOpenChange(false); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            finally { setBusy(false); }
          }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
