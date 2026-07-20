export const BILLING_CURRENCY = 'BRL' as const;

export const FREE_PLAN_CODE = 'free' as const;
export const PRO_PLAN_CODE = 'pro' as const;

export type CommercialPlanCode = typeof FREE_PLAN_CODE | typeof PRO_PLAN_CODE;
export type PaidBillingInterval = 'month' | 'year';
export type BillingInterval = 'free' | PaidBillingInterval;

export interface PlanLimits {
  proposalsPerMonth: number;
  users: number;
  storageBytes: number;
}

export interface FreePlanDefinition {
  code: typeof FREE_PLAN_CODE;
  name: string;
  priceCents: 0;
  currency: typeof BILLING_CURRENCY;
  requiresPaymentMethod: false;
  limits: PlanLimits;
}

export interface PaidPlanOption {
  id: 'pro-monthly' | 'pro-annual';
  planCode: typeof PRO_PLAN_CODE;
  billingInterval: PaidBillingInterval;
  priceCents: number;
  currency: typeof BILLING_CURRENCY;
  prepaid: boolean;
  limits: PlanLimits;
}

const MEBIBYTE = 1024 * 1024;
const GIBIBYTE = 1024 * MEBIBYTE;

export const FREE_PLAN: FreePlanDefinition = {
  code: FREE_PLAN_CODE,
  name: 'Gratuito',
  priceCents: 0,
  currency: BILLING_CURRENCY,
  requiresPaymentMethod: false,
  limits: {
    proposalsPerMonth: 5,
    users: 1,
    storageBytes: 250 * MEBIBYTE,
  },
};

export const PRO_MONTHLY: PaidPlanOption = {
  id: 'pro-monthly',
  planCode: PRO_PLAN_CODE,
  billingInterval: 'month',
  priceCents: 10_000,
  currency: BILLING_CURRENCY,
  prepaid: false,
  limits: {
    proposalsPerMonth: 30,
    users: 5,
    storageBytes: 10 * GIBIBYTE,
  },
};

export const PRO_ANNUAL: PaidPlanOption = {
  id: 'pro-annual',
  planCode: PRO_PLAN_CODE,
  billingInterval: 'year',
  priceCents: 100_000,
  currency: BILLING_CURRENCY,
  prepaid: true,
  limits: {
    proposalsPerMonth: 40,
    users: 5,
    storageBytes: 10 * GIBIBYTE,
  },
};

export const PRO_ANNUAL_EQUIVALENT_MONTHLY_CENTS = Math.round(PRO_ANNUAL.priceCents / 12);
export const PRO_ANNUAL_SAVINGS_CENTS = PRO_MONTHLY.priceCents * 12 - PRO_ANNUAL.priceCents;
export const PRO_ANNUAL_DISCOUNT_PERCENT = Math.round(
  (PRO_ANNUAL_SAVINGS_CENTS / (PRO_MONTHLY.priceCents * 12)) * 1_000,
) / 10;

export const COMMERCIAL_PLAN_CATALOG = {
  free: FREE_PLAN,
  pro: {
    name: 'Pro',
    monthly: PRO_MONTHLY,
    annual: PRO_ANNUAL,
  },
} as const;
