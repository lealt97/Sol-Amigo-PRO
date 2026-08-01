import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('preço pode ser formado por margem ou informado manualmente', async () => {
  const [payback, engine, calculator, draft] = await Promise.all([
    readFile('src/pages/propostas/PaybackStep.tsx', 'utf8'),
    readFile('src/lib/calculations/payback.ts', 'utf8'),
    readFile('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', 'utf8'),
    readFile('src/types/proposalDraft.ts', 'utf8'),
  ]);

  assert.match(payback, /Calcular pela margem/);
  assert.match(payback, /Informar preço manual/);
  assert.match(payback, /label="Preço da proposta"/);
  assert.match(payback, /label="Margem de lucro"/);
  assert.match(payback, /manualSystemCost: selectedKit \? null : baseSystemCost/);
  assert.match(engine, /proposalPrice: number/);
  assert.match(engine, /manualSystemCost\?: number \| null/);
  assert.match(engine, /const totalInvestment = input\.proposalPrice/);
  assert.match(engine, /const hasCostBasis = baseSystemCost != null/);
  assert.match(calculator, /Preço e payback/);
  assert.match(calculator, /final_price: proposalPrice/);
  assert.match(draft, /proposalPrice\?: string/);
  assert.match(draft, /pricingMode\?: 'margin' \| 'manual'/);
});
