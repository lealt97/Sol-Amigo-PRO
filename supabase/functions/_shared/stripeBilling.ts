import Stripe from 'npm:stripe@20.4.0';

export const STRIPE_PROVIDER = 'stripe' as const;
export const STRIPE_SDK_VERSION = '20.4.0' as const;
export const STRIPE_MAX_NETWORK_RETRIES = 2;
export const STRIPE_TIMEOUT_MS = 10_000;

export type StripeBillingInterval = 'month' | 'year';

export interface StripeServerConfig {
  secretKey: string;
  monthlyPriceId?: string;
  annualPriceId?: string;
  webhookSecret?: string;
}

type EnvironmentReader = {
  get(name: string): string | undefined;
};

function requiredValue(environment: EnvironmentReader, name: string): string {
  const value = environment.get(name)?.trim();
  if (!value) {
    throw new Error(`missing_${name.toLowerCase()}`);
  }
  return value;
}

function optionalValue(environment: EnvironmentReader, name: string): string | undefined {
  const value = environment.get(name)?.trim();
  return value || undefined;
}

function assertStripeSecretKey(value: string): void {
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(value)) {
    throw new Error('invalid_stripe_secret_key');
  }
}

function assertOptionalStripeIdentifier(value: string | undefined, prefix: string, errorCode: string): void {
  if (value && !new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value)) {
    throw new Error(errorCode);
  }
}

export function loadStripeServerConfig(
  environment: EnvironmentReader = Deno.env,
): StripeServerConfig {
  const secretKey = requiredValue(environment, 'STRIPE_SECRET_KEY');
  const monthlyPriceId = optionalValue(environment, 'STRIPE_PRO_MONTHLY_PRICE_ID');
  const annualPriceId = optionalValue(environment, 'STRIPE_PRO_ANNUAL_PRICE_ID');
  const webhookSecret = optionalValue(environment, 'STRIPE_WEBHOOK_SECRET');

  assertStripeSecretKey(secretKey);
  assertOptionalStripeIdentifier(monthlyPriceId, 'price', 'invalid_stripe_monthly_price_id');
  assertOptionalStripeIdentifier(annualPriceId, 'price', 'invalid_stripe_annual_price_id');
  assertOptionalStripeIdentifier(webhookSecret, 'whsec', 'invalid_stripe_webhook_secret');

  return {
    secretKey,
    monthlyPriceId,
    annualPriceId,
    webhookSecret,
  };
}

export function requireStripeCheckoutPriceId(
  config: StripeServerConfig,
  interval: StripeBillingInterval,
): string {
  const priceId = interval === 'month' ? config.monthlyPriceId : config.annualPriceId;
  if (!priceId) {
    throw new Error(`missing_stripe_${interval}_price_id`);
  }
  return priceId;
}

export function createStripeClient(config: StripeServerConfig): Stripe {
  return new Stripe(config.secretKey, {
    maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
    timeout: STRIPE_TIMEOUT_MS,
    telemetry: false,
  });
}

export function buildStripeIdempotencyKey(
  operation: string,
  accountId: string,
  requestId?: string,
): string {
  const normalizedOperation = operation.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 64);
  const normalizedAccount = accountId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  const normalizedRequest = requestId?.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  const parts = ['solamigo', normalizedOperation, normalizedAccount];
  if (normalizedRequest) parts.push(normalizedRequest);
  return parts.join(':').slice(0, 255);
}
