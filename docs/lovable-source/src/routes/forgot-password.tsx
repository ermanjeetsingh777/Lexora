import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — SmartLibrary" }] }),
  component: () => (
    <AuthShell
      title="Reset your password"
      subtitle="We'll send a recovery link to your email."
      footer={<><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success("Recovery link sent."); }}>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" required defaultValue="admin@meridian.edu" /></div>
        <Button type="submit" className="w-full">Send recovery link</Button>
      </form>
    </AuthShell>
  ),
});
