import { useMemo } from "react";
import { ArrowRight, CalendarCheck, RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { previewRenewal } from "@/lib/mock/members-demo";
import { cn } from "@/lib/utils";

export type RenewTarget = {
  id: string;
  name: string;
  membership: string;
  expiry: string;
  daysLeft: number;
  feesOwed?: number;
};

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function RenewPlanDialog({
  target,
  onOpenChange,
  onConfirm,
}: {
  target: RenewTarget | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (t: RenewTarget) => void;
}) {
  const preview = useMemo(() => previewRenewal(target?.membership ?? "Basic"), [target?.membership]);

  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Renew membership
          </AlertDialogTitle>
          <AlertDialogDescription>
            {target
              ? `Extend ${target.name}'s ${target.membership} plan by ${preview.months === 12 ? "12 months" : "1 month"} from today.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {target && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Current expiry</div>
                <div className={cn("text-sm font-medium tabular-nums", target.daysLeft < 0 && "text-destructive")}>
                  {fmt(target.expiry)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {target.daysLeft < 0 ? `${Math.abs(target.daysLeft)} days ago` : `in ${target.daysLeft} days`}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">New expiry</div>
                <div className="text-sm font-medium tabular-nums text-success flex items-center gap-1">
                  <CalendarCheck className="h-3.5 w-3.5" /> {fmt(preview.date)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {preview.months === 12 ? "+12 months" : "+1 month"}
                </div>
              </div>
            </div>
            {(target.feesOwed ?? 0) > 0 && (
              <div className="mt-3 text-xs text-destructive">
                Outstanding dues of ₹{(target.feesOwed ?? 0).toLocaleString()} remain after renewal.
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => target && onConfirm(target)}>Confirm renewal</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
