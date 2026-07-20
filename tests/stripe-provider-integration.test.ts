import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SHARED_PATH = 'supabase/functions/_shared/stripeBilling.ts';
const FUNCTION_PATH = 'supabase/functions/stripe-customer/index.ts';
const CONFIG_PATH = 'supabase/config.toml';
const ENVIRONMENT_PATH = 'docs/ENVIRONMENT_VARIABLES.md';
const DOCUMENTATION_PATH = 'docs/STRIPE_PROVIDER_INTEGRATION.md';
const FRONTEND_ENV_PATH = '.env.example';

test('SDK Stripe permanece fixado e configurado somente no servidor', async () => {
  const [shared, frontendEnv] = await Promise.all([
    readFile(SHARED_PATH, 'utf8'),
    readFile(FRONTEND_ENV_PATH, 'utf8'),
  ]);

  assert.match(shared, /from 'npm:stripe@20\.4\.0'/);
  assert.match(shared, /Deno\.env/);
  assert.match(shared, /STRIPE_SECRET_KEY/);
  assert.match(shared, /STRIPE_MAX_NETWORK_RETRIES = 2/);
  assert.match(shared, /STRIPE_TIMEOUT_MS = 10_000/);
  assert.match(shared, /telemetry: false/);
  assert.doesNotMatch(frontendEnv, /STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|sk_(?:test|live)_/);
});

test('configuração valida chaves e resolve Price IDs no servidor', async () => {
  const shared = await readFile(SHARED_PATH, 'utf8');

  assert.match(shared, /STRIPE_PRO_MONTHLY_PRICE_ID/);
  assert.match(shared, /STRIPE_PRO_ANNUAL_PRICE_ID/);
  assert.match(shared, /STRIPE_WEBHOOK_SECRET/);
  assert.match(shared, /requireStripeCheckoutPriceId/);
  assert.match(shared, /missing_stripe_\$\{interval\}_price_id/);
  assert.match(shared, /slice\(0, 255\)/);
});

test('função vincula somente a conta autenticada e não expõe o Customer ID', async () => {
  const stripeCustomer = await readFile(FUNCTION_PATH, 'utf8');

  assert.match(stripeCustomer, /admin\.auth\.getUser\(accessToken\)/);
  assert.match(stripeCustomer, /\.from\('subscriptions'\)/);
  assert.match(stripeCustomer, /\.eq\('account_id', user\.id\)/);
  assert.match(stripeCustomer, /subscription\.provider !== STRIPE_PROVIDER/);
  assert.match(stripeCustomer, /stripe\.customers\.create/);
  assert.match(stripeCustomer, /supabase_account_id: user\.id/);
  assert.match(stripeCustomer, /buildStripeIdempotencyKey\('customer:create', user\.id\)/);
  assert.match(stripeCustomer, /\.is\('provider_customer_id', null\)/);
  assert.match(stripeCustomer, /event_type: 'provider\.customer_linked'/);
  assert.match(stripeCustomer, /jsonResponse\(\{ linked: true, existing: false \}\)/);
  assert.doesNotMatch(stripeCustomer, /jsonResponse\(\{[^}]*customer(?:Id|_id)/);
});

test('idempotência de criação é estável e independente do navegador', async () => {
  const stripeCustomer = await readFile(FUNCTION_PATH, 'utf8');

  assert.doesNotMatch(stripeCustomer, /x-request-id/i);
  assert.doesNotMatch(stripeCustomer, /request\.json\(\)/);
  assert.match(stripeCustomer, /if \(subscription\.provider_customer_id\)/);
  assert.match(stripeCustomer, /currentSubscription\?\.provider !== STRIPE_PROVIDER/);
});

test('Edge Function exige JWT e aceita somente POST', async () => {
  const [config, stripeCustomer] = await Promise.all([
    readFile(CONFIG_PATH, 'utf8'),
    readFile(FUNCTION_PATH, 'utf8'),
  ]);

  assert.match(config, /\[functions\.stripe-customer\][\s\S]*verify_jwt = true/);
  assert.match(stripeCustomer, /request\.method !== 'POST'/);
  assert.match(stripeCustomer, /Método não permitido/);
  assert.match(stripeCustomer, /readBearerToken/);
});

test('documentação protege segredos e mantém checkout e webhook separados', async () => {
  const [environment, documentation] = await Promise.all([
    readFile(ENVIRONMENT_PATH, 'utf8'),
    readFile(DOCUMENTATION_PATH, 'utf8'),
  ]);

  for (const variable of [
    'STRIPE_SECRET_KEY',
    'STRIPE_PRO_MONTHLY_PRICE_ID',
    'STRIPE_PRO_ANNUAL_PRICE_ID',
    'STRIPE_WEBHOOK_SECRET',
    'SITE_URL',
  ]) {
    assert.ok(environment.includes(variable), `variável ausente: ${variable}`);
  }

  assert.match(environment, /nunca prefixar segredos Stripe com `VITE_`/);
  assert.match(documentation, /Ainda não estão incluídos:/);
  assert.match(documentation, /criação da Checkout Session/);
  assert.match(documentation, /processamento de webhooks/);
  assert.match(documentation, /somente pode ser marcado quando/);
  assert.match(documentation, /um único Customer/);
});
