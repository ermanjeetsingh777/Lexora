import { type Seat, type SeatStatus } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { useState } from "react";

const STATUS_COLOR: Record<SeatStatus, string> = {
  available: "bg-muted hover:bg-muted/80 border-border text-muted-foreground",
  occupied: "bg-primary/15 border-primary/40 text-primary",
  reserved: "bg-warning/20 border-warning/50 text-warning-foreground",
  maintenance: "bg-destructive/15 border-destructive/40 text-destructive",
};

export function SeatLegend() {
  const items: { label: string; status: SeatStatus }[] = [
    { label: "Available", status: "available" },
    { label: "Occupied", status: "occupied" },
    { label: "Reserved", status: "reserved" },
    { label: "Maintenance", status: "maintenance" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((i) => (
        <div key={i.status} className="flex items-center gap-2 label-mono">
          <span className={cn("h-3 w-3 rounded-sm border", STATUS_COLOR[i.status])} />
          {i.label}
        </div>
      ))}
    </div>
  );
}

export function SeatGrid({ seats, cols = 10 }: { seats: Seat[]; cols?: number }) {
  const [hover, setHover] = useState<Seat | null>(null);
  // Insert aisle column every 5
  return (
    <div className="relative">
      <div className="absolute inset-0 blueprint-grid opacity-40 pointer-events-none rounded-lg" />
      <div className="relative rounded-lg border bg-card/40 p-6">
        <div
          className="mx-auto grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 56 }}
        >
          {seats.map((s) => (
            <button
              key={s.id}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              aria-label={`Seat ${s.number} — ${s.status}`}
              className={cn(
                "relative aspect-square rounded-md border text-[10px] font-mono transition-all",
                "hover:scale-110 hover:z-10 focus:outline-none focus:ring-2 focus:ring-ring",
                STATUS_COLOR[s.status]
              )}
            >
              {s.number.split("-")[1]}
              {s.type === "Premium" && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-warning" />
              )}
              {s.type === "Accessibility" && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-info" />
              )}
            </button>
          ))}
        </div>
        <div className="mt-6 border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="label-mono">FRONT — Entry</span>
          <span className="label-mono">Floor {seats[0]?.floor ?? 1}</span>
        </div>
      </div>
      {hover && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-lg border bg-popover p-3 text-xs shadow-elegant min-w-44">
          <div className="font-semibold tracking-tight">{hover.number}</div>
          <div className="label-mono mt-1">Section {hover.section} · Floor {hover.floor}</div>
          <div className="mt-2 capitalize">
            <span className="label-mono">Status</span>
            <div>{hover.status}</div>
          </div>
          {hover.memberName && (
            <div className="mt-2">
              <span className="label-mono">Member</span>
              <div>{hover.memberName}</div>
            </div>
          )}
          <div className="mt-2 label-mono">{hover.type}</div>
        </div>
      )}
    </div>
  );
}
