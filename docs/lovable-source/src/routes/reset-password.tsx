import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — SmartLibrary" }] }),
  component: () => {
    const navigate = useNavigate() as (opts: any) => void;
    return (
      <AuthShell title="Choose a new password" subtitle="Pick something memorable but strong.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success("Password updated."); navigate({ to: "/login" }); }}>
          <div className="space-y-1.5"><Label>New password</Label><Input type="password" required /></div>
          <div className="space-y-1.5"><Label>Confirm password</Label><Input type="password" required /></div>
          <Button type="submit" className="w-full">Update password</Button>
        </form>
      </AuthShell>
    );
  },
});
