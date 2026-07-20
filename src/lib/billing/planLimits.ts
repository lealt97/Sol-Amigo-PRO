import {
  FREE_PLAN,
  PRO_ANNUAL,
  PRO_MONTHLY,
  type BillingInterval,
  type CommercialPlanCode,
  type PlanLimits as CatalogPlanLimits,
} from './planCatalog';

export const MEBIBYTE = 1024 * 1024;
export const GIBIBYTE = 1024 * MEBIBYTE;
export const PLAN_USAGE_WARNING_PERCENT = 80;

export type PlanLimits = CatalogPlanLimits;

export const FREE_PLAN_LIMITS: PlanLimits = FREE_PLAN.limits;
export const PRO_MONTHLY_PLAN_LIMITS: PlanLimits = PRO_MONTHLY.limits;
export const PRO_ANNUAL_PLAN_LIMITS: PlanLimits = PRO_ANNUAL.limits;

export const PLAN_LIMITS = {
  free: FREE_PLAN_LIMITS,
  'pro-monthly': PRO_MONTHLY_PLAN_LIMITS,
  'pro-annual': PRO_ANNUAL_PLAN_LIMITS,
} as const;

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} precisa ser um número finito maior ou igual a zero.`);
  }
}

export function getPlanLimits(
  planCode: CommercialPlanCode,
  billingInterval: BillingInterval,
): PlanLimits {
  if (planCode === 'free') {
    if (billingInterval !== 'free') {
      throw new RangeError('O plano Gratuito exige o intervalo free.');
    }
    return FREE_PLAN_LIMITS;
  }

  if (billingInterval === 'month') return PRO_MONTHLY_PLAN_LIMITS;
  if (billingInterval === 'year') return PRO_ANNUAL_PLAN_LIMITS;

  throw new RangeError('O plano Pro exige intervalo month ou year.');
}

export function getRemainingQuota(used: number, limit: number): number {
  assertNonNegativeFinite(used, 'O uso');
  assertNonNegativeFinite(limit, 'O limite');
  return Math.max(0, limit - used);
}

export function hasQuotaForIncrement(used: number, increment: number, limit: number): boolean {
  assertNonNegativeFinite(increment, 'O incremento');
  return getRemainingQuota(used, limit) >= increment;
}

export function getUsagePercent(used: number, limit: number): number {
  assertNonNegativeFinite(used, 'O uso');
  assertNonNegativeFinite(limit, 'O limite');

  if (limit === 0) return used === 0 ? 0 : 100;
  return Math.min(100, (used / limit) * 100);
}

export function shouldWarnAboutUsage(used: number, limit: number): boolean {
  return getUsagePercent(used, limit) >= PLAN_USAGE_WARNING_PERCENT;
}
