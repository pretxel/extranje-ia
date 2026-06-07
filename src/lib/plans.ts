export const PLAN_LIMITS = {
  free: 5,
  pro: Infinity,
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function hasReachedLimit(plan: Plan, queriesUsed: number): boolean {
  const limit = PLAN_LIMITS[plan];
  return Number.isFinite(limit) && queriesUsed >= limit;
}

export function getLimit(plan: Plan): number {
  return PLAN_LIMITS[plan];
}

/**
 * Single source of truth for whether paid plans are purchasable.
 * Reads PAID_PLANS_ENABLED on the server and NEXT_PUBLIC_PAID_PLANS_ENABLED on the
 * client (NEXT_PUBLIC_* is inlined at build time, so a redeploy is required to flip).
 * Defaults to disabled when unset — paid surfaces show "coming soon".
 * Both vars must be "true" together to enable checkout.
 */
export function paidPlansEnabled(): boolean {
  return (
    process.env.PAID_PLANS_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_PAID_PLANS_ENABLED === "true"
  );
}
