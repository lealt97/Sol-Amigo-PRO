export const BILLING_CURRENCY = 'BRL' as const;

export const FREE_PLAN_CODE = 'free' as const;
export const PRO_PLAN_CODE = 'pro' as const;

export type CommercialPlanCode = typeof FREE_PLAN_CODE | typeof PRO_PLAN_CODE;
export type PaidBillingInterval = 'month' | 'year';

export interface FreePlanDefinition {
  code: typeof FREE_PLAN_CODE;
  name: string;
  priceCents: 0;
  currency: typeof BILLING_CURRENCY;
  requiresPaymentMethod: false;
}

export interface PaidPlanOption {
  planCode: typeof PRO_PLAN_CODE;
  billingInterval: PaidBillingInterval;
  priceCents: number;
  currency: typeof BILLING_CURRENCY;
  prepaid: boolean;
}

export const FREE_PLAN: FreePlanDefinition = {
  code: FREE_PLAN_CODE,
  name: 'Gratuito',
  priceCents: 0,
  currency: BILLING_CURRENCY,
  requiresPaymentMethod: false,
};

export const PRO_MONTHLY: PaidPlanOption = {
  planCode: PRO_PLAN_CODE,
  billingInterval: 'month',
  priceCents: 10_000,
  currency: BILLING_CURRENCY,
  prepaid: false,
};

export const PRO_ANNUAL: PaidPlanOption = {
  planCode: PRO_PLAN_CODE,
  billingInterval: 'year',
  priceCents: 100_000,
  currency: BILLING_CURRENCY,
  prepaid: true,
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
