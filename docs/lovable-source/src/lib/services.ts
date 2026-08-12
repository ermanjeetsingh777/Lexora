// React Query options for the read-only API layer.
// Wraps server functions in `services.functions.ts` so pages can subscribe
// to backend-driven data without importing mock modules.
import { queryOptions } from "@tanstack/react-query";
import {
  getSeatGrid,
  getAttendanceTrend,
  getOccupancyHeatmap,
  getLiveAttendance,
  getShiftRoster,
  getCalendarMembers,
} from "./services.functions";
import {
  listLibraries, listSeats,
  getInstitutionDetail, listInstitutionBranches, listInstitutionLibraries,
  listPlans,
} from "./org.functions";
import {
  listInvoices, getInvoice, listPaymentMethods, getSubscription,
} from "./billing.functions";
import { listPeople } from "./people.functions";
import {
  fallbackOnUnauthorized,
  getMockInstitutionBranches,
  getMockInstitutionDetail,
  getMockInstitutionLibraries,
  getMockInvoice,
  getMockInvoices,
  getMockPaymentMethods,
  getMockPlans,
  getMockSubscription,
  isDemoInstitutionId,
  isDemoInvoiceId,
} from "./institution-demo-service";

export const seatGridQuery = (libraryId?: string) =>
  queryOptions({
    queryKey: ["seat-grid", libraryId ?? "default"],
    queryFn: () => getSeatGrid({ data: { libraryId } }),
    staleTime: 15_000,
  });

export const attendanceTrendQuery = (days = 14) =>
  queryOptions({
    queryKey: ["attendance-trend", days],
    queryFn: () => getAttendanceTrend({ data: { days } }),
    staleTime: 60_000,
  });

export const occupancyHeatmapQuery = () =>
  queryOptions({
    queryKey: ["occupancy-heatmap"],
    queryFn: () => getOccupancyHeatmap(),
    staleTime: 60_000,
  });

export const liveAttendanceQuery = (limit = 12) =>
  queryOptions({
    queryKey: ["live-attendance", limit],
    queryFn: () => getLiveAttendance({ data: { limit } }),
    staleTime: 10_000,
  });

export const shiftRosterQuery = () =>
  queryOptions({
    queryKey: ["shift-roster"],
    queryFn: () => getShiftRoster(),
    staleTime: 30_000,
  });

export const calendarMembersQuery = () =>
  queryOptions({
    queryKey: ["calendar-members"],
    queryFn: () => getCalendarMembers(),
    staleTime: 60_000,
  });

export const librariesQuery = (branchId?: string) =>
  queryOptions({
    queryKey: ["libraries", branchId ?? "all"],
    queryFn: () => listLibraries({ data: { branchId } }),
    staleTime: 30_000,
  });

export const rawSeatsQuery = (libraryId: string) =>
  queryOptions({
    queryKey: ["seats-raw", libraryId],
    queryFn: () => listSeats({ data: { libraryId } }),
    staleTime: 15_000,
  });

export const membersQuery = (filters?: {
  institutionId?: string;
  branchId?: string;
  libraryId?: string;
  status?: string;
  shift?: "Morning" | "Afternoon" | "Evening" | "Night";
  search?: string;
}) =>
  queryOptions({
    queryKey: ["members", filters ?? {}],
    queryFn: () =>
      listPeople({ data: { kind: "members", ...(filters ?? {}) } }).catch(() => [] as any[]),
    retry: false,
    staleTime: 15_000,
  });

// -------- Institution detail --------

export const institutionDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["institution-detail", id],
    queryFn: () =>
      isDemoInstitutionId(id)
        ? getMockInstitutionDetail(id)
        : fallbackOnUnauthorized(
            () => getInstitutionDetail({ data: { id } }),
            () => getMockInstitutionDetail(id),
          ),
    staleTime: 30_000,
  });

export const institutionBranchesQuery = (institutionId: string) =>
  queryOptions({
    queryKey: ["institution-branches", institutionId],
    queryFn: () =>
      isDemoInstitutionId(institutionId)
        ? getMockInstitutionBranches(institutionId)
        : fallbackOnUnauthorized(
            () => listInstitutionBranches({ data: { institutionId } }),
            () => getMockInstitutionBranches(institutionId),
          ),
    staleTime: 30_000,
  });

export const institutionLibrariesQuery = (institutionId: string) =>
  queryOptions({
    queryKey: ["institution-libraries", institutionId],
    queryFn: () =>
      isDemoInstitutionId(institutionId)
        ? getMockInstitutionLibraries(institutionId)
        : fallbackOnUnauthorized(
            () => listInstitutionLibraries({ data: { institutionId } }),
            () => getMockInstitutionLibraries(institutionId),
          ),
    staleTime: 30_000,
  });

// -------- Billing --------

export const invoicesQuery = (institutionId: string) =>
  queryOptions({
    queryKey: ["invoices", institutionId],
    queryFn: () =>
      isDemoInstitutionId(institutionId)
        ? getMockInvoices(institutionId)
        : fallbackOnUnauthorized(
            () => listInvoices({ data: { institutionId } }),
            () => getMockInvoices(institutionId),
          ),
    staleTime: 30_000,
  });

export const invoiceQuery = (id: string) =>
  queryOptions({
    queryKey: ["invoice", id],
    queryFn: () =>
      isDemoInvoiceId(id)
        ? getMockInvoice(id)
        : fallbackOnUnauthorized(
            () => getInvoice({ data: { id } }),
            () => getMockInvoice(id),
          ),
    staleTime: 60_000,
  });

export const paymentMethodsQuery = (institutionId: string) =>
  queryOptions({
    queryKey: ["payment-methods", institutionId],
    queryFn: () =>
      isDemoInstitutionId(institutionId)
        ? getMockPaymentMethods(institutionId)
        : fallbackOnUnauthorized(
            () => listPaymentMethods({ data: { institutionId } }),
            () => getMockPaymentMethods(institutionId),
          ),
    staleTime: 30_000,
  });

export const subscriptionQuery = (institutionId: string) =>
  queryOptions({
    queryKey: ["subscription", institutionId],
    queryFn: () =>
      isDemoInstitutionId(institutionId)
        ? getMockSubscription(institutionId)
        : fallbackOnUnauthorized(
            () => getSubscription({ data: { institutionId } }),
            () => getMockSubscription(institutionId),
          ),
    staleTime: 60_000,
  });

export const plansQuery = () =>
  queryOptions({
    queryKey: ["plans"],
    queryFn: () => fallbackOnUnauthorized(() => listPlans(), () => getMockPlans()),
    staleTime: 5 * 60_000,
  });
