import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/store/auth";

import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — SmartLibrary" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const register = useAuth((s) => s.register);
  const navigate = useNavigate() as (opts: any) => void;
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Set up your institution in seconds."
      footer={<>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await register(form.name, form.email, form.password);
            toast.success("Account created.");
            navigate({ to: "/dashboard" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Sign-up failed");
          } finally { setBusy(false); }
        }}
      >
        <div className="space-y-1.5"><Label>Your name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Work email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
    </AuthShell>
  );
}
