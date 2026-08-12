import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/lib/store/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Users, User } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — SmartLibrary" }] }),
  component: LoginPage,
});

const QUICK: { role: Role; email: string; label: string; icon: typeof Shield; hint: string }[] = [
  { role: "admin", email: "admin@demo", label: "Admin", icon: Shield, hint: "Full access · admin area" },
  { role: "staff", email: "staff@demo", label: "Staff", icon: Users, hint: "Members, seats, attendance" },
  { role: "member", email: "member@demo", label: "Member", icon: User, hint: "Read-only access" },
];

function LoginPage() {
  const { login, loginAs, isAuthenticated, initialized } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const getRedirect = (): string => {
    if (typeof window === "undefined") return "/dashboard";
    const p = new URLSearchParams(window.location.search).get("redirect");
    if (p && p.startsWith("/") && !p.startsWith("//")) return p;
    return "/dashboard";
  };

  useEffect(() => {
    if (initialized && isAuthenticated && typeof window !== "undefined") {
      window.location.replace(getRedirect());
    }
  }, [initialized, isAuthenticated]);

  const goAfterAuth = () => {
    if (typeof window !== "undefined") window.location.replace(getRedirect());
  };

  const quickLogin = async (role: Role) => {
    setBusy(true);
    try {
      await loginAs(role);
      toast.success(`Signed in as ${role}`);
      goAfterAuth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };


  return (
    <AuthShell
      title="Sign in to your workspace"
      subtitle="Mock auth — pick a role or use seeded credentials below."
      footer={<>New here? <Link to="/register" className="text-primary hover:underline">Create an account</Link></>}
    >
      <div className="space-y-2">
        {QUICK.map(({ role, label, icon: Icon, hint }) => (
          <button
            key={role}
            type="button"
            disabled={busy}
            onClick={() => quickLogin(role)}
            className="w-full flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition hover:bg-muted/40 disabled:opacity-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">Continue as {label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
            <span className="label-mono">demo123</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="label-mono">or with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await login(email, password);
            toast.success("Welcome back.");
            goAfterAuth();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Sign-in failed");
          } finally {
            setBusy(false);
          }
        }}
      >

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@demo" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo123" required />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
