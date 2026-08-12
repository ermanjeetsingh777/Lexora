import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createPaymentMethod } from "@/lib/billing.functions";
import { createMockPaymentMethod, isDemoInstitutionId } from "@/lib/institution-demo-service";
import { toast } from "sonner";

const schema = z.object({
  holder: z.string().min(2, "Cardholder name required").max(120),
  number: z.string().regex(/^\d{13,19}$/, "Card number must be 13–19 digits"),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(new Date().getFullYear()).max(2100),
  setDefault: z.boolean().default(false),
});

type Form = z.infer<typeof schema>;

function detectBrand(num: string): string {
  if (/^4/.test(num)) return "visa";
  if (/^5[1-5]/.test(num) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(num)) return "mastercard";
  if (/^3[47]/.test(num)) return "amex";
  if (/^6/.test(num)) return "rupay";
  return "card";
}

export function PaymentMethodDialog({
  open, onOpenChange, institutionId,
}: { open: boolean; onOpenChange: (o: boolean) => void; institutionId: string }) {
  const qc = useQueryClient();
  const createPm = useServerFn(createPaymentMethod);
  const [pending, setPending] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      holder: "", number: "",
      expMonth: new Date().getMonth() + 1,
      expYear: new Date().getFullYear() + 1,
      setDefault: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (vals: Form) => {
      const num = vals.number.replace(/\s/g, "");
      const payload = {
        institutionId,
        brand: detectBrand(num),
        last4: num.slice(-4),
        expMonth: vals.expMonth, expYear: vals.expYear,
        holder: vals.holder, setDefault: vals.setDefault,
      };
      return isDemoInstitutionId(institutionId)
        ? Promise.resolve(createMockPaymentMethod(payload))
        : createPm({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods", institutionId] });
      toast.success("Payment method added");
      form.reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add payment method"),
    onSettled: () => setPending(false),
  });

  const onSubmit = (vals: Form) => {
    setPending(true);
    mutation.mutate(vals);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add payment method</DialogTitle>
          <DialogDescription>
            Demo capture — only the brand and last 4 digits are stored. No real payment is processed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="holder">Cardholder</Label>
            <Input id="holder" placeholder="Full name on card" className="mt-1" {...form.register("holder")} />
            {form.formState.errors.holder && <p className="text-xs text-destructive mt-1">{form.formState.errors.holder.message}</p>}
          </div>
          <div>
            <Label htmlFor="number">Card number</Label>
            <Input id="number" placeholder="4242 4242 4242 4242" inputMode="numeric" className="mt-1" {...form.register("number")} />
            {form.formState.errors.number && <p className="text-xs text-destructive mt-1">{form.formState.errors.number.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="expMonth">Exp month</Label>
              <Input id="expMonth" type="number" min={1} max={12} className="mt-1" {...form.register("expMonth")} />
            </div>
            <div>
              <Label htmlFor="expYear">Exp year</Label>
              <Input id="expYear" type="number" min={new Date().getFullYear()} max={2100} className="mt-1" {...form.register("expYear")} />
            </div>
            <div>
              <Label htmlFor="cvc">CVC</Label>
              <Input id="cvc" inputMode="numeric" placeholder="•••" className="mt-1" maxLength={4} />
              <p className="text-[10px] text-muted-foreground mt-1">Discarded</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-2.5">
            <div>
              <p className="text-sm font-medium">Set as default</p>
              <p className="text-xs text-muted-foreground">Use this card for upcoming charges.</p>
            </div>
            <Switch checked={form.watch("setDefault")} onCheckedChange={(v) => form.setValue("setDefault", v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add method"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
