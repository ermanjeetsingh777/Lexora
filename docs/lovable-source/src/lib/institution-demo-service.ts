import {
  branches as mockBranches,
  institutions as mockInstitutions,
  libraries as mockLibraries,
  plans as mockPlans,
} from "@/lib/mock/data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INSTITUTION_OVERRIDES_KEY = "demo-institution-overrides";
const PAYMENT_METHODS_KEY = "demo-payment-methods";
const LIBRARY_OVERRIDES_KEY = "demo-library-overrides";

const DEFAULT_WEEKLY_HOURS: Record<string, { closed: boolean; open: string | null; close: string | null }> = {
  mon: { closed: false, open: "08:00", close: "22:00" },
  tue: { closed: false, open: "08:00", close: "22:00" },
  wed: { closed: false, open: "08:00", close: "22:00" },
  thu: { closed: false, open: "08:00", close: "22:00" },
  fri: { closed: false, open: "08:00", close: "22:00" },
  sat: { closed: false, open: "09:00", close: "20:00" },
  sun: { closed: false, open: "10:00", close: "18:00" },
};

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function isDemoInstitutionId(id: string) {
  void id;
  return true;
}

export function isDemoInvoiceId(id: string) {
  return id.startsWith("demo-inv-");
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getInstitutionBase(id: string) {
  const inst = mockInstitutions.find((i) => i.id === id) ?? mockInstitutions[0];
  const overrides = readJson<Record<string, Record<string, unknown>>>(INSTITUTION_OVERRIDES_KEY, {});
  return {
    id,
    owner_id: "demo-owner",
    name: inst.name,
    type: inst.type,
    email: `admin@${inst.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18)}.demo`,
    phone: "+91 98765 43210",
    city: inst.city,
    state: "",
    country: inst.country,
    address: `${inst.name} main campus, ${inst.city}`,
    logo_url: "",
    status: inst.status,
    license_key: "DEMO-LICENCE",
    subscription_plan: "Professional",
    created_at: new Date(2025, 0, 1).toISOString(),
    ...(overrides[id] ?? {}),
  };
}

export function getMockPlans() {
  return mockPlans.map((p) => ({
    id: p.id,
    institution_id: "demo",
    name: p.name,
    billing_cycle: p.billingCycle,
    price: p.price,
    max_members: p.maxMembers,
    max_seats: p.maxSeats,
    features: p.features,
    created_at: new Date(2025, 0, 1).toISOString(),
  }));
}

export function getMockInstitutionBranches(institutionId: string) {
  const sourceInstitutionId = mockInstitutions.some((institution) => institution.id === institutionId)
    ? institutionId
    : mockInstitutions[0].id;

  return mockBranches
    .filter((branch) => branch.institutionId === sourceInstitutionId)
    .map((branch, index) => {
      const libs = mockLibraries.filter((library) => library.branchId === branch.id);
      const seatCapacity = libs.reduce((sum, library) => sum + library.capacity, 0);
      const occupied = libs.reduce((sum, library) => sum + library.occupied, 0);

      return {
        id: branch.id,
        institution_id: institutionId,
        name: branch.name,
        city: branch.city,
        address: `${branch.city} Campus ${index + 1}`,
        capacity: branch.capacity,
        operating_start: "08:00",
        operating_end: "20:00",
        created_at: new Date(2025, 0, index + 1).toISOString(),
        lat: null,
        lng: null,
        email: null,
        phone: null,
        status: "Active",
        weekly_hours: DEFAULT_WEEKLY_HOURS,
        libraries: libs.map((library) => ({ id: library.id, capacity: library.capacity })),
        libraryCount: libs.length,
        seatCapacity,
        occupied,
        occupancyPct: seatCapacity > 0 ? Math.round((occupied / seatCapacity) * 100) : branch.occupancy,
        memberCount: branch.members,
      };
    });
}

export function getMockInstitutionLibraries(institutionId: string) {
  const branches = getMockInstitutionBranches(institutionId);
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));

  return mockLibraries
    .filter((library) => branchMap.has(library.branchId))
    .map((library, index) => ({
      id: library.id,
      branch_id: library.branchId,
      name: library.name,
      floor: library.floor,
      capacity: library.capacity,
      created_at: new Date(2025, 1, index + 1).toISOString(),
      status: "Active",
      operating_start: "08:00",
      operating_end: "20:00",
      sections: [],
      weekly_hours: DEFAULT_WEEKLY_HOURS,
      hours_exceptions: [],
      branchName: branchMap.get(library.branchId) ?? "",
      _seatCount: library.capacity,
      _occupied: library.occupied,
    }));
}

export function getMockLibrary(id: string) {
  const library = mockLibraries.find((l) => l.id === id);
  if (!library) throw new Error("Library not found");
  const branch = mockBranches.find((b) => b.id === library.branchId);
  const institution = mockInstitutions.find((i) => i.id === branch?.institutionId);
  const overrides = readJson<Record<string, Record<string, unknown>>>(LIBRARY_OVERRIDES_KEY, {});
  const o = overrides[id] ?? {};
  return {
    id: library.id,
    branch_id: library.branchId,
    name: (o.name as string) ?? library.name,
    floor: (o.floor as number) ?? library.floor,
    capacity: (o.capacity as number) ?? library.capacity,
    status: (o.status as string) ?? library.status,
    operating_start: (o.operating_start as string) ?? library.operatingStart,
    operating_end: (o.operating_end as string) ?? library.operatingEnd,
    sections: (o.sections as any[]) ?? [],
    weekly_hours: (o.weekly_hours as any) ?? DEFAULT_WEEKLY_HOURS,
    hours_exceptions: (o.hours_exceptions as any[]) ?? [],
    branches: {
      id: branch?.id,
      name: branch?.name,
      institution_id: institution?.id,
      operating_start: "08:00",
      operating_end: "20:00",
      weekly_hours: DEFAULT_WEEKLY_HOURS,
      institutions: { name: institution?.name },
    },
    _seatCount: library.capacity,
    _occupied: library.occupied,
  };
}

export function updateMockLibrary(id: string, patch: Record<string, unknown>) {
  const overrides = readJson<Record<string, Record<string, unknown>>>(LIBRARY_OVERRIDES_KEY, {});
  overrides[id] = { ...(overrides[id] ?? {}), ...patch };
  writeJson(LIBRARY_OVERRIDES_KEY, overrides);
  return getMockLibrary(id);
}


export function getMockInstitutionDetail(id: string) {
  const institution = getInstitutionBase(id);
  const branches = getMockInstitutionBranches(id);
  const libraries = getMockInstitutionLibraries(id);
  const memberCount = branches.reduce((sum, branch) => sum + branch.memberCount, 0);
  const seatCapacity = libraries.reduce((sum, library) => sum + library.capacity, 0);
  const occupied = libraries.reduce((sum, library) => sum + library._occupied, 0);

  return {
    institution,
    kpis: {
      branchCount: branches.length,
      libraryCount: libraries.length,
      memberCount,
      seatCapacity,
      occupied,
      occupancyPct: seatCapacity > 0 ? Math.round((occupied / seatCapacity) * 100) : 0,
    },
  };
}

export function updateMockInstitutionSettings(id: string, patch: Record<string, unknown>) {
  const overrides = readJson<Record<string, Record<string, unknown>>>(INSTITUTION_OVERRIDES_KEY, {});
  overrides[id] = {
    ...(overrides[id] ?? {}),
    ...patch,
    email: patch.email || null,
    logo_url: patch.logo_url || null,
  };
  writeJson(INSTITUTION_OVERRIDES_KEY, overrides);
  return { ...getInstitutionBase(id), ...overrides[id] };
}

export function getMockInvoices(institutionId: string) {
  const institution = getInstitutionBase(institutionId);
  const plan = getMockPlans().find((p) => p.name === institution.subscription_plan) ?? getMockPlans()[2];
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const issued = new Date(now.getFullYear(), now.getMonth() - index, 5);
    const periodStart = new Date(issued.getFullYear(), issued.getMonth(), 1);
    const periodEnd = new Date(issued.getFullYear(), issued.getMonth() + 1, 0);
    const amount = Number(plan.price);
    const status = index === 0 ? "due" : "paid";

    return {
      id: `demo-inv-${institutionId}-${index + 1}`,
      institution_id: institutionId,
      number: `INV-DEMO-${issued.getFullYear()}-${String(issued.getMonth() + 1).padStart(2, "0")}`,
      plan_id: plan.id,
      amount,
      currency: "INR",
      status,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      issued_at: issued.toISOString(),
      paid_at: status === "paid" ? new Date(issued.getTime() + 2 * 86400000).toISOString() : null,
      line_items: [{ label: `${plan.name} subscription`, qty: 1, unit: amount, amount }],
      notes: status === "due" ? "Demo invoice awaiting payment." : "Demo invoice paid successfully.",
      created_at: issued.toISOString(),
      updated_at: issued.toISOString(),
      plans: { name: plan.name, price: plan.price, billing_cycle: plan.billing_cycle },
    };
  });
}

export function getMockInvoice(id: string) {
  const institutionId = id.replace(/^demo-inv-/, "").replace(/-\d+$/, "");
  const invoice = getMockInvoices(institutionId).find((item) => item.id === id);
  if (!invoice) throw new Error("Invoice not found");
  return {
    ...invoice,
    institutions: getInstitutionBase(institutionId),
  };
}

type DemoPaymentMethod = {
  id: string;
  institution_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  holder: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

function readPaymentMethods() {
  return readJson<Record<string, DemoPaymentMethod[]>>(PAYMENT_METHODS_KEY, {});
}

function writePaymentMethods(methods: Record<string, DemoPaymentMethod[]>) {
  writeJson(PAYMENT_METHODS_KEY, methods);
}

export function getMockPaymentMethods(institutionId: string) {
  return readPaymentMethods()[institutionId] ?? [];
}

export function createMockPaymentMethod(input: {
  institutionId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holder: string;
  setDefault: boolean;
}) {
  const all = readPaymentMethods();
  const existing = all[input.institutionId] ?? [];
  const makeDefault = input.setDefault || existing.length === 0;
  const row: DemoPaymentMethod = {
    id: `demo-pm-${Date.now().toString(36)}`,
    institution_id: input.institutionId,
    brand: input.brand,
    last4: input.last4,
    exp_month: input.expMonth,
    exp_year: input.expYear,
    holder: input.holder,
    is_default: makeDefault,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  all[input.institutionId] = [...existing.map((method) => ({ ...method, is_default: makeDefault ? false : method.is_default })), row];
  writePaymentMethods(all);
  return row;
}

export function setDefaultMockPaymentMethod(institutionId: string, id: string) {
  const all = readPaymentMethods();
  const next = (all[institutionId] ?? []).map((method) => ({ ...method, is_default: method.id === id }));
  all[institutionId] = next;
  writePaymentMethods(all);
  return next.find((method) => method.id === id) ?? null;
}

export function deleteMockPaymentMethod(institutionId: string, id: string) {
  const all = readPaymentMethods();
  const remaining = (all[institutionId] ?? []).filter((method) => method.id !== id);
  if (remaining.length > 0 && !remaining.some((method) => method.is_default)) {
    remaining[0] = { ...remaining[0], is_default: true };
  }
  all[institutionId] = remaining;
  writePaymentMethods(all);
  return { ok: true };
}

export function getMockSubscription(institutionId: string) {
  const detail = getMockInstitutionDetail(institutionId);
  const plan = getMockPlans().find((p) => p.name === detail.institution.subscription_plan) ?? getMockPlans()[0];
  const invoices = getMockInvoices(institutionId);
  const latestPaid = invoices.find((invoice) => invoice.status === "paid");
  const anchor = latestPaid?.paid_at ?? latestPaid?.issued_at ?? null;
  const renewsAt = anchor ? new Date(new Date(anchor).getTime() + 30 * 86400000).toISOString() : null;

  return {
    institutionStatus: detail.institution.status,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          price: Number(plan.price),
          billingCycle: plan.billing_cycle,
          maxMembers: plan.max_members,
          maxSeats: plan.max_seats,
        }
      : null,
    mrr: plan ? Number(plan.price) : 0,
    activeMembers: detail.kpis.memberCount,
    renewsAt,
  };
}

export async function fallbackOnUnauthorized<T>(real: () => Promise<T> | T, fallback: () => T) {
  try {
    return await real();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized: No authorization header provided")) {
      return fallback();
    }
    throw error;
  }
}