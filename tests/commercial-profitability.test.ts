import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCommercialProfitability } from '../src/lib/calculations/commercialProfitability';

test('sinaliza prejuízo e calcula preços mínimos de proteção', () => {
  const result = evaluateCommercialProfitability({
    proposalPrice: 90,
    directCost: 100,
    targetMarginPercentage: 30,
  });

  assert.equal(result.status, 'loss');
  assert.equal(result.severity, 'danger');
  assert.equal(result.profitAmount, -10);
  assert.equal(result.priceGapToBreakEven, 10);
  assert.equal(result.breakEvenPrice, 100);
  assert.equal(result.targetPrice, 142.86);
  assert.equal(result.priceGapToTarget, 52.86);
});

test('distingue empate de custos de margem abaixo da meta', () => {
  const breakEven = evaluateCommercialProfitability({
    proposalPrice: 100,
    directCost: 100,
    targetMarginPercentage: 30,
  });
  const belowTarget = evaluateCommercialProfitability({
    proposalPrice: 120,
    directCost: 100,
    targetMarginPercentage: 30,
  });

  assert.equal(breakEven.status, 'break_even');
  assert.equal(breakEven.effectiveMarginPercentage, 0);
  assert.equal(belowTarget.status, 'below_target');
  assert.equal(belowTarget.effectiveMarginPercentage, 16.67);
  assert.equal(belowTarget.priceGapToTarget, 22.86);
});

test('confirma quando a margem efetiva alcança a meta', () => {
  const result = evaluateCommercialProfitability({
    proposalPrice: 142.86,
    directCost: 100,
    targetMarginPercentage: 30,
  });

  assert.equal(result.status, 'target_met');
  assert.equal(result.severity, 'success');
  assert.equal(result.priceGapToTarget, 0);
  assert.equal(result.effectiveMarginPercentage, 30);
});

test('mantém a análise indisponível quando não existe base de custos', () => {
  const result = evaluateCommercialProfitability({
    proposalPrice: 25000,
    directCost: null,
    targetMarginPercentage: 30,
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(result.hasCostBasis, false);
  assert.equal(result.profitAmount, null);
  assert.equal(result.targetPrice, null);
});

test('rejeita margem mínima inválida', () => {
  assert.throws(
    () => evaluateCommercialProfitability({
      proposalPrice: 100,
      directCost: 70,
      targetMarginPercentage: 100,
    }),
    /margem mínima esperada/i,
  );
});
