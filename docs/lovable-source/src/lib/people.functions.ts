import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Shift = z.enum(["Morning", "Afternoon", "Evening", "Night"]);
const Kind = z.enum(["members", "students", "teachers"]);

const FilterSchema = z.object({
  kind: Kind,
  institutionId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  libraryId: z.string().uuid().optional(),
  status: z.string().optional(),
  shift: Shift.optional(),
  search: z.string().optional(),
});

export const listPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FilterSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb.from(data.kind).select("*").order("created_at", { ascending: false });
    if (data.institutionId) q = q.eq("institution_id", data.institutionId);
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    if (data.kind !== "teachers" && data.libraryId) q = q.eq("library_id", data.libraryId);
    if (data.status) q = q.eq("status", data.status);
    if (data.kind !== "teachers" && data.shift) q = q.eq("shift", data.shift);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: Kind, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from(data.kind)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const CommonPerson = {
  institution_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  status: z.string().default("Active"),
};

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      ...CommonPerson,
      library_id: z.string().uuid(),
      shift: Shift.default("Morning"),
      seat_id: z.string().uuid().optional().nullable(),
      plan_id: z.string().uuid().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, email: data.email || null };
    const { data: row, error } = await context.supabase.from("members").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      ...CommonPerson,
      library_id: z.string().uuid(),
      shift: Shift.default("Morning"),
      seat_id: z.string().uuid().optional().nullable(),
      plan_id: z.string().uuid().optional().nullable(),
      roll_no: z.string().optional(),
      class_grade: z.string().optional(),
      guardian_name: z.string().optional(),
      guardian_phone: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, email: data.email || null };
    const { data: row, error } = await context.supabase.from("students").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      ...CommonPerson,
      subject: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, email: data.email || null };
    const { data: row, error } = await context.supabase.from("teachers").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: Kind, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from(data.kind).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- Transfers / Shift / Plan -----

const PersonRef = z.object({ kind: Kind, id: z.string().uuid() });

export const transferBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    PersonRef.extend({
      to_branch_id: z.string().uuid(),
      to_library_id: z.string().uuid().optional(),
      reason: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { userId } = context;
    const { data: person, error: pErr } = await sb.from(data.kind).select("*").eq("id", data.id).single();
    if (pErr || !person) throw new Error("Person not found");
    const update: Record<string, unknown> = { branch_id: data.to_branch_id, seat_id: null };
    if (data.kind !== "teachers") update.library_id = data.to_library_id ?? person.library_id;
    const { error: uErr } = await sb.from(data.kind).update(update).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    await sb.from("transfers").insert({
      institution_id: person.institution_id,
      person_type: data.kind === "members" ? "member" : data.kind === "students" ? "student" : "teacher",
      person_id: data.id,
      from_branch_id: person.branch_id,
      to_branch_id: data.to_branch_id,
      from_library_id: person.library_id ?? null,
      to_library_id: data.to_library_id ?? null,
      from_seat_id: person.seat_id ?? null,
      to_seat_id: null,
      reason: data.reason ?? null,
      created_by: userId,
    });
    return { ok: true };
  });

export const transferSeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    PersonRef.extend({ to_seat_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.kind === "teachers") throw new Error("Teachers don't have seats");
    const sb = context.supabase as any;
    const { userId } = context;
    const { data: person, error: pErr } = await sb.from(data.kind).select("*").eq("id", data.id).single();
    if (pErr || !person) throw new Error("Person not found");
    const [{ data: heldM }, { data: heldS }] = await Promise.all([
      sb.from("members").select("id").eq("seat_id", data.to_seat_id).maybeSingle(),
      sb.from("students").select("id").eq("seat_id", data.to_seat_id).maybeSingle(),
    ]);
    if ((heldM && heldM.id !== data.id) || (heldS && heldS.id !== data.id)) {
      throw new Error("Seat is already taken");
    }
    const { error: uErr } = await sb.from(data.kind).update({ seat_id: data.to_seat_id }).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    await sb.from("transfers").insert({
      institution_id: person.institution_id,
      person_type: data.kind === "members" ? "member" : "student",
      person_id: data.id,
      from_seat_id: person.seat_id ?? null,
      to_seat_id: data.to_seat_id,
      created_by: userId,
    });
    return { ok: true };
  });

export const changeShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PersonRef.extend({ to_shift: Shift }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.kind === "teachers") throw new Error("Teachers don't have shifts");
    const sb = context.supabase as any;
    const { userId } = context;
    const { data: person, error: pErr } = await sb.from(data.kind).select("*").eq("id", data.id).single();
    if (pErr || !person) throw new Error("Person not found");
    const { error: uErr } = await sb.from(data.kind).update({ shift: data.to_shift }).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    await sb.from("shift_changes").insert({
      institution_id: person.institution_id,
      person_type: data.kind === "members" ? "member" : "student",
      person_id: data.id,
      from_shift: person.shift,
      to_shift: data.to_shift,
      created_by: userId,
    });
    return { ok: true };
  });

export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PersonRef.extend({ to_plan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.kind === "teachers") throw new Error("Teachers don't have plans");
    const sb = context.supabase as any;
    const { userId } = context;
    const { data: person, error: pErr } = await sb.from(data.kind).select("*").eq("id", data.id).single();
    if (pErr || !person) throw new Error("Person not found");
    const { error: uErr } = await sb.from(data.kind).update({ plan_id: data.to_plan_id }).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    await sb.from("plan_changes").insert({
      institution_id: person.institution_id,
      person_type: data.kind === "members" ? "member" : "student",
      person_id: data.id,
      from_plan_id: person.plan_id ?? null,
      to_plan_id: data.to_plan_id,
      created_by: userId,
    });
    return { ok: true };
  });
