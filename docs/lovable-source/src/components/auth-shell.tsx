import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AuthShell({
  children, title, subtitle, footer,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground p-10">
        <div className="absolute inset-0 blueprint-grid opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/20 to-black/40" />
        <div className="relative">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 grid place-items-center font-mono font-bold">SL</div>
            <span className="text-sm font-semibold tracking-tight">SmartLibrary</span>
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative space-y-6"
        >
          <p className="label-mono text-primary-foreground/70">Institutional Precision</p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Run every branch, every library, every seat — with one calm console.
          </h2>
          <p className="text-sm text-primary-foreground/75 max-w-md">
            Real-time occupancy, attendance, billing and member operations — engineered for institutions that need certainty.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { k: "Members", v: "12,480" },
              { k: "Seats", v: "3,210" },
              { k: "Uptime", v: "99.99%" },
            ].map((s) => (
              <div key={s.k} className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-3">
                <div className="label-mono text-primary-foreground/60">{s.k}</div>
                <div className="text-lg font-semibold tabular-nums mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </motion.div>
        <p className="relative label-mono text-primary-foreground/60">© 2026 SmartLibrary · v2.4</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="space-y-2">
            <p className="label-mono">Authentication</p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-elegant">
            {children}
          </div>
          {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
