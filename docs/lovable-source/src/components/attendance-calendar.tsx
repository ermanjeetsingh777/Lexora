import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { attendanceCalendar } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

export function AttendanceCalendar({
  year = new Date().getFullYear(),
  month = new Date().getMonth(),
  selected,
  onSelect,
  rangeStart,
  rangeEnd,
  mode = "single",
}: {
  year?: number;
  month?: number;
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  mode?: "single" | "range";
}) {
  const cells = attendanceCalendar(year, month);
  const monthName = new Date(year, month, 1).toLocaleString("en", { month: "long" });
  const intensity = (v: number) => {
    const o = Math.max(0.05, v / 100);
    return `oklch(0.55 0.18 258 / ${o})`;
  };
  const sameDay = (a: Date | null, b?: Date | null) =>
    !!a && !!b && a.toDateString() === b.toDateString();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const inRange = (d: Date | null) => {
    if (!d || !rangeStart) return false;
    const t = startOfDay(d);
    const s = startOfDay(rangeStart);
    const e = rangeEnd ? startOfDay(rangeEnd) : s;
    return t >= Math.min(s, e) && t <= Math.max(s, e);
  };
  const isEdge = (d: Date | null) =>
    sameDay(d, rangeStart ?? null) || sameDay(d, rangeEnd ?? null);

  // Roving tabindex / keyboard navigation
  const dayIndices = cells
    .map((c, i) => (c.date ? i : -1))
    .filter((i) => i >= 0);
  const initialFocusIdx = (() => {
    const target =
      mode === "range"
        ? (rangeEnd ?? rangeStart ?? null)
        : (selected ?? null);
    if (target) {
      const found = cells.findIndex((c) => sameDay(c.date, target));
      if (found >= 0) return found;
    }
    return dayIndices[0] ?? 0;
  })();
  const [focusIdx, setFocusIdx] = useState<number>(initialFocusIdx);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const userMovedRef = useRef(false);

  // When the visible month/edge dates change, reset focus target
  useEffect(() => {
    setFocusIdx(initialFocusIdx);
    userMovedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, rangeStart?.toDateString(), rangeEnd?.toDateString()]);

  // Move actual DOM focus only when the user navigates with the keyboard
  useEffect(() => {
    if (!userMovedRef.current) return;
    btnRefs.current[focusIdx]?.focus();
  }, [focusIdx]);

  const moveFocus = (delta: number) => {
    const pos = dayIndices.indexOf(focusIdx);
    const nextPos = Math.max(0, Math.min(dayIndices.length - 1, pos + delta));
    userMovedRef.current = true;
    setFocusIdx(dayIndices[nextPos]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    switch (e.key) {
      case "ArrowRight": e.preventDefault(); moveFocus(1); break;
      case "ArrowLeft":  e.preventDefault(); moveFocus(-1); break;
      case "ArrowDown":  e.preventDefault(); moveFocus(7); break;
      case "ArrowUp":    e.preventDefault(); moveFocus(-7); break;
      case "Home":       e.preventDefault(); userMovedRef.current = true; setFocusIdx(dayIndices[0]); break;
      case "End":        e.preventDefault(); userMovedRef.current = true; setFocusIdx(dayIndices[dayIndices.length - 1]); break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (cells[i].date) onSelect?.(cells[i].date!);
        break;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{monthName} {year}</h3>
        <div className="flex items-center gap-1 label-mono">
          <span>Low</span>
          {[15, 40, 65, 90].map((v) => (
            <span key={v} className="h-3 w-4 rounded-sm" style={{ background: intensity(v) }} aria-hidden="true" />
          ))}
          <span>High</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 label-mono mb-1" aria-hidden="true">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>
      <div
        role="grid"
        aria-label={`${monthName} ${year} attendance calendar${mode === "range" ? ", range selection" : ""}`}
        className="grid grid-cols-7 gap-1"
      >
        {cells.map((c, i) => {
          const active = sameDay(c.date, selected ?? null);
          const within = inRange(c.date);
          const edge = isEdge(c.date);
          const isStart = mode === "range" && sameDay(c.date, rangeStart ?? null);
          const isEnd = mode === "range" && sameDay(c.date, rangeEnd ?? null);
          const isFocusTarget = i === focusIdx;
          const dateLabel = c.date?.toLocaleDateString("en", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          });
          const stateLabel = [
            isStart && isEnd ? "range start and end" : isStart ? "range start" : isEnd ? "range end" : within ? "in range" : null,
            active ? "selected" : null,
          ].filter(Boolean).join(", ");
          const ariaLabel = c.date
            ? `${dateLabel}, ${c.value}% attendance${stateLabel ? `, ${stateLabel}` : ""}`
            : undefined;
          return (
            <button
              key={i}
              ref={(el) => { btnRefs.current[i] = el; }}
              type="button"
              role="gridcell"
              disabled={!c.date}
              tabIndex={c.date ? (isFocusTarget ? 0 : -1) : -1}
              onClick={() => {
                if (!c.date) return;
                userMovedRef.current = false;
                setFocusIdx(i);
                onSelect?.(c.date);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
              aria-label={ariaLabel}
              aria-selected={mode === "range" ? within || edge : active}
              aria-current={c.date && sameDay(c.date, new Date()) ? "date" : undefined}
              className={cn(
                "aspect-square rounded-md border text-[10px] flex flex-col items-center justify-between p-1 transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                !c.date && "opacity-0 pointer-events-none",
                c.date && "hover:ring-2 hover:ring-primary/40 cursor-pointer",
                within && !edge && "ring-1 ring-primary/40",
                (active || edge) && "ring-2 ring-primary",
              )}
              style={c.date ? { background: intensity(c.value) } : undefined}
              title={c.date ? `${c.date.toDateString()} — ${c.value}% attendance` : ""}
            >
              <div className="w-full flex justify-center">
                {isStart && (
                  <span aria-hidden="true" className="text-[8px] font-bold text-primary-foreground bg-primary rounded px-1 leading-tight">
                    {isEnd ? "S/E" : "START"}
                  </span>
                )}
                {isEnd && !isStart && (
                  <span aria-hidden="true" className="text-[8px] font-bold text-primary-foreground bg-primary rounded px-1 leading-tight">END</span>
                )}
              </div>
              <span className={cn(
                "font-mono text-foreground/70",
                (isStart || isEnd) && "font-bold text-foreground"
              )}>
                {c.date?.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
