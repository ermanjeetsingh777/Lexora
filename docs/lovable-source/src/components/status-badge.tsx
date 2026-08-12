import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "destructive" | "info" | "muted";

const variants: Record<Variant, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  muted: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  variant,
  className,
}: {
  status: string;
  variant?: Variant;
  className?: string;
}) {
  const auto: Variant = (() => {
    const s = status.toLowerCase();
    if (["active","paid","success","resolved","present","available"].includes(s)) return "success";
    if (["pending","late","warning","reserved","lowstock","low stock"].includes(s)) return "warning";
    if (["failed","suspended","locked","destructive","outofstock","out of stock","maintenance","absent"].includes(s)) return "destructive";
    if (["info","occupied","open"].includes(s)) return "info";
    if (["inactive","refunded","expired"].includes(s)) return "muted";
    return "default";
  })();
  const v = variant ?? auto;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
      variants[v], className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current opacity-80")} />
      {status}
    </span>
  );
}
