import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================
// Billing server functions: invoices, payment methods, subscription.
// All routes RLS-gated by owns_institution(auth.uid(), institution_id).
// ============================================================

const idSchema = z.object({ id: z.string().uuid() });
const instSchema = z.object({ institutionId: z.string().uuid() });

// -------- Invoices --------

export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => instSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("invoices")
      .select("*, plans(name, price, billing_cycle)")
      .eq("institution_id", data.institutionId)
      .order("issued_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("invoices")
      .select("*, plans(name, price, billing_cycle), institutions(name, email, address, city, state, country)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// -------- Payment methods --------

export const listPaymentMethods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => instSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("payment_methods")
      .select("*")
      .eq("institution_id", data.institutionId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      institutionId: z.string().uuid(),
      brand: z.string().min(1).max(40),
      last4: z.string().regex(/^\d{4}$/),
      expMonth: z.number().int().min(1).max(12),
      expYear: z.number().int().min(new Date().getFullYear()).max(2100),
      holder: z.string().min(1).max(120),
      setDefault: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { count } = await sb
      .from("payment_methods")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", data.institutionId);
    const makeDefault = data.setDefault || (count ?? 0) === 0;
    if (makeDefault) {
      await sb.from("payment_methods").update({ is_default: false }).eq("institution_id", data.institutionId);
    }
    const { data: row, error } = await sb
      .from("payment_methods")
      .insert({
        institution_id: data.institutionId,
        brand: data.brand,
        last4: data.last4,
        exp_month: data.expMonth,
        exp_year: data.expYear,
        holder: data.holder,
        is_default: makeDefault,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setDefaultPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: pm } = await sb.from("payment_methods").select("institution_id").eq("id", data.id).single();
    if (!pm) throw new Error("Payment method not found");
    await sb.from("payment_methods").update({ is_default: false }).eq("institution_id", pm.institution_id);
    const { data: row, error } = await sb
      .from("payment_methods").update({ is_default: true }).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("payment_methods").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Subscription summary --------

export const getSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => instSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: inst } = await sb
      .from("institutions")
      .select("id, name, subscription_plan, status")
      .eq("id", data.institutionId)
      .single();

    // try matching named plan, fallback cheapest
    let plan: any = null;
    if (inst?.subscription_plan) {
      const { data: p } = await sb
        .from("plans").select("*").ilike("name", inst.subscription_plan).limit(1).maybeSingle();
      plan = p;
    }
    if (!plan) {
      const { data: p } = await sb.from("plans").select("*").order("price").limit(1).maybeSingle();
      plan = p;
    }

    // active member count for MRR
    const { data: branches } = await sb.from("branches").select("id").eq("institution_id", data.institutionId);
    const branchIds = (branches ?? []).map((b: any) => b.id);
    let activeMembers = 0;
    if (branchIds.length) {
      const { count } = await sb
        .from("members").select("*", { count: "exact", head: true })
        .in("branch_id", branchIds).eq("status", "Active");
      activeMembers = count ?? 0;
    }

    const mrr = plan ? Number(plan.price) * Math.max(activeMembers, 1) : 0;

    // next renewal from latest paid invoice + 30d
    const { data: lastPaid } = await sb
      .from("invoices").select("paid_at, issued_at")
      .eq("institution_id", data.institutionId).eq("status", "paid")
      .order("issued_at", { ascending: false }).limit(1).maybeSingle();
    const anchor = lastPaid?.paid_at ?? lastPaid?.issued_at ?? null;
    const renewsAt = anchor ? new Date(new Date(anchor).getTime() + 30 * 86400000).toISOString() : null;

    return {
      institutionStatus: inst?.status ?? "Active",
      plan: plan
        ? {
            id: plan.id, name: plan.name, price: Number(plan.price),
            billingCycle: plan.billing_cycle, maxMembers: plan.max_members, maxSeats: plan.max_seats,
          }
        : null,
      mrr,
      activeMembers,
      renewsAt,
    };
  });
