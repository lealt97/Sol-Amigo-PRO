import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveProposalPricing } from '../src/lib/calculations/proposalPricing';

test('preço manual calcula o investimento sem exigir base interna de custos', () => {
  const result = resolveProposalPricing({
    pricingMode: 'manual',
    proposalPrice: 30_000,
    baseSystemCost: null,
    additionalCostsTotal: 0,
  });

  assert.equal(result.proposalPrice, 30_000);
  assert.equal(result.hasCostBasis, false);
  assert.equal(result.directCost, null);
});

test('preço manual permanece independente dos custos internos', () => {
  const result = resolveProposalPricing({
    pricingMode: 'manual',
    proposalPrice: 30_000,
    baseSystemCost: 18_000,
    additionalCostsTotal: 2_000,
  });

  assert.equal(result.proposalPrice, 30_000);
  assert.equal(result.hasCostBasis, true);
  assert.equal(result.directCost, 20_000);
});

test('preço pela margem exige base interna de custos', () => {
  assert.throws(
    () => resolveProposalPricing({
      pricingMode: 'margin',
      baseSystemCost: null,
      additionalCostsTotal: 0,
      requestedMarginPercentage: 30,
    }),
    /base interna de custos/i,
  );
});

test('preço pela margem usa custo direto e margem sobre o preço de venda', () => {
  const result = resolveProposalPricing({
    pricingMode: 'margin',
    baseSystemCost: 18_000,
    additionalCostsTotal: 3_000,
    requestedMarginPercentage: 30,
  });

  assert.equal(result.directCost, 21_000);
  assert.ok(Math.abs(result.proposalPrice - 30_000) < 0.000001);
  assert.equal(result.hasCostBasis, true);
});
