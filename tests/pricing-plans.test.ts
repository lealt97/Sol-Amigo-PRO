import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  BILLING_CURRENCY,
  COMMERCIAL_PLAN_CATALOG,
  FREE_PLAN,
  PRO_ANNUAL,
  PRO_ANNUAL_DISCOUNT_PERCENT,
  PRO_ANNUAL_EQUIVALENT_MONTHLY_CENTS,
  PRO_ANNUAL_SAVINGS_CENTS,
  PRO_MONTHLY,
} from '../src/lib/billing/planCatalog';

const PRICING_DOC_PATH = 'docs/PRICING_AND_PLANS.md';

test('catálogo usa BRL, centavos inteiros e apenas os planos free e pro', () => {
  assert.equal(BILLING_CURRENCY, 'BRL');
  assert.deepEqual(Object.keys(COMMERCIAL_PLAN_CATALOG), ['free', 'pro']);

  for (const price of [FREE_PLAN.priceCents, PRO_MONTHLY.priceCents, PRO_ANNUAL.priceCents]) {
    assert.equal(Number.isInteger(price), true);
    assert.ok(price >= 0);
  }
});

test('plano gratuito custa zero e não exige método de pagamento', () => {
  assert.equal(FREE_PLAN.code, 'free');
  assert.equal(FREE_PLAN.priceCents, 0);
  assert.equal(FREE_PLAN.requiresPaymentMethod, false);
  assert.equal(FREE_PLAN.limits.proposalsPerMonth, 5);
});

test('Pro mensal e anual são o mesmo produto com intervalos e cotas diferentes', () => {
  assert.equal(PRO_MONTHLY.planCode, 'pro');
  assert.equal(PRO_ANNUAL.planCode, 'pro');
  assert.equal(PRO_MONTHLY.billingInterval, 'month');
  assert.equal(PRO_ANNUAL.billingInterval, 'year');
  assert.equal(PRO_MONTHLY.priceCents, 10_000);
  assert.equal(PRO_ANNUAL.priceCents, 100_000);
  assert.equal(PRO_MONTHLY.limits.proposalsPerMonth, 30);
  assert.equal(PRO_ANNUAL.limits.proposalsPerMonth, 40);
  assert.equal(PRO_ANNUAL.prepaid, true);
});

test('anual equivale a dois meses grátis e informa economia corretamente', () => {
  assert.equal(PRO_ANNUAL_SAVINGS_CENTS, 20_000);
  assert.equal(PRO_ANNUAL_EQUIVALENT_MONTHLY_CENTS, 8_333);
  assert.equal(PRO_ANNUAL_DISCOUNT_PERCENT, 16.7);
  assert.equal(PRO_ANNUAL.priceCents, PRO_MONTHLY.priceCents * 10);
});

test('documentação mantém preços, cotas e autorização alinhados', async () => {
  const pricing = await readFile(PRICING_DOC_PATH, 'utf8');

  assert.match(pricing, /R\$ 0,00/);
  assert.match(pricing, /R\$ 100,00 por mês/);
  assert.match(pricing, /R\$ 1\.000,00 por ano/);
  assert.match(pricing, /5 propostas por mês/);
  assert.match(pricing, /30 propostas por mês/);
  assert.match(pricing, /40 propostas por mês/);
  assert.match(pricing, /R\$ 200,00/);
  assert.match(pricing, /16,7%/);
  assert.match(pricing, /Nenhum bloqueio de recurso pode depender somente do frontend/);
  assert.match(pricing, /Nunca deve confiar em preço ou cota enviados pelo navegador/);
});
