import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { isUuid, getMockLibrary } from "@/lib/institution-demo-service";

export const getOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: inst } = await supabase
      .from("institutions")
      .select("id, name")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!inst) return { step: "institution" as const, institution: null, branch: null, library: null };

    const { data: branch } = await supabase
      .from("branches")
      .select("id, name")
      .eq("institution_id", inst.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!branch) return { step: "branch" as const, institution: inst, branch: null, library: null };

    const { data: library } = await supabase
      .from("libraries")
      .select("id, name")
      .eq("branch_id", branch.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!library) return { step: "library" as const, institution: inst, branch, library: null };

    return { step: "done" as const, institution: inst, branch, library };
  });

export const listInstitutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("institutions")
      .select("*, branches(id)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ institutionId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("branches").select("*, libraries(id)").order("created_at");
    if (data.institutionId) q = q.eq("institution_id", data.institutionId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listLibraries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("libraries").select("*").order("created_at");
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("plans").select("*").order("price");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listSeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ libraryId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("seats")
      .select("*")
      .eq("library_id", data.libraryId)
      .order("number");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      name: z.string().min(2).max(120),
      type: z.string().min(1),
      city: z.string().optional(),
      country: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("institutions")
      .insert({ ...data, owner_id: context.userId, email: data.email || null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      institutionId: z.string().uuid(),
      name: z.string().min(2).max(120),
      city: z.string().optional(),
      address: z.string().optional(),
      capacity: z.number().int().min(1).max(10000).default(100),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("branches")
      .insert({
        institution_id: data.institutionId,
        name: data.name,
        city: data.city ?? null,
        address: data.address ?? null,
        capacity: data.capacity,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      name: z.string().min(2).max(120),
      floor: z.number().int().min(0).max(50).default(1),
      capacity: z.number().int().min(1).max(2000).default(60),
      autoSeed: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: lib, error } = await context.supabase
      .from("libraries")
      .insert({
        branch_id: data.branchId,
        name: data.name,
        floor: data.floor,
        capacity: data.capacity,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.autoSeed) {
      const sections = ["A", "B", "C", "D"];
      const cols = 10;
      const seats = Array.from({ length: data.capacity }, (_, i) => {
        const section = sections[Math.floor(i / Math.ceil(data.capacity / sections.length))] ?? "A";
        return {
          library_id: lib.id,
          number: `${section}-${String(i + 1).padStart(2, "0")}`,
          section,
          row: Math.floor(i / cols) + 1,
          col: (i % cols) + 1,
          type: i % 13 === 0 ? "Accessibility" : i % 7 === 0 ? "Premium" : "Standard",
          status: "Available",
        };
      });
      await context.supabase.from("seats").insert(seats);
    }
    return lib;
  });

export const setupDemoOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const userId = context.userId;

    // Institution
    let { data: inst } = await sb
      .from("institutions").select("*").eq("owner_id", userId).limit(1).maybeSingle();
    if (!inst) {
      const { data, error } = await sb.from("institutions").insert({
        owner_id: userId, name: "Demo Institution", type: "Library", city: "Demo City", country: "India",
      }).select().single();
      if (error) throw new Error(error.message);
      inst = data;
    }

    // Branch
    let { data: branch } = await sb
      .from("branches").select("*").eq("institution_id", inst.id).limit(1).maybeSingle();
    if (!branch) {
      const { data, error } = await sb.from("branches").insert({
        institution_id: inst.id, name: "Main Branch", city: "Demo City", capacity: 100,
      }).select().single();
      if (error) throw new Error(error.message);
      branch = data;
    }

    // Library
    let { data: lib } = await sb
      .from("libraries").select("*").eq("branch_id", branch.id).limit(1).maybeSingle();
    if (!lib) {
      const { data, error } = await sb.from("libraries").insert({
        branch_id: branch.id, name: "Main Library", floor: 1, capacity: 40,
      }).select().single();
      if (error) throw new Error(error.message);
      lib = data;

      // Seed seats
      const sections = ["A", "B", "C", "D"];
      const cols = 10;
      const capacity = 40;
      const seats = Array.from({ length: capacity }, (_, i) => {
        const section = sections[Math.floor(i / Math.ceil(capacity / sections.length))] ?? "A";
        return {
          library_id: lib.id,
          number: `${section}-${String(i + 1).padStart(2, "0")}`,
          section,
          row: Math.floor(i / cols) + 1,
          col: (i % cols) + 1,
          type: i % 13 === 0 ? "Accessibility" : i % 7 === 0 ? "Premium" : "Standard",
          status: "Available",
        };
      });
      await sb.from("seats").insert(seats);
    }

    return { institution: inst, branch, library: lib };
  });

export const getInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("institutions").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      name: z.string().min(2).max(120).optional(),
      type: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")).optional(),
      phone: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      address: z.string().optional(),
      logo_url: z.string().url().optional().or(z.literal("")).optional(),
      license_key: z.string().optional(),
      subscription_plan: z.string().optional(),
      status: z.string().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: any = { ...data.patch };
    if (patch.email === "") patch.email = null;
    if (patch.logo_url === "") patch.logo_url = null;
    const { data: row, error } = await (context.supabase as any)
      .from("institutions").update(patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("branches").select("*, institutions(name), libraries(id, name, capacity, status)").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      name: z.string().min(2).max(120).optional(),
      city: z.string().optional(),
      address: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")).optional(),
      phone: z.string().optional(),
      capacity: z.number().int().min(1).max(10000).optional(),
      lat: z.number().optional().nullable(),
      lng: z.number().optional().nullable(),
      operating_start: z.string().optional().nullable(),
      operating_end: z.string().optional().nullable(),
      weekly_hours: z.record(
        z.enum(["mon","tue","wed","thu","fri","sat","sun"]),
        z.object({
          closed: z.boolean().default(false),
          open: z.string().nullable().optional(),
          close: z.string().nullable().optional(),
        })
      ).nullable().optional(),
      status: z.string().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: any = { ...data.patch };
    if (patch.email === "") patch.email = null;
    const { data: row, error } = await (context.supabase as any)
      .from("branches").update(patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!isUuid(data.id)) return getMockLibrary(data.id);
    const { data: row, error } = await context.supabase
      .from("libraries").select("*, branches(id, name, institution_id, operating_start, operating_end, weekly_hours, institutions(name))").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { count: seatCount } = await context.supabase
      .from("seats").select("*", { count: "exact", head: true }).eq("library_id", data.id);
    const { count: occupied } = await context.supabase
      .from("seats").select("*", { count: "exact", head: true }).eq("library_id", data.id).eq("status", "Occupied");
    return { ...row, _seatCount: seatCount ?? 0, _occupied: occupied ?? 0 };
  });

export const updateLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      name: z.string().min(2).max(120).optional(),
      floor: z.number().int().min(0).max(50).optional(),
      capacity: z.number().int().min(1).max(2000).optional(),
      operating_start: z.string().optional().nullable(),
      operating_end: z.string().optional().nullable(),
      sections: z.array(z.object({ name: z.string(), capacity: z.number().int().min(0) })).optional(),
      weekly_hours: z.record(
        z.enum(["mon","tue","wed","thu","fri","sat","sun"]),
        z.object({
          closed: z.boolean().default(false),
          open: z.string().nullable().optional(),
          close: z.string().nullable().optional(),
        })
      ).nullable().optional(),
      hours_exceptions: z.array(z.object({
        id: z.string(),
        name: z.string().min(1).max(120),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        closed: z.boolean().default(true),
        open: z.string().nullable().optional(),
        close: z.string().nullable().optional(),
      })).optional(),
      status: z.string().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("libraries").update(data.patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============================================================
// Institution detail aggregates (used by the institution detail page).
// ============================================================

export const getInstitutionDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: inst, error } = await sb.from("institutions").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);

    const { data: branches } = await sb.from("branches").select("id, capacity").eq("institution_id", data.id);
    const branchIds = (branches ?? []).map((b: any) => b.id);

    let libCount = 0, memberCount = 0, seatCap = 0, occupied = 0;
    if (branchIds.length) {
      const [libs, mem, seatsAgg, occAgg] = await Promise.all([
        sb.from("libraries").select("id", { count: "exact", head: true }).in("branch_id", branchIds),
        sb.from("members").select("id", { count: "exact", head: true }).in("branch_id", branchIds),
        // seats joined via library_id -> branch via libraries
        sb.from("libraries").select("id, capacity").in("branch_id", branchIds),
        sb.from("libraries").select("id").in("branch_id", branchIds),
      ]);
      libCount = libs.count ?? 0;
      memberCount = mem.count ?? 0;
      const libIds = (seatsAgg.data ?? []).map((l: any) => l.id);
      seatCap = (seatsAgg.data ?? []).reduce((s: number, l: any) => s + (l.capacity ?? 0), 0);
      if (libIds.length) {
        const { count } = await sb
          .from("seats").select("*", { count: "exact", head: true })
          .in("library_id", libIds).eq("status", "Occupied");
        occupied = count ?? 0;
      }
      void occAgg;
    }

    const occupancyPct = seatCap > 0 ? Math.round((occupied / seatCap) * 100) : 0;

    return {
      institution: inst,
      kpis: {
        branchCount: branches?.length ?? 0,
        libraryCount: libCount,
        memberCount,
        seatCapacity: seatCap,
        occupied,
        occupancyPct,
      },
    };
  });

export const listInstitutionBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ institutionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: branches, error } = await sb
      .from("branches")
      .select("*, libraries(id, capacity)")
      .eq("institution_id", data.institutionId)
      .order("created_at");
    if (error) throw new Error(error.message);
    const rows = branches ?? [];
    const branchIds = rows.map((b: any) => b.id);

    // member count per branch
    const memberCounts = new Map<string, number>();
    const occupiedCounts = new Map<string, number>();
    if (branchIds.length) {
      const { data: ms } = await sb.from("members").select("branch_id").in("branch_id", branchIds);
      for (const m of ms ?? []) memberCounts.set(m.branch_id, (memberCounts.get(m.branch_id) ?? 0) + 1);

      // occupancy via libraries->seats
      const libToBranch = new Map<string, string>();
      for (const b of rows) for (const l of b.libraries ?? []) libToBranch.set(l.id, b.id);
      const libIds = Array.from(libToBranch.keys());
      if (libIds.length) {
        const { data: occ } = await sb
          .from("seats").select("library_id").in("library_id", libIds).eq("status", "Occupied");
        for (const s of occ ?? []) {
          const bid = libToBranch.get(s.library_id);
          if (bid) occupiedCounts.set(bid, (occupiedCounts.get(bid) ?? 0) + 1);
        }
      }
    }

    return rows.map((b: any) => {
      const seatCapacity = (b.libraries ?? []).reduce((s: number, l: any) => s + (l.capacity ?? 0), 0);
      const occ = occupiedCounts.get(b.id) ?? 0;
      return {
        ...b,
        libraryCount: (b.libraries ?? []).length,
        seatCapacity,
        occupied: occ,
        occupancyPct: seatCapacity > 0 ? Math.round((occ / seatCapacity) * 100) : 0,
        memberCount: memberCounts.get(b.id) ?? 0,
      };
    });
  });

export const listInstitutionLibraries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ institutionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: branches } = await sb.from("branches").select("id, name").eq("institution_id", data.institutionId);
    const branchIds = (branches ?? []).map((b: any) => b.id);
    if (!branchIds.length) return [];
    const branchMap = new Map<string, string>((branches ?? []).map((b: any) => [b.id, b.name]));

    const { data: libs, error } = await sb
      .from("libraries").select("*").in("branch_id", branchIds).order("created_at");
    if (error) throw new Error(error.message);
    const rows = libs ?? [];
    const libIds = rows.map((l: any) => l.id);

    const seatCounts = new Map<string, number>();
    const occCounts = new Map<string, number>();
    if (libIds.length) {
      const { data: ss } = await sb.from("seats").select("library_id, status").in("library_id", libIds);
      for (const s of ss ?? []) {
        seatCounts.set(s.library_id, (seatCounts.get(s.library_id) ?? 0) + 1);
        if (s.status === "Occupied") occCounts.set(s.library_id, (occCounts.get(s.library_id) ?? 0) + 1);
      }
    }

    return rows.map((l: any) => ({
      ...l,
      branchName: branchMap.get(l.branch_id) ?? "",
      _seatCount: seatCounts.get(l.id) ?? l.capacity ?? 0,
      _occupied: occCounts.get(l.id) ?? 0,
    }));
  });
