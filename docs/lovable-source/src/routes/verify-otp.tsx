import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/lib/store/auth";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-otp")({
  head: () => ({ meta: [{ title: "Verify code — SmartLibrary" }] }),
  component: () => {
    const [code, setCode] = useState("");
    const login = useAuth((s) => s.login);
    const navigate = useNavigate() as (opts: any) => void;
    return (
      <AuthShell title="Verify it's you" subtitle="Enter the 6-digit code sent to your device.">
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            await login("admin@meridian.edu", "demo");
            toast.success("Verified.");
            navigate({ to: "/dashboard" });
          }}
        >
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="submit" className="w-full">Verify & continue</Button>
          <p className="text-center text-xs text-muted-foreground">Didn't get a code? <button type="button" className="text-primary hover:underline">Resend</button></p>
        </form>
      </AuthShell>
    );
  },
});
