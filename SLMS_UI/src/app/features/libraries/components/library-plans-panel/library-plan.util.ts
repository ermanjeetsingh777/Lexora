import { PlanResponse } from '@core/models/institution-dropdown.model';

export const DEFAULT_PLAN_NAMES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'] as const;

export type DefaultPlanName = (typeof DEFAULT_PLAN_NAMES)[number];

export function isDefaultPlanName(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  const normalized = name.trim().toLowerCase();
  return DEFAULT_PLAN_NAMES.some((item) => item.toLowerCase() === normalized);
}

export function normalizePlanName(name: string): string {
  return name.trim();
}

export function isDuplicatePlanName(
  name: string,
  plans: PlanResponse[],
  excludePlanId?: string,
): boolean {
  const normalized = normalizePlanName(name).toLowerCase();
  if (!normalized) return false;
  return plans.some(
    (plan) =>
      plan.id !== excludePlanId &&
      normalizePlanName(plan.name).toLowerCase() === normalized,
  );
}

export function validatePlanForm(input: {
  name: string;
  price: number;
  durationInDays: number;
  maxSeats?: number | null;
  plans: PlanResponse[];
  excludePlanId?: string;
}): string | null {
  const name = normalizePlanName(input.name);
  if (!name) return 'Plan name is required.';
  if (input.price <= 0) return 'Price must be greater than zero.';
  if (input.durationInDays <= 0) return 'Duration must be greater than zero.';
  if (input.maxSeats != null && input.maxSeats <= 0) return 'Max seats must be greater than zero.';
  if (isDuplicatePlanName(name, input.plans, input.excludePlanId)) {
    return 'A plan with this name already exists in this library.';
  }
  return null;
}
