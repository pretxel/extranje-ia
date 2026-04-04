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
